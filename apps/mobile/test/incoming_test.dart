import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:sinaaty/core/auth/token_store.dart';
import 'package:sinaaty/core/config/app_config.dart';
import 'package:sinaaty/core/di/core_providers.dart';
import 'package:sinaaty/core/l10n/app_localizations.dart';
import 'package:sinaaty/core/theme/app_theme.dart';
import 'package:sinaaty/features/workshop/domain/incoming.dart';
import 'package:sinaaty/features/workshop/domain/workshop_repository.dart';
import 'package:sinaaty/features/workshop/presentation/incoming_banner.dart';
import 'package:sinaaty/features/workshop/presentation/providers.dart';

import 'fleet_flow_test.dart' show loadArabicFont;
import 'workshop_flow_test.dart' show FakeBackend;

class FakeChannel implements OrgChannel {
  final _c = StreamController<Incoming>.broadcast();
  String? subscribedOrg;
  @override Stream<Incoming> incoming(String orgId) { subscribedOrg = orgId; return _c.stream; }
  void send(Incoming i) => _c.add(i);
}

/// نصف الحلقة الذي طلبه المالك: «الورش تتلقّى الطلب بإشعار مستمر مثل طلبات التوصيل، حتى يقبل
/// صاحب الورشة بعد مشاهدة طلب العميل». هذه المشية تثبت أن الطلب يعلو الشاشة ويُفتح بنقرة.
void main() {
  setUpAll(loadArabicFont);

  group('قراءة الحمولة كما يرسلها الخادم', () {
    test('طلب إصلاح: العنوان والمسافة والوقت المفضّل', () {
      final i = incomingFromEvent('service-request', {
        'request_id': 'sr1', 'number': 'SR-2026-000108', 'title_ar': 'سمكرة رفرف أمامي',
        'preferred_time': 'اليوم', 'distance_km': '3.3', 'created_at': '2026-08-25T09:00:00.000Z',
      });
      expect(i!.kind, IncomingKind.service);
      expect(i.titleAr, 'سمكرة رفرف أمامي');
      expect(i.distanceKm, '3.3');
      expect(i.route, '/ws/service-requests/sr1');
    });

    test('طلب قطعة: الكمية وآخر ست خانات من رقم الهيكل', () {
      final i = incomingFromEvent('part-request', {
        'request_id': 'pr1', 'number': 'PR-2026-000031', 'part_name_ar': 'طقم فحمات أمامي',
        'vin': 'JTDKN3DU0A0123456', 'quantity': 2, 'distance_km': null,
      });
      expect(i!.kind, IncomingKind.part);
      expect(i.metaAr, '× 2 · VIN 123456');
      expect(i.distanceKm, isNull, reason: 'منشأة بلا موقع: تُحذف المسافة ولا تُطبع null');
      expect(i.route, '/parts/requests/pr1');
    });

    test('حمولة بلا معرّف ليست طلباً — تُهمَل بصمت بدل بطاقة تفتح على لا شيء', () {
      expect(incomingFromEvent('service-request', {'number': 'SR-1'}), isNull);
      expect(incomingFromEvent('something-else', {'request_id': 'x', 'number': 'y'}), isNull);
    });
  });

  group('الطابور', () {
    Incoming make(String id) => Incoming(kind: IncomingKind.service, id: id, number: 'SR-$id', titleAr: 'طلب $id', at: DateTime(2026, 8, 25));

    test('الأحدث أولاً، بلا تكرار', () {
      var q = <Incoming>[];
      q = pushIncoming(q, make('a'));
      q = pushIncoming(q, make('b'));
      q = pushIncoming(q, make('a'));
      expect(q.map((x) => x.id).toList(), ['a', 'b'], reason: 'نفس الطلب لا يُكرَّر، ويعود إلى الأعلى');
    });

    test('السقف ثلاثة: الإلحاح على كل شيء إلغاءٌ للإلحاح', () {
      var q = <Incoming>[];
      for (final id in ['a', 'b', 'c', 'd', 'e']) {
        q = pushIncoming(q, make(id));
      }
      expect(q.map((x) => x.id).toList(), ['e', 'd', 'c']);
    });

    test('المتجاهَل لا يعود يعلو الشاشة', () {
      final q = pushIncoming(const [], make('a'), dismissed: {'a'});
      expect(q, isEmpty);
    });
  });

  testWidgets('الطلب يعلو الشاشة ويُفتح بنقرة، والتجاهل يُخفيه ولا يعود', (tester) async {
    tester.view.physicalSize = const Size(1170, 2532); tester.view.devicePixelRatio = 3; addTearDown(tester.view.reset);
    final channel = FakeChannel();
    final ts = MemoryTokenStore(); await ts.save(access: 'a', refresh: 'r');
    String? opened;

    await tester.pumpWidget(ProviderScope(key: UniqueKey(), overrides: [
      appConfigProvider.overrideWithValue(const AppConfig(flavor: AppFlavor.partner, apiBaseUrl: 'http://x', appEnv: 'test', sentryDsn: '')),
      tokenStoreProvider.overrideWithValue(ts),
      workshopRepositoryProvider.overrideWithValue(FakeBackend()),
      orgChannelProvider.overrideWithValue(channel),
      currentOrgIdProvider.overrideWithValue('org1'),
    ], child: MaterialApp.router(
      theme: AppTheme.light(), locale: const Locale('ar'), supportedLocales: L10n.supportedLocales,
      localizationsDelegates: const [L10n.delegate, GlobalMaterialLocalizations.delegate, GlobalWidgetsLocalizations.delegate, GlobalCupertinoLocalizations.delegate],
      routerConfig: GoRouter(routes: [
        GoRoute(path: '/', builder: (_, _) => const Scaffold(body: Center(child: Text('اليوم')), bottomNavigationBar: IncomingBanner())),
        GoRoute(path: '/ws/service-requests/:id', builder: (_, s) { opened = s.pathParameters['id']; return const Scaffold(body: Text('تفاصيل الطلب')); }),
      ]),
    )));
    await tester.pumpAndSettle();
    expect(channel.subscribedOrg, 'org1', reason: 'الاشتراك على قناة المنشأة نفسها');
    expect(find.text('طلب إصلاح وصلك الآن'), findsNothing, reason: 'لا شيء يعلو الشاشة قبل أن يصل طلب');

    channel.send(Incoming(kind: IncomingKind.service, id: 'sr1', number: 'SR-2026-000108',
        titleAr: 'سمكرة رفرف أمامي', distanceKm: '3.3', metaAr: 'اليوم', at: DateTime(2026, 8, 25)));
    await tester.pumpAndSettle();
    expect(find.text('طلب إصلاح وصلك الآن'), findsOneWidget);
    expect(find.text('سمكرة رفرف أمامي'), findsOneWidget);
    expect(find.textContaining('3.3 كم'), findsOneWidget);

    await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/incoming_service_light.png'));

    await tester.tap(find.text('شوف الطلب')); await tester.pumpAndSettle();
    expect(opened, 'sr1', reason: 'نقرة واحدة من أي تبويب إلى الطلب');

    // ونفس الطلب لا يعود يعلو الشاشة بعد فتحه.
    channel.send(Incoming(kind: IncomingKind.service, id: 'sr1', number: 'SR-2026-000108', titleAr: 'سمكرة رفرف أمامي', at: DateTime(2026, 8, 25)));
    await tester.pumpAndSettle();
    expect(find.text('طلب إصلاح وصلك الآن'), findsNothing);
  });
}
