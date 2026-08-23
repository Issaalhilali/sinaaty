import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
import 'package:sinaaty/features/auth/domain/auth_entities.dart';
import 'package:sinaaty/features/auth/domain/auth_repository.dart';
import 'package:sinaaty/features/auth/presentation/providers.dart';
import 'package:sinaaty/features/home/presentation/request_hub_screen.dart';
import 'package:sinaaty/features/parts/domain/parts.dart';
import 'package:sinaaty/features/parts/domain/parts_repository.dart';
import 'package:sinaaty/features/parts/presentation/providers.dart';
import 'package:sinaaty/features/parts/presentation/request_screen.dart';
import 'package:sinaaty/features/parts/presentation/warranties_screen.dart';
import 'package:sinaaty/features/transport/domain/transport.dart';
import 'package:sinaaty/features/transport/domain/transport_repository.dart';
import 'package:sinaaty/features/transport/presentation/providers.dart';
import 'package:sinaaty/features/transport/presentation/tow_job_screen.dart';
import 'package:sinaaty/features/transport/presentation/tow_request_screen.dart';
import 'package:sinaaty/features/vehicles/domain/vehicle.dart';
import 'package:sinaaty/features/vehicles/domain/vehicles_repository.dart';
import 'package:sinaaty/features/vehicles/presentation/providers.dart';

/// Step 23 verify: the customer asks for a part and picks an offer, asks for a tow and sees the price
/// before sending, and finds every warranty in one place.

class FakeCustomerParts implements PartsRepository {
  final requests = <String, PartRequest>{};
  String? lastAcceptedBid;
  ({String? vin, String name, List<String> conds, int? minutes})? lastCreate;

  PartRequest _seed(String id) => PartRequest(
    id: id, number: 'PR-2026-000009', partNameAr: 'مساعد أمامي يمين', vin: 'JTDKN3DU0A0123456',
    acceptedConditions: const ['oem_new', 'used_scrapyard'], quantity: 1,
    biddingEndsAt: DateTime.now().add(const Duration(minutes: 45)), status: 'open', bidsCount: 3, lowestBid: '380.00',
    createdAt: DateTime(2026, 8, 20, 10),
    bids: [
      PartBid(id: 'b_expensive', supplierOrgId: 's1', condition: 'oem_new', unitPrice: '650.00', quantity: 1, deliveryFee: '0.00', etaHours: 48, warrantyDays: 365, status: 'submitted', createdAt: DateTime(2026, 8, 20, 10, 5), whereText: 'الصناعية الثانية — 9.5 كم', distanceKm: '9.5'),
      PartBid(id: 'b_cheap', supplierOrgId: 's2', condition: 'used_scrapyard', unitPrice: '380.00', quantity: 1, deliveryFee: '0.00', etaHours: 24, warrantyDays: 30, status: 'submitted', createdAt: DateTime(2026, 8, 20, 10, 9), whereText: 'حي الصناعية — 3.1 كم', distanceKm: '3.1'),
      PartBid(id: 'b_middle', supplierOrgId: 's3', condition: 'aftermarket_new', unitPrice: '520.00', quantity: 1, deliveryFee: '0.00', etaHours: 6, warrantyDays: 90, status: 'submitted', createdAt: DateTime(2026, 8, 20, 10, 12)),
    ],
  );

  @override Future<Result<PartRequest>> createRequest({String? orgId, String? workOrderId, String? vin, required String partNameAr, String? descriptionAr, List<String>? acceptedConditions, int quantity = 1, int? biddingMinutes}) async {
    lastCreate = (vin: vin, name: partNameAr, conds: acceptedConditions ?? const [], minutes: biddingMinutes);
    final r = _seed('pr1');
    requests[r.id] = r;
    return Result.ok(r);
  }
  @override Future<Result<List<PartRequest>>> myRequests({String? orgId, bool asSupplier = false}) async => Result.ok(requests.values.toList());
  @override Future<Result<PartRequest>> request(String id) async => requests.containsKey(id) ? Result.ok(requests[id]!) : Result.ok(requests.putIfAbsent(id, () => _seed(id)));
  @override Future<Result<PartOrder>> accept(String requestId, String bidId, {String paymentTerms = 'prepaid'}) async {
    lastAcceptedBid = bidId;
    return Result.ok(PartOrder(id: 'po1', number: 'PO-2026-000004', source: 'auction', status: 'pending_payment', paymentTerms: paymentTerms, supplierOrgId: 's2', total: '380.00', createdAt: DateTime(2026, 8, 20, 11), items: const []));
  }
  @override Future<Result<List<Warranty>>> warranties({String? orgId}) async => Result.ok([
    Warranty(id: 'w1', number: 'WR-2026-000012', covers: 'part_and_labor', coverageAr: 'مساعد أمامي يمين + التركيب', startsAt: DateTime(2026, 6, 1), endsAt: DateTime(2027, 6, 1), status: 'active', issuerAr: 'تشليح الرياض'),
    Warranty(id: 'w2', number: 'WR-2025-000003', covers: 'part', coverageAr: 'بطارية', startsAt: DateTime(2025, 1, 1), endsAt: DateTime(2026, 1, 1), status: 'expired', issuerAr: 'وكيل قطع'),
  ]);
  // Not used by the customer flavor.
  @override Future<Result<FitResult>> fit({String? vin, String? vehicleId, String? categoryCode, String? text, String? buyerOrgId}) async => const Result.err(UnknownFailure());
  @override Future<Result<PartOrder>> buyNow({String? orgId, String? workOrderId, required String paymentTerms, required List<({String inventoryId, int quantity})> items}) async => const Result.err(UnknownFailure());
  @override Future<Result<List<PartOrder>>> orders({String? orgId, bool asSupplier = false}) async => const Result.ok([]);
  @override Future<Result<PartOrder>> order(String id) async => const Result.err(UnknownFailure());
  @override Future<Result<void>> confirm(String orderId) async => const Result.ok(null);
  @override Future<Result<void>> requestDelivery(String orderId) async => const Result.ok(null);
  @override Future<Result<List<TradeAccount>>> tradeAccounts({required String orgId, required bool asSeller}) async => const Result.ok([]);
  @override Future<Result<TradeAccount>> requestTradeAccount({required String sellerOrgId, required String buyerOrgId}) async => const Result.err(UnknownFailure());
  @override Future<Result<TradeAccount>> approveTradeAccount(String id, {required String creditLimit, int termsDays = 30, int discountBps = 0}) async => const Result.err(UnknownFailure());
  @override Future<Result<SerialVerify>> verify(String qrToken) async => const Result.err(UnknownFailure());
  @override Future<Result<Warranty>> install({required String qrToken, required String workOrderItemId, int laborWarrantyDays = 180}) async => const Result.err(UnknownFailure());
  @override Future<Result<PartBid>> bid(String requestId, {required String orgId, required String condition, required String unitPrice, int quantity = 1, String deliveryFee = '0', int? etaHours, int warrantyDays = 0, String? notesAr}) async => const Result.err(UnknownFailure());
  @override Future<Result<PartOrder>> transition(String orderId, String to) async => const Result.err(UnknownFailure());
  @override Future<Result<List<InventoryItem>>> inventory(String orgId) async => const Result.ok([]);
  @override Future<Result<({int issued, String batchCode})>> issueSerials({required String orgId, required String catalogId, required int count}) async => const Result.ok((issued: 0, batchCode: ''));
}

class FakeTransport implements TransportRepository {
  final jobs = <String, TransportJob>{};
  int quotes = 0;
  ({String type, GeoPoint pickup, GeoPoint dropoff, String? notes})? lastCreate;
  @override Future<Result<TowQuote>> quote({required String type, required GeoPoint pickup, required GeoPoint dropoff}) async {
    quotes++;
    return Result.ok(TowQuote(type: type, distanceKm: '18.40', etaMinutes: 22, price: type == 'heavy_tow' ? '410.00' : '236.00', total: type == 'heavy_tow' ? '471.50' : '271.40'));
  }
  @override Future<Result<TransportJob>> createJob({required String type, required GeoPoint pickup, required GeoPoint dropoff, String? vehicleId, String? workOrderId, String? pickupAddress, String? dropoffAddress, String? notesAr}) async {
    lastCreate = (type: type, pickup: pickup, dropoff: dropoff, notes: notesAr);
    final j = TransportJob(id: 'tj1', number: 'TJ-2026-000031', type: type, status: 'requested', vehicleId: vehicleId, pickup: pickup, dropoff: dropoff, pickupAddress: pickupAddress, dropoffAddress: dropoffAddress, distanceKm: '18.40', quotedPrice: '236.00', etaMinutes: 22, notesAr: notesAr, createdAt: DateTime(2026, 8, 20, 12));
    jobs[j.id] = j;
    return Result.ok(j);
  }
  @override Future<Result<List<TransportJob>>> myJobs() async => Result.ok(jobs.values.toList());
  @override Future<Result<TransportJob>> job(String id) async => jobs.containsKey(id) ? Result.ok(jobs[id]!) : const Result.err(UnknownFailure());
  @override Future<Result<void>> cancel(String id, {String? reasonAr}) async { final j = jobs[id]!; jobs[id] = TransportJob(id: j.id, number: j.number, type: j.type, status: 'cancelled', quotedPrice: j.quotedPrice, createdAt: j.createdAt); return const Result.ok(null); }
}

class FakeVehicles implements VehiclesRepository {
  @override Future<Result<List<Vehicle>>> list() async => const Result.ok([Vehicle(id: 'v1', vin: 'JTDKN3DU0A0123456', plate: 'أ ب ج 4821', makeAr: 'تويوتا', modelAr: 'كامري', year: 2019)]);
  @override Future<Result<Vehicle>> add({String? vin, String? plate}) async => const Result.err(UnknownFailure());
  @override Future<Result<VehiclePassport>> passport(String id) async => const Result.err(UnknownFailure());
  @override Future<Result<String>> shareLink(String id) async => const Result.err(UnknownFailure());
}

class FakeAuth implements AuthRepository {
  @override Future<Result<({String phone, int expiresIn, String? debugCode})>> requestOtp(String phone) async => const Result.err(UnknownFailure());
  @override Future<Result<AuthSession>> verifyOtp({required String phone, required String code, required String platform}) async => const Result.err(UnknownFailure());
  @override Future<Result<Me>> me() async => const Result.ok(Me(id: 'u', phone: '+966512345678', platformRole: 'none', nafathVerified: false, orgs: []));
  @override Future<Result<Me>> setName(String fullNameAr) => me();
  @override Future<Result<void>> logout() async => const Result.ok(null);
}

Future<void> loadArabicFont() async {
  final loader = FontLoader('PlexArabic');
  for (final f in ['Regular', 'Medium', 'SemiBold', 'Bold']) {
    loader.addFont(File('assets/fonts/IBMPlexSansArabic-$f.ttf').readAsBytes().then((b) => ByteData.view(b.buffer)));
  }
  await loader.load();
}

void main() {
  setUpAll(loadArabicFont);
  late FakeCustomerParts parts;
  late FakeTransport transport;

  Widget app(GoRouter r) => ProviderScope(key: UniqueKey(), overrides: [
    appConfigProvider.overrideWithValue(const AppConfig(flavor: AppFlavor.customer, apiBaseUrl: 'http://x', appEnv: 'test', sentryDsn: '')),
    authRepositoryProvider.overrideWithValue(FakeAuth()), tokenStoreProvider.overrideWithValue(MemoryTokenStore()),
    partsRepositoryProvider.overrideWithValue(parts), transportRepositoryProvider.overrideWithValue(transport),
    vehiclesRepositoryProvider.overrideWithValue(FakeVehicles()),
  ], child: MaterialApp.router(theme: AppTheme.light(), darkTheme: AppTheme.dark(), locale: const Locale('ar'), supportedLocales: L10n.supportedLocales,
    localizationsDelegates: const [L10n.delegate, GlobalMaterialLocalizations.delegate, GlobalWidgetsLocalizations.delegate, GlobalCupertinoLocalizations.delegate], routerConfig: r));

  GoRouter router(String initial) => GoRouter(initialLocation: initial, routes: [
    GoRoute(path: '/', builder: (_, _) => const Scaffold(body: RequestHubScreen())),
    GoRoute(path: '/warranties', builder: (_, _) => const WarrantiesScreen()),
    GoRoute(path: '/tow/new', builder: (_, _) => const TowRequestScreen()),
    GoRoute(path: '/tow/:id', builder: (_, s) => TowJobScreen(id: s.pathParameters['id']!)),
    GoRoute(path: '/invoices/:id', builder: (_, s) => Scaffold(body: Text('pay:${s.pathParameters['id']}'))),
    GoRoute(path: '/parts/requests/:id', builder: (_, s) => PartRequestScreen(id: s.pathParameters['id']!)),
    GoRoute(path: '/parts/orders/:id', builder: (_, _) => const Scaffold(body: Text('order'))),
  ]);

  void size(WidgetTester t) { t.view.physicalSize = const Size(1170, 2532); t.view.devicePixelRatio = 3; addTearDown(t.view.reset); }
  setUp(() { parts = FakeCustomerParts(); transport = FakeTransport(); });

  group('location links', () {
    test('reads coordinates from a pasted maps link or plain text', () {
      expect(parseLocationLink('https://www.google.com/maps/@24.7136,46.6753,15z'), const GeoPoint(24.7136, 46.6753));
      expect(parseLocationLink('https://maps.google.com/?q=24.7136,46.6753'), const GeoPoint(24.7136, 46.6753));
      expect(parseLocationLink('24.7136, 46.6753'), const GeoPoint(24.7136, 46.6753));
      expect(parseLocationLink('24.7136، 46.6753'), const GeoPoint(24.7136, 46.6753));   // Arabic comma
    });
    test('refuses what it cannot read instead of guessing', () {
      expect(parseLocationLink('https://maps.app.goo.gl/abc123'), isNull);   // short link: nothing to parse offline
      expect(parseLocationLink('الرياض'), isNull);
      expect(parseLocationLink('999.0, 46.6'), isNull);
      expect(parseLocationLink(''), isNull);
    });
  });

  test('bid comparison marks the cheapest, the fastest and the longest warranty', () {
    final bids = [
      PartBid(id: 'a', supplierOrgId: 's1', condition: 'oem_new', unitPrice: '650.00', quantity: 1, deliveryFee: '0', etaHours: 48, warrantyDays: 365, status: 'submitted', createdAt: DateTime(2026)),
      PartBid(id: 'b', supplierOrgId: 's2', condition: 'used_scrapyard', unitPrice: '380.00', quantity: 1, deliveryFee: '0', etaHours: 24, warrantyDays: 30, status: 'submitted', createdAt: DateTime(2026)),
      PartBid(id: 'c', supplierOrgId: 's3', condition: 'aftermarket_new', unitPrice: '520.00', quantity: 1, deliveryFee: '0', etaHours: 6, warrantyDays: 90, status: 'submitted', createdAt: DateTime(2026)),
    ];
    final h = bidHighlights(bids);
    expect(h['b'], contains(BidHighlight.cheapest));
    expect(h['c'], contains(BidHighlight.fastest));
    expect(h['a'], contains(BidHighlight.longestWarranty));
    expect(sortedForCompare(bids).map((x) => x.id).toList(), ['b', 'c', 'a']);   // cheapest first
    // A single bid needs no comparison badges.
    expect(bidHighlights([bids.first]), isEmpty);
  });

  testWidgets('«اطلب» offers its three doors, and a part request lands on the bids screen', (tester) async {
    size(tester);
    await tester.pumpWidget(app(router('/'))); await tester.pumpAndSettle();
    expect(find.text('أصلح سيارتي'), findsOneWidget);       // the marketplace door (scope 2026-08-22)
    expect(find.text('أطلب قطعة غيار'), findsOneWidget);
    expect(find.text('أطلب سطحة'), findsOneWidget);
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/customer_request_hub_light.png'));

    await tester.tap(find.text('أطلب قطعة غيار')); await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).first, 'مساعد أمامي يمين');
    await tester.tap(find.text('أرسل الطلب')); await tester.pumpAndSettle();
    expect(parts.lastCreate?.name, 'مساعد أمامي يمين');
    expect(parts.lastCreate?.vin, 'JTDKN3DU0A0123456');       // the customer's only car is attached automatically
    expect(find.textContaining('PR-2026-000009'), findsWidgets);
  });

  testWidgets('bids screen ranks offers cheapest first and says why each one wins', (tester) async {
    size(tester);
    await tester.pumpWidget(app(router('/parts/requests/pr1'))); await tester.pumpAndSettle();
    expect(find.text('الأرخص'), findsOneWidget);
    expect(find.text('الأسرع'), findsOneWidget);
    expect(find.text('أطول ضمان'), findsOneWidget);
    expect(find.text('الأقرب'), findsOneWidget);                            // «الأقرب» joins the arguments (scope §2)
    expect(find.textContaining('حي الصناعية — 3.1 كم'), findsOneWidget);    // the place line, exactly as the API sent it
    expect(find.textContaining('9.5 كم'), findsOneWidget);
    // b_middle has no coordinates: its row simply has no place line — and nothing breaks.
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/customer_bids_light.png'));
    // Accepting the first (cheapest) offer takes the customer to the order.
    await tester.tap(find.text('اقبل هذا العرض').first); await tester.pumpAndSettle();
    await tester.tap(find.text('اقبل هذا العرض').last); await tester.pumpAndSettle();
    expect(parts.lastAcceptedBid, 'b_cheap');
  });

  testWidgets('tow: the price appears before the request is sent, and only then can it be sent', (tester) async {
    size(tester);
    await tester.pumpWidget(app(router('/tow/new'))); await tester.pumpAndSettle();
    final send = find.widgetWithText(FilledButton, 'أطلب السطحة');
    expect(tester.widget<FilledButton>(send).onPressed, isNull);          // nothing to price yet
    expect(find.textContaining('حدّد موقع سيارتك'), findsOneWidget);

    final links = find.widgetWithText(TextField, '24.7136, 46.6753');
    await tester.enterText(links.at(0), 'https://maps.google.com/?q=24.7136,46.6753');
    await tester.enterText(links.at(1), '24.6300, 46.7900');
    await tester.pumpAndSettle();
    expect(transport.quotes, greaterThan(0));
    expect(find.textContaining('271.40'), findsWidgets);                   // VAT-inclusive — what the invoice will actually say
    expect(find.text('شامل الضريبة'), findsOneWidget);
    expect(find.textContaining('236.00'), findsNothing);                   // never the pre-VAT figure (p1 scope §2)
    expect(find.textContaining('18.40'), findsWidgets);
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/customer_tow_request_light.png'));

    await tester.tap(find.text('أطلب السطحة')); await tester.pumpAndSettle();
    expect(transport.lastCreate?.pickup, const GeoPoint(24.7136, 46.6753));
    expect(find.textContaining('TJ-2026-000031'), findsWidgets);
    expect(find.text('بانتظار سائق'), findsWidgets);   // header + first timeline step
  });

  testWidgets('delivered tow: the auto-issued invoice becomes the one pay button, through the existing flow', (tester) async {
    size(tester);
    transport.jobs['tj7'] = TransportJob(id: 'tj7', number: 'TJ-2026-000032', type: 'flatbed_tow', status: 'delivered', quotedPrice: '236.00', finalPrice: '236.00', createdAt: DateTime(2026, 8, 20, 12), invoice: (id: 'inv-t1', total: '271.40', status: 'issued'));
    await tester.pumpWidget(app(router('/tow/tj7'))); await tester.pumpAndSettle();
    expect(find.textContaining('271.40'), findsWidgets);                   // the pay button carries the invoice total
    expect(find.text('مدفوعة'), findsOneWidget);                            // payment closes the timeline — pending step visible
    await tester.tap(find.textContaining('ادفع')); await tester.pumpAndSettle();
    expect(find.text('pay:inv-t1'), findsOneWidget);                       // the existing billing flow, no new component
  });

  testWidgets('warranty wallet separates what is still covered from what has expired', (tester) async {
    size(tester);
    await tester.pumpWidget(app(router('/warranties'))); await tester.pumpAndSettle();
    expect(find.text('مساعد أمامي يمين + التركيب'), findsOneWidget);
    expect(find.text('بطارية'), findsOneWidget);
    expect(find.text('ساري'), findsOneWidget);
    expect(find.text('منتهٍ'), findsWidgets);
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/customer_warranties_light.png'));
  });
}
