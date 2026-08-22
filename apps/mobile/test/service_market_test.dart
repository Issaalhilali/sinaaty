import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:sinaaty/core/auth/token_store.dart';
import 'package:sinaaty/core/config/app_config.dart';
import 'package:sinaaty/core/di/core_providers.dart';
import 'package:sinaaty/core/flags/feature_flags.dart';
import 'package:sinaaty/core/l10n/app_localizations.dart';
import 'package:sinaaty/core/result/result.dart';
import 'package:sinaaty/core/theme/app_theme.dart';
import 'package:sinaaty/features/auth/presentation/providers.dart';
import 'package:sinaaty/features/home/presentation/request_hub_screen.dart';
import 'package:sinaaty/features/notifications/presentation/inbox_screen.dart' show InboxScreen;
import 'package:sinaaty/features/parts/presentation/providers.dart';
import 'package:sinaaty/features/service_market/domain/service_request.dart';
import 'package:sinaaty/features/service_market/domain/service_market_repository.dart';
import 'package:sinaaty/features/service_market/presentation/service_request_screen.dart';
import 'package:sinaaty/features/service_market/presentation/providers.dart';
import 'package:sinaaty/features/transport/presentation/providers.dart';
import 'package:sinaaty/features/vehicles/presentation/providers.dart';

import 'customer_flow_test.dart' show FakeAuth;
import 'feature_flags_test.dart' show FakeFlags;
import 'fleet_flow_test.dart' show loadArabicFont;

/// The repair marketplace (owner's directive, scope 2026-08-22): the customer throws the problem
/// to nearby workshops, compares offers whose arguments and distance lines arrive READY from the
/// API, and accepting rides the existing legal path as a plain work order.
class FakeServiceMarket implements ServiceMarketRepository {
  final store = <String, ServiceRequest>{};
  ({String title, int radius, String? when, double lat})? lastCreate;
  ({String id, String offerId})? lastAccept;
  int? lastWiden;

  ServiceRequest _seed({List<ServiceOffer> offers = const []}) => ServiceRequest(
    id: 'sr1', number: 'SR-2026-000007', status: 'open', titleAr: 'صوت طقطقة من الأمام عند المطبات',
    radiusKm: 25, preferredTime: 'today', createdAt: DateTime(2026, 8, 22, 9), offers: offers);

  @override Future<Result<ServiceRequest>> create({String? vehicleId, required String titleAr, String? descriptionAr, required double lat, required double lng, String? addressHint, required int radiusKm, String? preferredTime, List<String> mediaIds = const []}) async {
    lastCreate = (title: titleAr, radius: radiusKm, when: preferredTime, lat: lat);
    final r = _seed(); store[r.id] = r; return Result.ok(r);
  }
  @override Future<Result<List<ServiceRequest>>> mine() async => Result.ok(store.values.toList());
  @override Future<Result<List<ServiceRequest>>> nearby() async => Result.ok(store.values.toList());
  @override Future<Result<ServiceRequest>> byId(String id) async => Result.ok(store[id]!);
  @override Future<Result<void>> offer(String id, {required String offerType, required String diagnosisAr, String? priceMin, String? priceMax, String? availability}) async {
    final r = store[id]!;
    store[id] = ServiceRequest(id: r.id, number: r.number, status: r.status, titleAr: r.titleAr, radiusKm: r.radiusKm, preferredTime: r.preferredTime, createdAt: r.createdAt,
      offers: [ServiceOffer(id: 'of-mine', offerType: offerType, diagnosisAr: diagnosisAr, priceMin: priceMin, priceMax: priceMax, availability: availability)]);
    return const Result.ok(null);
  }
  @override Future<Result<String>> accept(String id, {required String offerId}) async { lastAccept = (id: id, offerId: offerId); return const Result.ok('wo-new-1'); }
  @override Future<Result<void>> widen(String id, {required int radiusKm}) async { lastWiden = radiusKm; return const Result.ok(null); }
  @override Future<Result<void>> cancel(String id) async => const Result.ok(null);
  @override Future<Result<String>> uploadPhoto(List<int> bytes, {required String mimeType}) async => const Result.ok('m-sr-1');

  void seedWithOffers() {
    store['sr1'] = _seed(offers: const [
      ServiceOffer(id: 'of1', workshopNameAr: 'ورشة النور للسمكرة والميكانيكا', rating: '4.8', distanceText: 'الصناعية الثانية — 7 كم',
        offerType: 'estimate', diagnosisAr: 'الأرجح جلد مقصات أمامي — يظهر صوته عند المطبات تحديداً.', priceMin: '350.00', priceMax: '520.00',
        availability: 'today', badges: ['cheapest', 'previously_used', 'specialist'], respondsInMinutes: 12),
      ServiceOffer(id: 'of2', workshopNameAr: 'مركز الإتقان للميكانيكا', rating: '4.9', distanceText: 'حي الصناعية — 4.2 كم',
        offerType: 'free_inspection', diagnosisAr: 'قد يكون كرسي مكينة — نفضّل الفحص قبل أي رقم.',
        availability: 'now', badges: ['nearest', 'top_rated']),
    ]);
  }
}

void main() {
  setUpAll(loadArabicFont);
  late FakeServiceMarket market; late MemoryTokenStore ts;
  setUp(() async { market = FakeServiceMarket(); ts = MemoryTokenStore(); await ts.save(access: 'a', refresh: 'r'); });

  Widget app(String initial, {Map<String, bool> flags = const {'service_marketplace': true}}) => ProviderScope(key: UniqueKey(), overrides: [
    appConfigProvider.overrideWithValue(const AppConfig(flavor: AppFlavor.customer, apiBaseUrl: 'http://x', appEnv: 'test', sentryDsn: '')),
    authRepositoryProvider.overrideWithValue(FakeAuth()), tokenStoreProvider.overrideWithValue(ts),
    flagsRepositoryProvider.overrideWithValue(FakeFlags(Result.ok(FeatureFlags(flags)))),
    serviceMarketRepositoryProvider.overrideWithValue(market),
    vehiclesProvider.overrideWith((ref) async => const Result.ok([])),
    myPartRequestsProvider.overrideWith((ref) async => const Result.ok([])),
    myTowJobsProvider.overrideWith((ref) async => const Result.ok([])),
  ], child: MaterialApp.router(theme: AppTheme.light(), darkTheme: AppTheme.dark(), locale: const Locale('ar'), supportedLocales: L10n.supportedLocales,
    localizationsDelegates: const [L10n.delegate, GlobalMaterialLocalizations.delegate, GlobalWidgetsLocalizations.delegate, GlobalCupertinoLocalizations.delegate],
    routerConfig: GoRouter(initialLocation: initial, routes: [
      GoRoute(path: '/', builder: (_, _) => const Scaffold(body: RequestHubScreen())),
      GoRoute(path: '/service-requests/:id', builder: (_, s) => ServiceRequestScreen(id: s.pathParameters['id']!)),
      GoRoute(path: '/ws/service-requests/:id', builder: (_, s) => ServiceRequestScreen(id: s.pathParameters['id']!, workshop: true)),
      GoRoute(path: '/work-orders/:id', builder: (_, s) => Scaffold(body: Text('wo:${s.pathParameters['id']}'))),
    ])));

  void size(WidgetTester t) { t.view.physicalSize = const Size(1170, 2532); t.view.devicePixelRatio = 3; addTearDown(t.view.reset); }

  testWidgets('the full flow: request → two offers with two different arguments → accept → a work order', (tester) async {
    size(tester);
    await tester.pumpWidget(app('/')); await tester.pumpAndSettle();
    await tester.tap(find.text('أصلح سيارتي')); await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).first, 'صوت طقطقة من الأمام عند المطبات');
    await tester.enterText(find.byType(TextField).last, '24.7136, 46.6753');
    await tester.tap(find.text('أرسل الطلب')); await tester.pumpAndSettle();
    expect(market.lastCreate!.title, 'صوت طقطقة من الأمام عند المطبات');
    expect(market.lastCreate!.radius, 25);
    expect(market.lastCreate!.lat, closeTo(24.7136, 0.0001));               // parsed from the pasted link — no maps SDK

    market.seedWithOffers();
    await tester.pumpWidget(app('/service-requests/sr1')); await tester.pumpAndSettle();
    expect(find.text('ورشة النور للسمكرة والميكانيكا'), findsOneWidget);
    expect(find.textContaining('7 كم'), findsOneWidget);                    // the distance line, as the API sent it
    expect(find.text('الأرخص'), findsOneWidget);                            // two offers, two different arguments
    expect(find.text('سبق تعاملك معها'), findsOneWidget);
    expect(find.text('الأقرب'), findsOneWidget);
    expect(find.text('معاينة مجانية'), findsOneWidget);                     // an explicit offer type, not a zero price
    expect(find.textContaining('لا مفاجآت'), findsOneWidget);               // the legal-path sentence
    expect(find.text('متخصصون في سيارتك'), findsOneWidget);                 // the specialist argument, from badges as sent
    expect(find.textContaining('يرد خلال ~12 دقيقة'), findsOneWidget);      // response speed — only where history exists
    expect(find.textContaining('يرد خلال'), findsOneWidget);                // the new workshop gets no invented number
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/service_offers_light.png'));

    await tester.tap(find.text('اقبل هذا العرض').first); await tester.pumpAndSettle();
    expect(market.lastAccept!.offerId, 'of1');
    expect(find.text('wo:wo-new-1'), findsOneWidget);                       // lands on the normal work order
  });

  testWidgets('dark golden of the comparison; and the workshop answers with a mandatory diagnosis', (tester) async {
    size(tester);
    market.seedWithOffers();
    await tester.pumpWidget(app('/service-requests/sr1')); await tester.pumpAndSettle();
    await tester.pumpWidget(ProviderScope(key: UniqueKey(), overrides: [
      appConfigProvider.overrideWithValue(const AppConfig(flavor: AppFlavor.customer, apiBaseUrl: 'http://x', appEnv: 'test', sentryDsn: '')),
      authRepositoryProvider.overrideWithValue(FakeAuth()), tokenStoreProvider.overrideWithValue(ts),
      flagsRepositoryProvider.overrideWithValue(FakeFlags(const Result.ok(FeatureFlags({'service_marketplace': true})))),
      serviceMarketRepositoryProvider.overrideWithValue(market),
    ], child: MaterialApp.router(theme: AppTheme.light(), darkTheme: AppTheme.dark(), themeMode: ThemeMode.dark, locale: const Locale('ar'), supportedLocales: L10n.supportedLocales,
      localizationsDelegates: const [L10n.delegate, GlobalMaterialLocalizations.delegate, GlobalWidgetsLocalizations.delegate, GlobalCupertinoLocalizations.delegate],
      routerConfig: GoRouter(initialLocation: '/service-requests/sr1', routes: [GoRoute(path: '/service-requests/:id', builder: (_, s) => ServiceRequestScreen(id: s.pathParameters['id']!))]))));
    await tester.pumpAndSettle();
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/service_offers_dark.png'));
  });

  testWidgets('the workshop offer sheet: diagnosis mandatory, then the offer lands as an upsert', (tester) async {
    size(tester);
    market.store['sr1'] = market._seed();
    await tester.pumpWidget(app('/ws/service-requests/sr1')); await tester.pumpAndSettle();
    await tester.tap(find.text('قدّم عرضك')); await tester.pumpAndSettle();
    await tester.tap(find.text('قدّم عرضك').last); await tester.pumpAndSettle();       // empty diagnosis → nothing sent
    expect(market.store['sr1']!.offers, isEmpty);
    await tester.enterText(find.byType(TextField).first, 'الأرجح جلد مقصات — صوت المطبات مؤشره.');
    await tester.enterText(find.byType(TextField).at(1), '350');
    await tester.tap(find.text('قدّم عرضك').last); await tester.pumpAndSettle();
    expect(market.store['sr1']!.offers.single.diagnosisAr, contains('جلد مقصات'));
    expect(find.text('أُرسل عرضك'), findsOneWidget);
  });

  test('the quiet-push deep link resolves to the request screen route', () {
    expect(InboxScreen.routeFor('sinaaty://service-requests/sr1'), '/service-requests/sr1');
  });

  testWidgets('flag off: «أصلح سيارتي» does not exist', (tester) async {
    size(tester);
    await tester.pumpWidget(app('/', flags: const {'service_marketplace': false})); await tester.pumpAndSettle();
    expect(find.text('أصلح سيارتي'), findsNothing);
    expect(find.text('أطلب قطعة غيار'), findsOneWidget);                    // the neighbours stay
  });
}
