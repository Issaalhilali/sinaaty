import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:sinaaty/core/auth/token_store.dart';
import 'package:sinaaty/core/config/app_config.dart';
import 'package:sinaaty/core/di/core_providers.dart';
import 'package:sinaaty/core/l10n/app_localizations.dart';
import 'package:sinaaty/core/result/result.dart';
import 'package:sinaaty/core/theme/app_theme.dart';
import 'package:sinaaty/features/transport/domain/driver_job.dart';
import 'package:sinaaty/features/transport/domain/transport.dart';
import 'package:sinaaty/features/transport/presentation/driver_home_screen.dart';
import 'package:sinaaty/features/transport/presentation/driver_proof_screen.dart';
import 'package:sinaaty/features/transport/presentation/providers.dart';
import 'package:sinaaty/features/workshop/domain/workshop.dart';
import 'package:sinaaty/features/workshop/presentation/providers.dart';

import 'customer_requests_test.dart' show FakeTransport;
import 'fleet_flow_test.dart' show loadArabicFont;
import 'workshop_flow_test.dart' show FakeBackend;

/// جانب السائق كان موجوداً في الخادم كاملاً وغير موجود في التطبيق إطلاقاً. هذه المشية تثبت أنه صار
/// يعمل من عرضٍ قريب إلى إثبات تسليم — وأن الخسارة في السباق تُقال كما هي.
void main() {
  setUpAll(loadArabicFont);
  late FakeTransport tr; late FakeBackend be; late MemoryTokenStore ts;
  final fakeJpeg = Uint8List.fromList(List<int>.filled(64, 7));

  TransportJob offer(String id) => TransportJob(id: id, number: 'TJ-2026-00003$id', type: 'flatbed_tow', status: 'requested',
      pickup: const GeoPoint(24.71, 46.67), dropoff: const GeoPoint(24.63, 46.79),
      pickupAddress: 'طريق الملك فهد', dropoffAddress: 'ورشة النور', distanceKm: '18.40', quotedPrice: '236.00',
      createdAt: DateTime(2026, 8, 25, 9));

  setUp(() async {
    tr = FakeTransport(); be = FakeBackend(); ts = MemoryTokenStore(); await ts.save(access: 'a', refresh: 'r');
    tr.offerPool.add(offer('1'));
  });

  Widget app() => ProviderScope(key: UniqueKey(), overrides: [
        appConfigProvider.overrideWithValue(const AppConfig(flavor: AppFlavor.partner, apiBaseUrl: 'http://x', appEnv: 'test', sentryDsn: '')),
        tokenStoreProvider.overrideWithValue(ts),
        transportRepositoryProvider.overrideWithValue(tr),
        workshopRepositoryProvider.overrideWithValue(be),
        driverPickImageProvider.overrideWithValue(() async => fakeJpeg),
      ], child: MaterialApp.router(
        theme: AppTheme.light(), locale: const Locale('ar'), supportedLocales: L10n.supportedLocales,
        localizationsDelegates: const [L10n.delegate, GlobalMaterialLocalizations.delegate, GlobalWidgetsLocalizations.delegate, GlobalCupertinoLocalizations.delegate],
        routerConfig: GoRouter(routes: [
          GoRoute(path: '/', builder: (_, _) => const Scaffold(body: DriverHomeScreen())),
          GoRoute(path: '/drv/jobs/:id/proof', builder: (_, s) => DriverProofScreen(jobId: s.pathParameters['id']!, pickImage: () async => fakeJpeg)),
        ]),
      ));

  void size(WidgetTester t) { t.view.physicalSize = const Size(1170, 2532); t.view.devicePixelRatio = 3; addTearDown(t.view.reset); }

  test('فعل واحد لكل حالة — والتتبّع لا يبدأ قبل أن يتحرّك', () {
    expect(nextDriverStep('assigned'), 'en_route_pickup');
    expect(nextDriverStep('en_route_dropoff'), 'delivered');
    expect(nextDriverStep('delivered'), isNull);
    expect(stepNeedsProof('en_route_dropoff'), isTrue, reason: 'التسليم يحتاج صورة ورمزاً لا انتقالاً');
    expect(stepNeedsProof('assigned'), isFalse);
    expect(shouldTrack('assigned'), isFalse, reason: 'قبل التحرّك موقعه ليس من شأن أحد');
    expect(shouldTrack('picked_up'), isTrue);
  });

  testWidgets('غير متصل ⟵ لا عروض؛ وبالاتصال تظهر', (tester) async {
    size(tester);
    await tester.pumpWidget(app()); await tester.pumpAndSettle();
    expect(find.text('أنت غير متصل'), findsOneWidget);
    await tester.tap(find.byType(Switch)); await tester.pumpAndSettle();
    expect(tr.driver.online, isTrue);
    expect(find.textContaining('236.00'), findsWidgets, reason: 'العرض القريب يظهر بسعره');
  });

  testWidgets('المهمة كاملة: قبول ← في الطريق ← حمّلت ← في الطريق ← إثبات (صورة + رمز)', (tester) async {
    size(tester);
    await tester.pumpWidget(app()); await tester.pumpAndSettle();
    await tester.tap(find.byType(Switch)); await tester.pumpAndSettle();

    await tester.tap(find.textContaining('طريق الملك فهد')); await tester.pumpAndSettle();
    expect(tr.jobs['1']?.status, 'assigned');
    await tester.pumpAndSettle();

    for (final (label, expected) in [('في الطريق للاستلام', 'en_route_pickup'), ('حمّلت السيارة', 'picked_up'), ('في الطريق للتسليم', 'en_route_dropoff')]) {
      await tester.tap(find.text(label)); await tester.pumpAndSettle();
      expect(tr.jobs['1']?.status, expected, reason: 'زرّ واحد ظاهر لكل حالة');
    }

    await tester.tap(find.text('تسليم وإثبات')); await tester.pumpAndSettle();
    expect(find.text('إثبات التسليم'), findsOneWidget);

    // الرمز وحده لا يكفي، والصورة وحدها لا تكفي — الخادم يرفض الناقص والشاشة لا تتيحه أصلاً.
    await tester.enterText(find.byType(TextField), '123456'); await tester.pumpAndSettle();
    expect(tester.widget<FilledButton>(find.widgetWithText(FilledButton, 'إنهاء المهمة')).onPressed, isNull, reason: 'بلا صورة لا إنهاء');

    await tester.tap(find.text('التقط صورة')); await tester.pumpAndSettle();
    expect(find.text('الصورة جاهزة'), findsOneWidget);
    await tester.tap(find.text('أرسل الرمز')); await tester.pumpAndSettle();
    expect(tr.codeSent, isTrue);

    await tester.tap(find.text('إنهاء المهمة')); await tester.pumpAndSettle();
    expect(tr.jobs['1']?.status, 'delivered');
    expect(tr.proofMediaId, isNotNull, reason: 'الصورة رُفعت وحُفظ معرّفها');
  });

  testWidgets('سائق آخر سبقك: تُقال كما هي، ولا تُقرأ عطلاً في التطبيق', (tester) async {
    size(tester);
    tr.takenByAnother = true;
    await tester.pumpWidget(app()); await tester.pumpAndSettle();
    await tester.tap(find.byType(Switch)); await tester.pumpAndSettle();
    await tester.tap(find.textContaining('طريق الملك فهد')); await tester.pumpAndSettle();
    expect(find.text('أُسندت المهمة لسائق آخر.'), findsOneWidget);
  });

  testWidgets('سائق بلا منشأة نقل: يُقال له قبل أن يضغط لا بعده', (tester) async {
    size(tester);
    tr.driver = const DriverProfile(userId: 'd1', truckPlate: 'س ط ح 1', truckType: 'flatbed_tow');
    await tester.pumpWidget(app()); await tester.pumpAndSettle();
    expect(find.textContaining('اربط حسابك بمنشأة النقل'), findsOneWidget);
    await tester.tap(find.byType(Switch)); await tester.pumpAndSettle();
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/driver_home_light.png'));
  });
}
