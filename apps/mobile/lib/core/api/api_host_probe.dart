import 'dart:io';
import 'package:dio/dio.dart';

/// يجد الخادم حين يشيخ العنوان المخبوز — في بناء التطوير وحده.
///
/// عنوان الماك تبدّل ثلاث مرات في يومين مع تنقّله بين الشبكات، وفي كل مرة يقف التطبيق عند
/// «تعذّر الوصول إلى الخادم» بلا أن يعرف صاحبه أن السبب رقمٌ قديم — ولا يُصلحه إلا إعادة بناء.
///
/// جرّبتُ اسم Bonjour (`<mac>.local`) لأنه لا يشيخ، فقِسته على جوال أندرويد حقيقي: **لا يُحلّ
/// إطلاقاً** (الاسم 000 والرقم 200). يعمل على iOS وحده، فلا يصلح أساساً.
///
/// فالحلّ أن يبحث الجهاز في شبكته هو: الماك والجوال على نفس الشبكة الفرعية، فنمسحها. المسح
/// لا يقع إلا حين يفشل العنوان المُهيّأ — الطريق السعيد نداءٌ واحد لا أكثر.
///
/// **لا يعمل في الإنتاج إطلاقاً**: هناك عنوان واحد ثابت، ومسح الشبكة سلوكٌ لا مبرّر له.
class ApiHostProbe {
  final Dio _dio;
  final Duration timeout;
  ApiHostProbe({Dio? dio, this.timeout = const Duration(milliseconds: 700)})
      : _dio = dio ?? Dio(BaseOptions(connectTimeout: const Duration(milliseconds: 700), receiveTimeout: const Duration(milliseconds: 700)));

  static const _port = 3000;

  /// المرشّحون المعروفون بترتيب الأرجحية، بلا تكرار.
  static List<String> candidates(String configured) => <String>{
        configured,
        'http://10.0.2.2:$_port',      // محاكي أندرويد → مضيفه
        'http://localhost:$_port',     // محاكي iOS، أو ويب على نفس الجهاز
      }.toList();

  Future<bool> _alive(String base) async {
    try { return (await _dio.get<void>('$base/v1/health')).statusCode == 200; }
    catch (_) { return false; }
  }

  /// أول عنوان يردّ: المعروفون أولاً، ثم مسح الشبكة الفرعية. وإن لم يردّ أحد أعدنا المُهيّأ
  /// كما هو — فرسالة «تعذّر الوصول» أصدق من عنوان اخترناه عشوائياً.
  Future<String> resolve(String configured) async {
    for (final found in await Future.wait(candidates(configured).map((b) async => await _alive(b) ? b : null))) {
      if (found != null) return found;
    }
    return await _scanSubnet() ?? configured;
  }

  /// يمسح /24 الخاصة بالجهاز على دفعات: ٢٥٤ اتصالاً متزامناً يُنهك مقابس النظام، والدفعات
  /// تُبقيه ضمن حدوده وتنتهي في ثانيتين تقريباً.
  Future<String?> _scanSubnet() async {
    for (final prefix in await _subnets()) {
      for (var start = 1; start <= 254; start += 48) {
        final end = (start + 47).clamp(1, 254);
        final batch = [for (var i = start; i <= end; i++) '$prefix$i'];
        final hits = await Future.wait(batch.map((ip) async => await _alive('http://$ip:$_port') ? ip : null));
        for (final ip in hits) { if (ip != null) return 'http://$ip:$_port'; }
      }
    }
    return null;
  }

  /// «10.108.181.» من عنوان الجهاز نفسه — الخادم على نفس الشبكة الفرعية.
  static Future<List<String>> _subnets() async {
    final out = <String>[];
    try {
      for (final ni in await NetworkInterface.list(type: InternetAddressType.IPv4, includeLoopback: false)) {
        for (final a in ni.addresses) {
          final parts = a.address.split('.');
          if (parts.length == 4) out.add('${parts[0]}.${parts[1]}.${parts[2]}.');
        }
      }
    } catch (_) { /* منصة بلا صلاحية جرد الشبكات — نكتفي بالمعروفين */ }
    return out.toSet().toList();
  }
}
