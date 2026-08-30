import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sinaaty/core/api/api_client.dart';
import 'package:sinaaty/core/api/api_host_probe.dart';
import 'package:sinaaty/core/auth/token_store.dart';
import 'package:sinaaty/core/config/app_config.dart';

/// «تعذّر الاتصال بالخادم» عند المالك: العنوان المخبوز شاخ والتطبيق حيّ، ومسبار الإقلاع
/// لا يعود إلا بقتل التطبيق. هذا يقفل شبكة الأمان الثانية: فشل الاتصال يعيد البحث ويكرر
/// الطلب — في التطوير وحده، والإنتاج لا يمسّه.

class _FakeProbe extends ApiHostProbe {
  int calls = 0;
  @override Future<String> resolve(String configured) async { calls++; return 'http://alive:3000'; }
}

class _Adapter implements HttpClientAdapter {
  @override void close({bool force = false}) {}
  @override Future<ResponseBody> fetch(RequestOptions o, Stream<List<int>>? body, Future<void>? cancel) async {
    if (o.uri.host == 'dead') throw DioException.connectionError(requestOptions: o, reason: 'refused');
    return ResponseBody.fromString('{"ok":true}', 200, headers: {'content-type': ['application/json']});
  }
}

AppConfig _cfg(String env) => AppConfig(flavor: AppFlavor.customer, apiBaseUrl: 'http://dead:3000', appEnv: env, sentryDsn: '');

void main() {
  test('العنوان شاخ والتطبيق حي: الطلب الفاشل يجد الخادم بنفسه ويكمل — والعنوان يثبت للعميل كله', () async {
    final probe = _FakeProbe();
    final c = ApiClient(config: _cfg('dev'), tokens: MemoryTokenStore(), locale: () => 'ar', probe: () => probe);
    c.dio.httpClientAdapter = _Adapter();
    final r = await c.dio.get<Map<String, dynamic>>('/health');
    expect(r.statusCode, 200);
    expect(probe.calls, 1);
    expect(c.dio.options.baseUrl, 'http://alive:3000/v1');       // الطلب التالي لا يمر بالفشل أصلاً
  });

  test('الإنتاج لا يمسح شبكات: الفشل فشل', () async {
    final probe = _FakeProbe();
    final c = ApiClient(config: _cfg('prod'), tokens: MemoryTokenStore(), locale: () => 'ar', probe: () => probe);
    c.dio.httpClientAdapter = _Adapter();
    await expectLater(c.dio.get<void>('/health'), throwsA(isA<DioException>()));
    expect(probe.calls, 0);
  });
}
