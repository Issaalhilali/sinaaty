import 'dart:async';
import 'package:dio/dio.dart';
import '../auth/token_store.dart';
import '../config/app_config.dart';
import 'api_host_probe.dart';

/// Dio client: base URL, JSON, Accept-Language, bearer token, and refresh-once-on-401 with a single in-flight refresh.
///
/// وفي التطوير وحده شبكةُ أمانٍ ثانية: مسبار الإقلاع (bootstrap) يصحّح العنوان الشائخ عند فتح
/// التطبيق بارداً — لكن العنوان يشيخ **والتطبيق حيّ** أيضاً (الماك بدّل شبكته ثلاث مرات في
/// يومين، والمالك يرى «تعذّر الاتصال بالخادم» ولا يعرف أن قتل التطبيق يشفيه). فعند أول فشلِ
/// اتصالٍ يعيد العميل البحث عن الخادم بنفسه ويكرّر الطلب مرة واحدة — قتلُ التطبيق لم يعد دواءً.
class ApiClient {
  final Dio dio; final TokenStore tokens; final void Function()? onSessionExpired;
  final AppConfig _config; final ApiHostProbe Function() _probe;
  Future<bool>? _refreshing;
  Future<String?>? _probing;
  ApiClient({required AppConfig config, required this.tokens, required String Function() locale, this.onSessionExpired, ApiHostProbe Function()? probe})
      : _config = config, _probe = probe ?? ApiHostProbe.new,
        dio = Dio(BaseOptions(baseUrl: config.apiV1, connectTimeout: const Duration(seconds: 15), receiveTimeout: const Duration(seconds: 30), headers: {'accept': 'application/json'})) {
    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (o, h) async { o.headers['accept-language'] = locale(); if (o.extra['auth'] != false) { final t = await tokens.access(); if (t != null) o.headers['authorization'] = 'Bearer $t'; } h.next(o); },
      onError: (e, h) async {
        final is401 = e.response?.statusCode == 401; final path = e.requestOptions.path;
        if (is401 && !path.contains('/auth/') && e.requestOptions.extra['retried'] != true) {
          final ok = await _refresh(); if (!ok) { onSessionExpired?.call(); return h.next(e); }
          final ro = e.requestOptions; ro.extra['retried'] = true; ro.headers['authorization'] = 'Bearer ${await tokens.access()}';
          try { return h.resolve(await dio.fetch(ro)); } catch (err) { return h.next(err is DioException ? err : e); }
        }
        // فشل اتصال في التطوير = رجّح أن العنوان شاخ: ابحث عن الخادم وأعد الطلب مرة واحدة
        final isConn = e.type == DioExceptionType.connectionError || e.type == DioExceptionType.connectionTimeout;
        if (isConn && _config.appEnv != 'prod' && e.requestOptions.extra['reprobed'] != true) {
          final origin = await _reprobe();
          if (origin != null) {
            final ro = e.requestOptions..extra['reprobed'] = true..baseUrl = '$origin/v1';
            try { return h.resolve(await dio.fetch(ro)); } catch (err) { return h.next(err is DioException ? err : e); }
          }
        }
        h.next(e);
      },
    ));
  }

  /// بحث واحد مهما تزاحمت الطلبات الفاشلة — والعنوان الجديد يثبت للعميل كله لا للطلب وحده.
  Future<String?> _reprobe() { return _probing ??= _doReprobe().whenComplete(() => _probing = null); }
  Future<String?> _doReprobe() async {
    final current = dio.options.baseUrl.replaceFirst(RegExp(r'/v1/?$'), '');
    final found = await _probe().resolve(current);
    if (found == current) return null;
    dio.options.baseUrl = '$found/v1';
    return found;
  }

  Future<bool> _refresh() { return _refreshing ??= _doRefresh().whenComplete(() => _refreshing = null); }
  Future<bool> _doRefresh() async {
    final rt = await tokens.refresh(); if (rt == null) return false;
    try { final r = await dio.post<Map<String, dynamic>>('/auth/refresh', data: {'refresh_token': rt}, options: Options(extra: {'auth': false})); final d = r.data!; await tokens.save(access: d['accessToken'] as String, refresh: d['refreshToken'] as String); return true; }
    catch (_) { await tokens.clear(); return false; }
  }
}
