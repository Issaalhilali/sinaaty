import 'package:geolocator/geolocator.dart';

/// أين العميل الآن.
///
/// كان يُطلب منه أن **يلصق رابط خرائط** — ومن انكسرت سيارته على الطريق لا يفتح تطبيق خرائط
/// لينسخ رابطاً ثم يعود. الموقع يُقرأ من الجهاز، والرابط يبقى مخرجاً لمن رفض الإذن أو أراد
/// موقعاً غير موقعه (سيارة في بيت أهله، أو طلبٌ نيابةً عن غيره).
class Here {
  const Here();

  /// الموقع **إن كان الإذن ممنوحاً سلفاً** — بلا أي نافذة طلب.
  ///
  /// شريط «ورش قريبة منك» يُبنى مع الشاشة الرئيسية، فلو نادى `now()` لطُلب الإذن لحظة فتح
  /// التطبيق: نافذةٌ تعترض من لم يطلب شيئاً بعد. الإذن يُطلب حين يفيد صاحبه — عند «أصلح سيارتي».
  Future<({double lat, double lng})?> ifGranted() async {
    try {
      final p = await Geolocator.checkPermission();
      if (p != LocationPermission.always && p != LocationPermission.whileInUse) return null;
      if (!await Geolocator.isLocationServiceEnabled()) return null;
      return await _read();
    } catch (_) { return null; }
  }

  Future<({double lat, double lng})?> _read() async {
    final pos = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(accuracy: LocationAccuracy.medium, timeLimit: Duration(seconds: 12)),
    );
    return (lat: pos.latitude, lng: pos.longitude);
  }

  /// الإحداثيات، أو `null` إن رُفض الإذن أو تعذّرت القراءة — فيُعرض المخرج اليدوي حينها.
  /// **يطلب الإذن** إن لم يكن ممنوحاً، فلا يُنادى إلا بعد فعلٍ من المستخدم.
  Future<({double lat, double lng})?> now() async {
    try {
      if (!await Geolocator.isLocationServiceEnabled()) return null;
      var p = await Geolocator.checkPermission();
      if (p == LocationPermission.denied) p = await Geolocator.requestPermission();
      if (p == LocationPermission.denied || p == LocationPermission.deniedForever) return null;
      // دقّة متوسطة تكفي: نبحث عن ورش في نطاق كيلومترات، لا نرسم مساراً. وهي أسرع وأقلّ استهلاكاً.
      return await _read();
    } catch (_) {
      return null;                       // انتهت المهلة أو منصة بلا موقع — لا نُعطّل الطلب
    }
  }
}
