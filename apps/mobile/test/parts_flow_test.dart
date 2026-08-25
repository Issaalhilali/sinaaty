import 'dart:async';
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
import 'package:sinaaty/core/ui/ui.dart';
import 'package:sinaaty/core/result/result.dart';
import 'package:sinaaty/core/theme/app_theme.dart';
import 'package:sinaaty/features/auth/domain/auth_entities.dart';
import 'package:sinaaty/features/auth/domain/auth_repository.dart';
import 'package:sinaaty/features/auth/presentation/providers.dart';
import 'package:sinaaty/features/parts/domain/parts.dart';
import 'package:sinaaty/features/parts/domain/parts_repository.dart';
import 'package:sinaaty/features/parts/presentation/part_order_screen.dart';
import 'package:sinaaty/features/parts/presentation/providers.dart';
import 'package:sinaaty/features/parts/presentation/request_screen.dart';
import 'package:sinaaty/features/parts/presentation/supplier_screens.dart';
import 'package:sinaaty/features/parts/presentation/workshop_parts_screen.dart';
import 'package:sinaaty/features/work_orders/domain/work_order.dart';
import 'package:sinaaty/features/transport/domain/transport_repository.dart';
import 'package:sinaaty/features/transport/presentation/providers.dart';
import 'package:sinaaty/features/workshop/domain/workshop.dart';
import 'package:sinaaty/features/workshop/domain/workshop_repository.dart';
import 'package:sinaaty/features/workshop/presentation/providers.dart';

class FakeParts implements PartsRepository, QrScanner {
  List<String> lastBidMedia = const [];
  final requests = <String, PartRequest>{}; final store = <String, PartOrder>{}; var tas = <TradeAccount>[]; String? scanned; final installs = <String>[]; int seq = 0; String currentOrg = 'ws1';
  @override Future<Result<FitResult>> fit({String? vin, String? vehicleId, String? categoryCode, String? text, String? buyerOrgId}) async => Result.ok(FitResult(make: 'تويوتا', model: 'كامري', year: 2019, offers: [PartOffer(inventoryId: 'inv1', supplierOrgId: 'dist', supplierNameAr: 'الوكيل المتحد', titleAr: 'دسكات فرامل أمامية كامري — أصلي', partNumber: '04465-33471', brandAr: 'تويوتا (أصلي)', condition: 'oem_new', price: '480.00', tradePrice: tas.any((a) => a.status == 'active') ? '420.00' : null, tradeAccountId: tas.any((a) => a.status == 'active') ? 'ta1' : null, quantity: 12, warrantyDays: 365, leadTimeHours: 6, isSerialized: true, fitmentSource: 'catalog'), const PartOffer(inventoryId: 'inv2', supplierOrgId: 'shop', supplierNameAr: 'الشرق للقطع', titleAr: 'دسكات بديل معتمد BP1421', partNumber: 'BP1421', brandAr: 'بوش', condition: 'aftermarket_new', price: '265.00', quantity: 30, warrantyDays: 365, leadTimeHours: 24, isSerialized: false, fitmentSource: 'catalog')]));
  @override Future<Result<PartOrder>> buyNow({String? orgId, String? workOrderId, required String paymentTerms, required List<({String inventoryId, int quantity})> items}) async { seq++; final o = PartOrder(id: 'po$seq', number: 'PO-2026-00077$seq', source: 'catalog_buy_now', status: paymentTerms == 'deferred' ? 'paid' : 'pending_payment', paymentTerms: paymentTerms, supplierOrgId: 'dist', buyerOrgId: orgId, total: (420 * items.first.quantity * 1.15).toStringAsFixed(2), createdAt: DateTime(2026, 8, 19), items: [PartOrderItem(descriptionAr: 'دسكات فرامل أمامية كامري — أصلي · 04465-33471', condition: 'oem_new', quantity: items.first.quantity, unitPrice: '420.00', lineTotal: (420 * items.first.quantity).toStringAsFixed(2), warrantyDays: 365)], invoiceId: 'inv9'); store[o.id] = o; return Result.ok(o); }
  @override Future<Result<PartRequest>> createRequest({String? orgId, String? workOrderId, String? vin, required String partNameAr, String? descriptionAr, List<String>? acceptedConditions, int quantity = 1, int? biddingMinutes}) async { seq++; final r = PartRequest(id: 'pr$seq', number: 'PR-2026-00080$seq', partNameAr: partNameAr, vin: vin, acceptedConditions: acceptedConditions ?? ['oem_new'], quantity: quantity, biddingEndsAt: DateTime.now().add(Duration(minutes: biddingMinutes ?? 60)), status: 'open', requesterOrgId: orgId, createdAt: DateTime.now()); requests[r.id] = r; return Result.ok(r); }
  @override Future<Result<List<PartRequest>>> myRequests({String? orgId, bool asSupplier = false}) async => Result.ok(requests.values.toList());
  @override Future<Result<PartRequest>> request(String id) async => Result.ok(requests[id]!);
  PartRequest _with(PartRequest r, {List<PartBid>? bids, String? status, String? awarded}) => PartRequest(id: r.id, number: r.number, partNameAr: r.partNameAr, vin: r.vin, acceptedConditions: r.acceptedConditions, quantity: r.quantity, biddingEndsAt: r.biddingEndsAt, status: status ?? r.status, awardedBidId: awarded ?? r.awardedBidId, bidsCount: (bids ?? r.bids).length, lowestBid: (bids ?? r.bids).isEmpty ? null : (bids ?? r.bids).map((b) => double.parse(b.unitPrice)).reduce((a, b) => a < b ? a : b).toStringAsFixed(2), bids: bids ?? r.bids, requesterOrgId: r.requesterOrgId, createdAt: r.createdAt);
  @override Future<Result<PartOrder>> accept(String requestId, String bidId, {String paymentTerms = 'prepaid'}) async { final r = requests[requestId]!; requests[requestId] = _with(r, status: 'awarded', awarded: bidId, bids: r.bids.map((b) => PartBid(id: b.id, supplierOrgId: b.supplierOrgId, condition: b.condition, unitPrice: b.unitPrice, quantity: b.quantity, deliveryFee: b.deliveryFee, etaHours: b.etaHours, warrantyDays: b.warrantyDays, notesAr: b.notesAr, status: b.id == bidId ? 'accepted' : 'rejected', createdAt: b.createdAt)).toList()); seq++; final o = PartOrder(id: 'po$seq', number: 'PO-2026-00077$seq', source: 'reverse_auction', status: 'pending_payment', paymentTerms: paymentTerms, supplierOrgId: 'scrap', buyerOrgId: 'ws1', total: '172.50', createdAt: DateTime(2026, 8, 19), items: const [PartOrderItem(descriptionAr: 'دسكات أمامية كامري', condition: 'used_scrapyard', quantity: 1, unitPrice: '150.00', lineTotal: '150.00', warrantyDays: 30)], invoiceId: 'inv8'); store[o.id] = o; return Result.ok(o); }
  @override Future<Result<List<PartOrder>>> orders({String? orgId, bool asSupplier = false}) async => Result.ok(store.values.toList());
  @override Future<Result<PartOrder>> order(String id) async => Result.ok(store[id]!);
  ({String orderId, int calls})? deliveryRequested; var deliveryStatus = 'requested';
  PartOrder _withDelivery(PartOrder o) => PartOrder(id: o.id, number: o.number, source: o.source, status: o.status, paymentTerms: o.paymentTerms, supplierOrgId: o.supplierOrgId, buyerOrgId: o.buyerOrgId, total: o.total, createdAt: o.createdAt, items: o.items, invoiceId: o.invoiceId, delivery: (id: 'tj-d1', number: 'TJ-2026-000090', status: deliveryStatus, price: '46.00'));
  @override Future<Result<void>> requestDelivery(String orderId) async { deliveryRequested = (orderId: orderId, calls: (deliveryRequested?.calls ?? 0) + 1); store[orderId] = _withDelivery(store[orderId]!); return const Result.ok(null); }
  @override Future<Result<void>> confirm(String orderId) async { final o = store[orderId]!; store[orderId] = PartOrder(id: o.id, number: o.number, source: o.source, status: 'confirmed', paymentTerms: o.paymentTerms, supplierOrgId: o.supplierOrgId, buyerOrgId: o.buyerOrgId, total: o.total, createdAt: o.createdAt, items: o.items); return const Result.ok(null); }
  @override Future<Result<List<TradeAccount>>> tradeAccounts({required String orgId, required bool asSeller}) async => Result.ok(tas);
  @override Future<Result<TradeAccount>> requestTradeAccount({required String sellerOrgId, required String buyerOrgId}) async => const Result.err(UnknownFailure());
  @override Future<Result<TradeAccount>> approveTradeAccount(String id, {required String creditLimit, int termsDays = 30, int discountBps = 0}) async { tas = [TradeAccount(id: id, sellerOrgId: 'dist', buyerOrgId: 'ws1', status: 'active', creditLimit: creditLimit, outstanding: '0.00', available: creditLimit, paymentTermsDays: termsDays, discountBps: discountBps, counterpartyAr: 'ورشة النور')]; return Result.ok(tas.first); }
  @override Future<Result<SerialVerify>> verify(String qrToken) async => Result.ok(SerialVerify(genuine: qrToken.startsWith('ok'), alert: false, status: 'sold', serialNumber: 'S-001', partNameAr: 'دسكات فرامل أمامية', partNumber: '04465-33471', brandAr: 'تويوتا (أصلي)', issuerAr: 'الوكيل المتحد', messageAr: qrToken.startsWith('ok') ? 'قطعة أصلية موثّقة.' : 'غير مسجّل', messageEn: 'x'));
  @override Future<Result<Warranty>> install({required String qrToken, required String workOrderItemId, int laborWarrantyDays = 180}) async { installs.add('$qrToken:$workOrderItemId:$laborWarrantyDays'); return Result.ok(Warranty(id: 'w1', number: 'WR-2026-000100', covers: 'part_and_labor', coverageAr: 'ضمان ثلاثي', startsAt: DateTime(2026, 8, 19), endsAt: DateTime(2027, 8, 19), status: 'active')); }
  @override Future<Result<List<Warranty>>> warranties({String? orgId}) async => const Result.ok([]);
  @override Future<Result<PartBid>> bid(String requestId, {required String orgId, required String condition, required String unitPrice, int quantity = 1, String deliveryFee = '0', int? etaHours, int warrantyDays = 0, String? notesAr, List<String> mediaIds = const []}) async { lastBidMedia = mediaIds; final r = requests[requestId]!; final b = PartBid(id: 'b${r.bids.length + 1}', supplierOrgId: orgId, condition: condition, unitPrice: double.parse(unitPrice).toStringAsFixed(2), quantity: quantity, deliveryFee: deliveryFee, etaHours: etaHours, warrantyDays: warrantyDays, notesAr: notesAr, status: 'submitted', createdAt: DateTime.now(), mediaIds: mediaIds); requests[requestId] = _with(r, status: 'bidding', bids: [...r.bids.where((x) => x.supplierOrgId != orgId), b]); return Result.ok(b); }
  @override Future<Result<PartOrder>> transition(String orderId, String to) async { final o = store[orderId]!; store[orderId] = PartOrder(id: o.id, number: o.number, source: o.source, status: to, paymentTerms: o.paymentTerms, supplierOrgId: o.supplierOrgId, buyerOrgId: o.buyerOrgId, total: o.total, createdAt: o.createdAt, items: o.items); return Result.ok(store[orderId]!); }
  @override Future<Result<List<InventoryItem>>> inventory(String orgId) async => const Result.ok([InventoryItem(id: 'inv1', titleAr: 'دسكات فرامل أمامية كامري — أصلي', partNumber: '04465-33471', condition: 'oem_new', price: '480.00', tradePrice: '420.00', quantity: 12, reservedQty: 1)]);
  @override Future<Result<({int issued, String batchCode})>> issueSerials({required String orgId, required String catalogId, required int count}) async => Result.ok((issued: count, batchCode: 'B1'));
  @override Future<String?> scan() async => scanned;
}
class FakeWorkshop implements WorkshopRepository {
  final String type; final String Function() org; FakeWorkshop(this.type, this.org);
  @override Future<Result<List<OrgBrief>>> myOrgs() async => Result.ok([OrgBrief(id: org(), nameAr: 'x', type: type, status: 'active')]);
  @override Future<Result<Set<String>>> invoicedWorkOrderIds(String orgId) async => const Result.ok(<String>{});
  @override Future<Result<List<WorkOrder>>> orgOrders(String orgId, {List<String>? status}) async => Result.ok([WorkOrder(id: 'wo1', number: 'WO-2026-000042', status: 'in_progress', paymentTerms: 'on_delivery', currentVersion: 1, titleAr: 'تغيير دسكات', vehicleId: 'v1', orgId: 'ws1', subtotal: '720', vatAmount: '108', total: '828', depositRequired: '0', createdAt: DateTime(2026, 8, 19), items: const [WoItem(id: 'it1', type: 'part', descriptionAr: 'دسكات أمامية أصلي', quantity: '1', unitPrice: '600', lineTotal: '600', warrantyDays: 365)])]);
  @override Future<Result<WorkOrder>> create(NewWorkOrder wo) async => const Result.err(UnknownFailure());
  @override Future<Result<WorkOrder>> addItem(String woId, NewItem item) async => const Result.err(UnknownFailure());
  @override Future<Result<WorkOrder>> removeItem(String woId, String itemId) async => const Result.err(UnknownFailure());
  @override Future<Result<WorkOrder>> transition(String woId, String to, {String? noteAr}) async => const Result.err(UnknownFailure());
  @override Future<Result<void>> requestApproval(String woId) async => const Result.err(UnknownFailure());
  int presigns = 0;
  /// كان يرفض دائماً لأن لا شاشة كانت ترفع من هنا؛ ورقة العرض صارت ترفع صور القطعة.
  @override Future<Result<Presigned>> presign({required String mimeType, required int sizeBytes, required String sha256, required String purpose}) async { presigns++; return Result.ok(Presigned(mediaId: 'media$presigns', uploadUrl: 'http://x/up/$presigns')); }
  @override Future<Result<void>> upload(Presigned p, List<int> bytes, String mimeType) async => const Result.ok(null);
  @override Future<Result<void>> inspect(String woId, NewInspection ins) async => const Result.ok(null);
  @override Future<Result<void>> attachMedia(String woId, List<String> mediaIds, {String label = 'progress'}) async => const Result.ok(null);
  @override Future<Result<String>> issueInvoice(String woId) async => const Result.err(UnknownFailure());
  @override Future<Result<OrgWallet>> wallet(String orgId) async => const Result.ok(OrgWallet(held: '0', available: '0', inTransit: '0', payouts: []));
  @override Future<Result<AbandonedStatus>> abandonedStatus(String woId) async => const Result.err(UnknownFailure());
  @override Future<Result<void>> abandonedDeclare(String woId, {String? reasonAr}) async => const Result.ok(null);
  @override Future<Result<VoiceNote>> createVoiceNote(String woId, {required String mediaId, String? hintAr}) async => const Result.err(UnknownFailure());
  @override Future<Result<void>> applyVoiceNote(String noteId, List<NewItem> items) async => const Result.ok(null);
}
class FakeTransportLive implements TransportRealtime {
  final controller = StreamController<void>.broadcast();
  @override Stream<void> changes(String jobId) => controller.stream;
}

class FakeAuth implements AuthRepository {
  final String Function() org; FakeAuth(this.org);
  @override Future<Result<({String phone, int expiresIn, String? debugCode})>> requestOtp(String phone) async => const Result.err(UnknownFailure());
  @override Future<Result<AuthSession>> verifyOtp({required String phone, required String code, required String platform}) async => const Result.err(UnknownFailure());
  @override Future<Result<Me>> me() async => Result.ok(Me(id: 'u', phone: '+966500000001', fullNameAr: 'محمد', platformRole: 'none', nafathVerified: false, orgs: [OrgMembership(org(), 'owner')]));
  @override Future<Result<Me>> setName(String fullNameAr) => me();
  @override Future<Result<void>> logout() async => const Result.ok(null);
}
Future<void> loadArabicFont() async { final loader = FontLoader('PlexArabic'); for (final f in ['Regular', 'Medium', 'SemiBold', 'Bold']) { loader.addFont(File('assets/fonts/IBMPlexSansArabic-$f.ttf').readAsBytes().then((b) => ByteData.view(b.buffer))); } await loader.load(); }

void main() {
  setUpAll(loadArabicFont);
  late FakeParts parts; late FakeTransportLive live; late MemoryTokenStore ts;
  Widget app(GoRouter router, {String orgType = 'workshop', bool dark = false}) => ProviderScope(key: UniqueKey(), overrides: [appConfigProvider.overrideWithValue(const AppConfig(flavor: AppFlavor.partner, apiBaseUrl: 'http://x', appEnv: 'test', sentryDsn: '')), tokenStoreProvider.overrideWithValue(ts), authRepositoryProvider.overrideWithValue(FakeAuth(() => parts.currentOrg)), workshopRepositoryProvider.overrideWithValue(FakeWorkshop(orgType, () => parts.currentOrg)), partsRepositoryProvider.overrideWithValue(parts), qrScannerProvider.overrideWithValue(parts), transportRealtimeProvider.overrideWithValue(live)],
    child: MaterialApp.router(theme: AppTheme.light(), darkTheme: AppTheme.dark(), themeMode: dark ? ThemeMode.dark : ThemeMode.light, locale: const Locale('ar'), supportedLocales: L10n.supportedLocales, localizationsDelegates: const [L10n.delegate, GlobalMaterialLocalizations.delegate, GlobalWidgetsLocalizations.delegate, GlobalCupertinoLocalizations.delegate], routerConfig: router));
  final fakeJpeg = Uint8List.fromList(List<int>.filled(64, 9));
  GoRouter router(String initial) => GoRouter(initialLocation: initial, routes: [GoRoute(path: '/parts', builder: (_, _) => const Scaffold(body: WorkshopPartsScreen())), GoRoute(path: '/supplier', builder: (_, _) => const Scaffold(body: SupplierRequestsScreen())), GoRoute(path: '/sales', builder: (_, _) => const Scaffold(body: SupplierSalesScreen())), GoRoute(path: '/parts/requests/:id', builder: (_, s) => PartRequestScreen(id: s.pathParameters['id']!, pickImage: () async => fakeJpeg)), GoRoute(path: '/parts/orders/:id', builder: (_, s) => PartOrderScreen(id: s.pathParameters['id']!)), GoRoute(path: '/invoices/:id', builder: (_, s) => Scaffold(body: Text('invoice ${s.pathParameters['id']}')))]);
  setUp(() async { parts = FakeParts(); live = FakeTransportLive(); ts = MemoryTokenStore(); await ts.save(access: 'a', refresh: 'r'); });
  void size(WidgetTester t) { t.view.physicalSize = const Size(1170, 2532); t.view.devicePixelRatio = 3; addTearDown(t.view.reset); }

  testWidgets('workshop: VIN search → offers (trade price with active account) → Buy Now deferred → order screen', (tester) async {
    size(tester); parts.tas = [const TradeAccount(id: 'ta1', sellerOrgId: 'dist', buyerOrgId: 'ws1', status: 'active', creditLimit: '5000.00', outstanding: '483.00', available: '4517.00', paymentTermsDays: 30, discountBps: 500, counterpartyAr: 'الوكيل المتحد')];
    await tester.pumpWidget(app(router('/parts'))); await tester.pumpAndSettle();
    expect(find.text('الحساب الآجل المضمون'), findsOneWidget); expect(find.textContaining('4,517.00'), findsOneWidget);
    await tester.enterText(find.byType(TextField).first, '4T1B11HK5KU123456'); await tester.testTextInput.receiveAction(TextInputAction.done); await tester.pumpAndSettle();
    expect(find.text('تويوتا كامري 2019'), findsOneWidget); expect(find.textContaining('دسكات فرامل أمامية كامري'), findsWidgets); expect(find.text('سعر الورش'), findsOneWidget);
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/workshop_parts_light.png'));
    await tester.tap(find.text('اشترِ الآن').first); await tester.pumpAndSettle();
    expect(find.text('آجل على الحساب المضمون — يصدر سند لأمر'), findsOneWidget);
    await tester.tap(find.textContaining('اشترِ الآن · 483.00')); await tester.pumpAndSettle();
    expect(parts.store.length, 1); expect(parts.store.values.first.paymentTerms, 'deferred'); expect(find.textContaining('PO-2026-000771'), findsWidgets); expect(find.text('مدفوع'), findsWidgets);
  });
  testWidgets('auction: workshop opens a request → supplier bids → workshop accepts → order; supplier inbox shows hot request', (tester) async {
    size(tester);
    await tester.pumpWidget(app(router('/parts'))); await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).first, '4T1B11HK5KU123456'); await tester.testTextInput.receiveAction(TextInputAction.done); await tester.pumpAndSettle();
    await tester.tap(find.text('اطلب بالمزاد العكسي').first); await tester.pumpAndSettle();
    await tester.enterText(find.widgetWithText(TextField, 'اسم القطعة'), 'دسكات أمامية كامري'); await tester.tap(find.text('أرسل الطلب')); await tester.pumpAndSettle();
    expect(parts.requests.length, 1); final rid = parts.requests.keys.first; expect(find.text('لم تصل عروض بعد — ننبّه المورّدين القريبين.'), findsOneWidget);
    // supplier side
    parts.currentOrg = 'scrap';
    await tester.pumpWidget(app(router('/supplier'), orgType: 'scrapyard')); await tester.pumpAndSettle();
    expect(find.text('دسكات أمامية كامري'), findsWidgets); expect(find.text('قدّم عرضك'), findsWidgets);
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/supplier_requests_light.png'));
    await tester.tap(find.text('قدّم عرضك').first); await tester.pumpAndSettle();
    await tester.tap(find.text('قدّم عرضك').last); await tester.pumpAndSettle(); // request screen primary → bid sheet
    await tester.enterText(find.widgetWithText(TextField, 'سعرك'), '150');
    // القطعة المستعملة تُشترى بالعين: المورّد يصوّرها، والخادم يقبل ستّ صور منذ زمن ولم يكن أحد يرسلها.
    await tester.tap(find.text('صوّر القطعة')); await tester.pumpAndSettle();
    await tester.tap(find.text('قدّم عرضك').last); await tester.pumpAndSettle();
    expect(parts.requests[rid]!.bids.length, 1); expect(parts.requests[rid]!.bids.first.supplierOrgId, 'scrap'); expect(find.text('أُرسل عرضك — سنخبرك عند القبول'), findsWidgets);
    expect(parts.lastBidMedia, hasLength(1), reason: 'الصورة رُفعت وسافرت مع العرض');
    // requester accepts
    parts.currentOrg = 'ws1';
    await tester.pumpWidget(app(router('/parts/requests/$rid'))); await tester.pumpAndSettle();
    expect(find.text('اقبل هذا العرض'), findsOneWidget);
    expect(find.byType(MediaStrip), findsWidgets, reason: 'المشتري يرى صورة القطعة تحت العرض لا خلف نقرة');
    await tester.tap(find.text('اقبل هذا العرض')); await tester.pumpAndSettle(); await tester.tap(find.text('اقبل هذا العرض').last); await tester.pumpAndSettle();
    expect(parts.requests[rid]!.status, 'awarded'); expect(parts.store.length, 1); expect(find.text('بانتظار الدفع'), findsWidgets); expect(find.text('ادفع الآن'), findsOneWidget);
  });
  testWidgets('QR install: scan → genuine → pick WO part item → installed → warranty number shown', (tester) async {
    size(tester); parts.scanned = 'ok-token-123';
    await tester.pumpWidget(app(router('/parts'))); await tester.pumpAndSettle();
    // QR moved into the quiet «أدواتي» group at the foot of the tab (the tab shows ONE task now).
    await tester.scrollUntilVisible(find.text('امسح QR القطعة'), 300, scrollable: find.byType(Scrollable).first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('امسح QR القطعة')); await tester.pumpAndSettle();
    expect(find.text('قطعة أصلية موثّقة'), findsOneWidget);
    await tester.tap(find.text('دسكات أمامية أصلي')); await tester.pumpAndSettle();
    await tester.tap(find.text('ركّبها في أمر العمل')); await tester.pumpAndSettle();
    expect(parts.installs, ['ok-token-123:it1:180']); expect(find.textContaining('WR-2026-000100'), findsOneWidget);
  });
  testWidgets('distributor sales: trade account pending → approve sheet → active; dark golden', (tester) async {
    size(tester); parts.tas = [const TradeAccount(id: 'ta1', sellerOrgId: 'dist', buyerOrgId: 'ws1', status: 'pending', creditLimit: '0.00', outstanding: '0.00', available: '0.00', paymentTermsDays: 30, discountBps: 0, counterpartyAr: 'ورشة النور')];
    await tester.pumpWidget(app(router('/sales'), orgType: 'parts_distributor', dark: true)); await tester.pumpAndSettle();
    expect(find.text('حسابات آجلة'), findsWidgets); expect(find.text('اعتمد الحساب (1)'), findsOneWidget);
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/supplier_sales_dark.png'));
    await tester.tap(find.text('اعتمد الحساب (1)')); await tester.pumpAndSettle(); await tester.tap(find.text('اعتمد الحساب').last); await tester.pumpAndSettle();
    expect(parts.tas.first.status, 'active'); expect(find.text('اعتمد الحساب (1)'), findsNothing);
  });

  testWidgets('platform delivery: the supplier sends it, and the manual ship/deliver buttons leave', (tester) async {
    size(tester);
    parts.store['po9'] = PartOrder(id: 'po9', number: 'PO-2026-000099', source: 'catalog_buy_now', status: 'paid', paymentTerms: 'prepaid', supplierOrgId: 'ws1', buyerOrgId: 'buyer', total: '483.00', createdAt: DateTime(2026, 8, 22, 10), items: const [PartOrderItem(descriptionAr: 'دسكات فرامل أمامية', condition: 'oem_new', quantity: 1, unitPrice: '420.00', lineTotal: '420.00', warrantyDays: 365)]);
    await tester.pumpWidget(app(router('/parts/orders/po9'))); await tester.pumpAndSettle();
    expect(find.text('أرسلها بتوصيل المنصة'), findsOneWidget);
    await tester.tap(find.text('أرسلها بتوصيل المنصة')); await tester.pumpAndSettle();
    expect(parts.deliveryRequested!.orderId, 'po9');
    expect(find.text('توصيل المنصة'), findsOneWidget);                    // the tracking card appeared
    expect(find.textContaining('TJ-2026-000090'), findsOneWidget);
    expect(find.text('جهّز الطلب'), findsNothing);                        // and the manual path is gone:
    expect(find.text('شُحنت'), findsNothing);                              // the order follows the driver now
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/part_delivery_light.png'));
  });

  testWidgets('the order follows the driver: a channel tick advances what the screen shows', (tester) async {
    size(tester);
    parts.store['po9'] = PartOrder(id: 'po9', number: 'PO-2026-000099', source: 'catalog_buy_now', status: 'paid', paymentTerms: 'prepaid', supplierOrgId: 'ws1', buyerOrgId: 'buyer', total: '483.00', createdAt: DateTime(2026, 8, 22, 10), items: const [], delivery: (id: 'tj-d1', number: 'TJ-2026-000090', status: 'assigned', price: '46.00'));
    await tester.pumpWidget(app(router('/parts/orders/po9'))); await tester.pumpAndSettle();
    // The timeline always lists every step; what moves is the badge — the journey's current state.
    expect(find.text('تم تعيين سائق'), findsWidgets);
    parts.deliveryStatus = 'picked_up';
    parts.store['po9'] = parts._withDelivery(parts.store['po9']!);        // the driver picked it up…
    live.controller.add(null);                                            // …and the channel ticks
    await tester.pumpAndSettle();
    expect(find.text('القطعة مع السائق'), findsWidgets);                       // the journey moved with no user action
  });
}
