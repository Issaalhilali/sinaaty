import 'dart:async';
import 'package:dio/dio.dart';
import '../auth/token_store.dart';
import '../config/app_config.dart';
/// Dio client: base URL, JSON, Accept-Language, bearer token, and refresh-once-on-401 with a single in-flight refresh.
class ApiClient {
  final Dio dio; final TokenStore tokens; final void Function()? onSessionExpired;
  Future<bool>? _refreshing;
  ApiClient({required AppConfig config, required this.tokens, required String Function() locale, this.onSessionExpired})
      : dio = Dio(BaseOptions(baseUrl: config.apiV1, connectTimeout: const Duration(seconds: 15), receiveTimeout: const Duration(seconds: 30), headers: {'accept': 'application/json'})) {
    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (o, h) async { o.headers['accept-language'] = locale(); if (o.extra['auth'] != false) { final t = await tokens.access(); if (t != null) o.headers['authorization'] = 'Bearer $t'; } h.next(o); },
      onError: (e, h) async {
        final is401 = e.response?.statusCode == 401; final path = e.requestOptions.path;
        if (!is401 || path.contains('/auth/') || e.requestOptions.extra['retried'] == true) return h.next(e);
        final ok = await _refresh(); if (!ok) { onSessionExpired?.call(); return h.next(e); }
        final ro = e.requestOptions; ro.extra['retried'] = true; ro.headers['authorization'] = 'Bearer ${await tokens.access()}';
        try { h.resolve(await dio.fetch(ro)); } catch (err) { h.next(err is DioException ? err : e); }
      },
    ));
  }
  Future<bool> _refresh() { return _refreshing ??= _doRefresh().whenComplete(() => _refreshing = null); }
  Future<bool> _doRefresh() async {
    final rt = await tokens.refresh(); if (rt == null) return false;
    try { final r = await dio.post<Map<String, dynamic>>('/auth/refresh', data: {'refresh_token': rt}, options: Options(extra: {'auth': false})); final d = r.data!; await tokens.save(access: d['accessToken'] as String, refresh: d['refreshToken'] as String); return true; }
    catch (_) { await tokens.clear(); return false; }
  }
}
