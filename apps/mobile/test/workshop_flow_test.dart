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
import 'package:sinaaty/features/billing/domain/billing.dart';
import 'package:sinaaty/features/billing/domain/billing_repository.dart';
import 'package:sinaaty/features/billing/presentation/providers.dart';
import 'package:sinaaty/features/work_orders/domain/work_order.dart';
import 'package:sinaaty/features/work_orders/domain/work_orders_repository.dart';
import 'package:sinaaty/features/work_orders/presentation/providers.dart';
import 'package:sinaaty/features/workshop/domain/workshop.dart';
import 'package:sinaaty/features/workshop/domain/workshop_repository.dart';
import 'package:sinaaty/features/workshop/presentation/inspection_screen.dart';
import 'package:sinaaty/features/workshop/presentation/new_order_screen.dart';
import 'package:sinaaty/features/workshop/presentation/order_screen.dart';
import 'package:sinaaty/features/workshop/presentation/providers.dart';
import 'package:sinaaty/features/workshop/presentation/today_screen.dart';

/// In-memory workshop backend: one org, orders with the real transition rules the app relies on. `offline` makes every call fail with NetworkFailure.
class FakeBackend implements WorkshopRepository, WorkOrdersRepository, WorkOrderRealtime, PendingActions {
  bool offline = false; final orders = <String, WorkOrder>{}; final history = <String, List<WoHistory>>{}; final inspections = <String, List<WoInspection>>{}; final media = <String, List<WoMedia>>{}; final invoices = <Invoice>[]; final queue = <PendingAction>[]; int seq = 0; final transitions = <String>[]; final presigned = <String>[]; final uploaded = <String>[];
  Future<Result<T>> _g<T>(T Function() f) async { if (offline) return const Result.err(NetworkFailure()); return Result.ok(f()); }
  WorkOrder _set(WorkOrder w) { orders[w.id] = w; return w; }
  WorkOrder _st(WorkOrder w, String s) { history.putIfAbsent(w.id, () => []).add(WoHistory(from: w.status, to: s, at: DateTime(2026, 8, 18, 9, history[w.id]!.length))); return _set(WorkOrder(id: w.id, number: w.number, status: s, paymentTerms: w.paymentTerms, currentVersion: w.currentVersion, titleAr: w.titleAr, vehicleId: w.vehicleId, orgId: w.orgId, subtotal: w.subtotal, vatAmount: w.vatAmount, total: w.total, depositRequired: w.depositRequired, createdAt: w.createdAt, items: w.items)); }
  @override Future<Result<List<OrgBrief>>> myOrgs() => _g(() => const [OrgBrief(id: 'org1', nameAr: 'ورشة النور', type: 'workshop', status: 'active')]);
  @override Future<Result<List<WorkOrder>>> orgOrders(String orgId, {List<String>? status}) => _g(() => orders.values.toList());
  @override Future<Result<WorkOrder>> create(NewWorkOrder n) => _g(() { seq++; final sub = n.items.fold<double>(0, (a, i) => a + double.parse(i.unitPrice) * double.parse(i.quantity)); final w = WorkOrder(id: 'wo$seq', number: 'WO-2026-00004$seq', status: 'draft', paymentTerms: n.paymentTerms, currentVersion: 0, titleAr: n.titleAr, vehicleId: 'v1', orgId: n.orgId, subtotal: sub.toStringAsFixed(2), vatAmount: (sub * .15).toStringAsFixed(2), total: (sub * 1.15).toStringAsFixed(2), depositRequired: '0', createdAt: DateTime(2026, 8, 18, 8), items: [for (final (i, it) in n.items.indexed) WoItem(id: 'i$i', type: it.type, descriptionAr: it.descriptionAr, quantity: it.quantity, unitPrice: it.unitPrice, lineTotal: (double.parse(it.unitPrice) * double.parse(it.quantity)).toStringAsFixed(2), warrantyDays: it.warrantyDays)]); history[w.id] = [WoHistory(to: 'draft', at: w.createdAt)]; return _set(w); });
  final addedItems = <NewItem>[];
  @override Future<Result<WorkOrder>> addItem(String woId, NewItem item) => _g(() { addedItems.add(item); return orders[woId]!; });
  @override Future<Result<WorkOrder>> removeItem(String woId, String itemId) => _g(() => orders[woId]!);
  @override Future<Result<WorkOrder>> transition(String woId, String to, {String? noteAr}) => _g(() { transitions.add('$woId:$to'); return _st(orders[woId]!, to); });
  @override Future<Result<void>> requestApproval(String woId) => _g(() { _st(orders[woId]!, 'awaiting_approval'); });
  @override Future<Result<Presigned>> presign({required String mimeType, required int sizeBytes, required String sha256, required String purpose}) => _g(() { final id = 'm${presigned.length + 1}'; presigned.add(id); return Presigned(mediaId: id, uploadUrl: 'mock://$id'); });
  @override Future<Result<void>> upload(Presigned p, List<int> bytes, String mimeType) => _g(() { uploaded.add(p.mediaId); });
  @override Future<Result<void>> inspect(String woId, NewInspection ins) => _g(() { inspections.putIfAbsent(woId, () => []).add(WoInspection(id: 'ins1', type: ins.type, odometerKm: ins.odometerKm, damagesCount: ins.damages.length, mediaIds: ins.mediaIds, performedAt: DateTime(2026, 8, 18, 9, 10))); final w = orders[woId]!; _st(w, 'received'); _st(orders[woId]!, 'inspecting'); });
  @override Future<Result<void>> attachMedia(String woId, List<String> mediaIds, {String label = 'progress'}) => _g(() { media.putIfAbsent(woId, () => []).addAll(mediaIds.map((m) => WoMedia(mediaId: m, mimeType: 'image/jpeg', label: label))); });
  @override Future<Result<Set<String>>> invoicedWorkOrderIds(String orgId) => _g(() => {for (final i in invoices) i.workOrderId!});
  @override Future<Result<String>> issueInvoice(String woId) => _g(() { final w = orders[woId]!; final inv = Invoice(id: 'inv${invoices.length + 1}', number: 'INV-2026-00000${invoices.length + 1}', type: 'simplified_tax', status: 'issued', workOrderId: woId, sellerNameAr: 'ورشة النور', subtotal: w.subtotal, vatTotal: w.vatAmount, total: w.total, paidTotal: '0', paymentTerms: w.paymentTerms, lines: const []); invoices.add(inv); return inv.id; });
  @override Future<Result<OrgWallet>> wallet(String orgId) => _g(() => const OrgWallet(held: '1368.50', available: '3940.00', inTransit: '0', payouts: []));
  AbandonedStatus? abandoned; String? declaredReason;
  VoiceNote voiceNoteResult = const VoiceNote(id: 'vn1'); ({String woId, String mediaId, String? hint})? lastVoiceNote; List<NewItem>? lastApplied; bool failVoiceNote = false;
  @override Future<Result<VoiceNote>> createVoiceNote(String woId, {required String mediaId, String? hintAr}) async { if (failVoiceNote) return const Result.err(NetworkFailure()); lastVoiceNote = (woId: woId, mediaId: mediaId, hint: hintAr); return Result.ok(voiceNoteResult); }
  @override Future<Result<void>> applyVoiceNote(String noteId, List<NewItem> items) async { lastApplied = items; return const Result.ok(null); }
  @override Future<Result<AbandonedStatus>> abandonedStatus(String woId) async => abandoned != null ? Result.ok(abandoned!) : const Result.err(UnknownFailure());
  @override Future<Result<void>> abandonedDeclare(String woId, {String? reasonAr}) async { declaredReason = reasonAr ?? ''; final a = abandoned!; abandoned = AbandonedStatus(status: 'abandoned', daysReady: a.daysReady, steps: a.steps, storageAmount: a.storageAmount, perDay: a.perDay, freeDays: a.freeDays, chargeableDays: a.chargeableDays, canDeclare: false); orders['wo1'] = orders['wo1']!; return const Result.ok(null); }
  // customer-side ports reused by the shared screens
  @override Future<Result<List<WorkOrder>>> list() => _g(() => orders.values.toList());
  @override Future<Result<WorkOrder>> get(String id) => _g(() => orders[id]!);
  @override Future<Result<WoTimeline>> timeline(String id) => _g(() => WoTimeline(status: orders[id]!.status, history: history[id] ?? [], versions: const [], inspections: inspections[id] ?? [], media: media[id] ?? []));
  @override Future<Result<WoVersion>> version(String id, int version) async => const Result.err(UnknownFailure());
  @override Future<Result<ApproveInit>> approveInit(String id, {required String method, int? version}) async => const Result.err(UnknownFailure());
  @override Future<Result<WorkOrder>> approveComplete(String id, {required String method, int? version, String? transactionId, String? code}) async => const Result.err(UnknownFailure());
  @override Future<Result<WorkOrder>> cancel(String id, String reasonAr) => _g(() => _st(orders[id]!, 'cancelled'));
  @override Future<Result<void>> confirmReceipt(String id) => _g(() {});
  @override Future<Result<InspectionDiff>> inspectionDiff(String id) async => Result.ok(InspectionDiff(
    comparable: true, summaryAr: 'لا توجد أضرار جديدة مقارنة بالاستلام.',
    appeared: const [], worsened: const [], repaired: const [],
    unchanged: const [DamageEntry(zone: 'front_bumper', zoneAr: 'الصدام الأمامي', severity: 'minor', noteAr: 'خدش قديم', mediaIds: [], source: 'inspector')],
    checkInAt: DateTime(2026, 8, 18, 9), checkOutAt: DateTime(2026, 8, 20, 15),
    checkInPhotos: const ['a', 'b'], checkOutPhotos: const ['c'],
  ));
  @override Stream<void> changes(String workOrderId) => const Stream.empty();
  Future<Result<Invoice>> invoice(String id) => _g(() => invoices.firstWhere((i) => i.id == id));
  Future<Result<PaymentIntent>> createPayment(String invoiceId, String method) async => const Result.err(UnknownFailure());
  Future<Result<void>> mockPay(String paymentId) async => const Result.err(UnknownFailure());
  Future<Result<List<PromissoryNote>>> notes() async => const Result.ok([]);
  Future<Result<PromissoryNote>> note(String id) async => const Result.err(UnknownFailure());
  @override Future<List<PendingAction>> all() async => List.of(queue);
  @override Future<void> add(PendingAction a) async => queue.add(a);
  @override Future<void> remove(String id) async => queue.removeWhere((a) => a.id == id);
}
class FakeAuth implements AuthRepository {
  @override Future<Result<({String phone, int expiresIn, String? debugCode})>> requestOtp(String phone) async => const Result.err(UnknownFailure());
  @override Future<Result<AuthSession>> verifyOtp({required String phone, required String code, required String platform, required String flavor}) async => const Result.err(UnknownFailure());
  @override Future<Result<void>> registerPushToken(String token, {required String platform, required String flavor}) async => const Result.ok(null);
  @override Future<Result<Me>> me() async => const Result.ok(Me(id: 'u', phone: '+966500000001', fullNameAr: 'محمد', platformRole: 'none', nafathVerified: false, orgs: [OrgMembership('org1', 'owner')]));
  @override Future<Result<Me>> setName(String fullNameAr) async => const Result.err(UnknownFailure());
  @override Future<Result<void>> logout() async => const Result.ok(null);
}
Future<void> loadArabicFont() async { final loader = FontLoader('PlexArabic'); for (final f in ['Regular', 'Medium', 'SemiBold', 'Bold']) { loader.addFont(File('assets/fonts/IBMPlexSansArabic-$f.ttf').readAsBytes().then((b) => ByteData.view(b.buffer))); } await loader.load(); }
// tiny valid 1x1 JPEG-ish bytes are not needed: Image.memory has an errorBuilder; use PNG header-less bytes.
final fakeJpeg = Uint8List.fromList(List<int>.generate(64, (i) => i));

void main() {
  setUpAll(loadArabicFont);
  late FakeBackend be; late MemoryTokenStore ts;
  Widget app(GoRouter router, {bool dark = false}) => ProviderScope(overrides: [
    appConfigProvider.overrideWithValue(const AppConfig(flavor: AppFlavor.partner, apiBaseUrl: 'http://x', appEnv: 'test', sentryDsn: '')), tokenStoreProvider.overrideWithValue(ts),
    authRepositoryProvider.overrideWithValue(FakeAuth()), workshopRepositoryProvider.overrideWithValue(be), workOrdersRepositoryProvider.overrideWithValue(be), workOrderRealtimeProvider.overrideWithValue(be), billingRepositoryProvider.overrideWithValue(_Billing(be)), pendingActionsProvider.overrideWithValue(be),
  ], child: MaterialApp.router(theme: AppTheme.light(), darkTheme: AppTheme.dark(), themeMode: dark ? ThemeMode.dark : ThemeMode.light, locale: const Locale('ar'), supportedLocales: L10n.supportedLocales, localizationsDelegates: const [L10n.delegate, GlobalMaterialLocalizations.delegate, GlobalWidgetsLocalizations.delegate, GlobalCupertinoLocalizations.delegate], routerConfig: router));
  GoRouter router(String initial) => GoRouter(initialLocation: initial, routes: [
    GoRoute(path: '/', builder: (_, _) => const Scaffold(body: TodayScreen())),
    GoRoute(path: '/ws/new', builder: (_, _) => const NewOrderScreen()),
    GoRoute(path: '/ws/orders', builder: (_, _) => const Scaffold(body: Text('orders'))),
    GoRoute(path: '/ws/orders/:id', builder: (_, s) => WorkshopOrderScreen(id: s.pathParameters['id']!, pickImage: () async => fakeJpeg), routes: [GoRoute(path: 'inspect', builder: (_, s) => InspectionScreen(id: s.pathParameters['id']!, pickImage: () async => fakeJpeg))]),
    GoRoute(path: '/invoices/:id', builder: (_, s) => Scaffold(body: Text('invoice ${s.pathParameters['id']}'))),
  ]);
  setUp(() async { be = FakeBackend(); ts = MemoryTokenStore(); await ts.save(access: 'a', refresh: 'r'); });
  void size(WidgetTester t) { t.view.physicalSize = const Size(1170, 2532); t.view.devicePixelRatio = 3; addTearDown(t.view.reset); }

  testWidgets('workshop happy path: new order → receive → 8-angle check-in → request approval → (customer approves) → start → QC → ready → invoice → deliver', (tester) async {
    size(tester); await tester.pumpWidget(app(router('/ws/new'))); await tester.pumpAndSettle();
    await tester.enterText(find.widgetWithText(TextField, 'جوال العميل'), '0512345678');
    await tester.enterText(find.widgetWithText(TextField, 'رقم اللوحة'), 'أ ب ج 4821');
    // لا نكتب وصفاً: الحقل صار اختيارياً والأمر يُسمّى ببنوده — حقلٌ أقل في كل سيارة تدخل الورشة.
    // البند بسطر واحد كما يكتبه صاحب الورشة — لا ورقة ولا خمسة حقول.
    await tester.enterText(find.widgetWithText(TextField, 'أضف بنداً بسطر'), 'سمكرة ودهان رفرف أمامي بسعر 650');
    await tester.pumpAndSettle();
    expect(find.text('سمكرة ودهان'), findsWidgets, reason: 'النوع يُستنتج ويُعرض قبل الإضافة');
    await tester.tap(find.byIcon(Icons.add_circle)); await tester.pumpAndSettle();
    expect(find.textContaining('747.50'), findsWidgets); // 650 × 1.15
    await tester.tap(find.textContaining('إنشاء الأمر')); await tester.pumpAndSettle();
    expect(find.text('أدخل رقم جوال سعودي صحيح.'), findsNothing, reason: 'form rejected');
    expect(be.orders.length, 1); final id = be.orders.keys.first;
    expect(be.orders[id]!.titleAr, 'سمكرة ودهان رفرف أمامي', reason: 'الاسم التلقائي من البند الوحيد'); expect(find.textContaining('WO-2026-000041'), findsWidgets);
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/workshop_order_light.png'));
    // draft → received
    await tester.tap(find.text('استلام السيارة')); await tester.pumpAndSettle(); expect(be.orders[id]!.status, 'received');
    // check-in
    await tester.tap(find.text('فحص الاستلام')); await tester.pumpAndSettle();
    for (var i = 0; i < 8; i++) { await tester.tap(find.textContaining('صوّر الزاوية التالية')); await tester.pumpAndSettle(); }
    expect(be.presigned.length, 8); expect(be.uploaded.length, 8); expect(find.text('8 / 8'), findsOneWidget);
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/workshop_inspection_light.png'));
    await tester.enterText(find.widgetWithText(TextField, 'العدّاد'), '84250');
    await tester.tap(find.text('حفظ فحص الاستلام')); await tester.pumpAndSettle();
    expect(be.orders[id]!.status, 'inspecting'); expect(be.inspections[id]!.single.mediaIds.length, 8);
    // request approval → customer approves (simulated) → start
    await tester.tap(find.text('أرسل للعميل للاعتماد')); await tester.pumpAndSettle(); expect(be.orders[id]!.status, 'awaiting_approval'); expect(find.textContaining('بانتظار اعتماد العميل'), findsWidgets);
    be._st(be.orders[id]!, 'approved'); await tester.drag(find.byType(ListView).first, const Offset(0, 300)); await tester.pumpAndSettle();
    await tester.tap(find.text('ابدأ العمل')); await tester.pumpAndSettle(); expect(be.orders[id]!.status, 'in_progress');
    await tester.tap(find.text('إلى فحص الجودة')); await tester.pumpAndSettle(); await tester.tap(find.text('جاهزة للاستلام')); await tester.pumpAndSettle(); expect(be.orders[id]!.status, 'ready');
    await tester.tap(find.text('إصدار الفاتورة')); await tester.pumpAndSettle(); expect(be.invoices.length, 1); expect(find.text('invoice inv1'), findsOneWidget);
    GoRouter.of(tester.element(find.text('invoice inv1'))).pop(); await tester.pumpAndSettle();
    await tester.tap(find.text('تم التسليم')); await tester.pumpAndSettle(); expect(be.orders[id]!.status, 'delivered');
  });

  testWidgets('offline → online: status update and photo are queued while offline, then synced in order', (tester) async {
    size(tester);
    await be.create(const NewWorkOrder(orgId: 'org1', plate: 'x', customerPhone: '+966512345678', titleAr: 'فرامل', paymentTerms: 'on_delivery', items: [NewItem(type: 'labor', descriptionAr: 'فرامل', unitPrice: '300')]));
    be._st(be.orders['wo1']!, 'approved');
    await tester.pumpWidget(app(router('/ws/orders/wo1'))); await tester.pumpAndSettle();
    be.offline = true;
    await tester.tap(find.text('ابدأ العمل')); await tester.pumpAndSettle();
    expect(find.text('بلا إنترنت — سيُرسل تلقائياً عند عودة الاتصال'), findsOneWidget); expect(be.queue.length, 1); expect(be.transitions, isEmpty);
    // photo while offline: presign itself needs network → surfaces the network message; the attach action is what gets queued when presign succeeded earlier.
    be.offline = false; final pre = await be.presign(mimeType: 'image/jpeg', sizeBytes: 1, sha256: 'a', purpose: 'work_order'); be.offline = true;
    final container = ProviderScope.containerOf(tester.element(find.byType(WorkshopOrderScreen)));
    final r = await container.read(syncControllerProvider.notifier).run('attach_media', {'woId': 'wo1', 'mediaIds': [pre.valueOrNull!.mediaId], 'label': 'progress'});
    expect(r.queued, isTrue); expect(be.queue.length, 2);
    // back online → sync replays in order
    be.offline = false; final done = await container.read(syncControllerProvider.notifier).sync();
    expect(done, 2); expect(be.queue, isEmpty); expect(be.transitions, ['wo1:in_progress']); expect(be.orders['wo1']!.status, 'in_progress'); expect(be.media['wo1']!.single.mediaId, 'm1');
  });

  testWidgets('today: KPIs + needs-action hero + list (light/dark goldens)', (tester) async {
    size(tester);
    await be.create(const NewWorkOrder(orgId: 'org1', plate: 'x', customerPhone: '+966512345678', titleAr: 'سمكرة رفرف أمامي', paymentTerms: 'deferred', items: [NewItem(type: 'labor', descriptionAr: 'سمكرة', unitPrice: '1190')]));
    await be.create(const NewWorkOrder(orgId: 'org1', plate: 'y', customerPhone: '+966512345679', titleAr: 'فرامل باترول', paymentTerms: 'on_delivery', items: [NewItem(type: 'part', descriptionAr: 'دسكات', unitPrice: '420')]));
    be._st(be.orders['wo1']!, 'approved'); be._st(be.orders['wo2']!, 'awaiting_approval');
    await tester.pumpWidget(app(router('/'))); await tester.pumpAndSettle();
    expect(find.textContaining('يحتاج تصرّفك الآن'), findsOneWidget);   // the car leads the hero now; the phrase moved below it expect(find.text('ابدأ العمل'), findsOneWidget); expect(find.text('2'), findsWidgets);
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/workshop_today_light.png'));
    await tester.pumpWidget(app(router('/'), dark: true)); await tester.pumpAndSettle();
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/workshop_today_dark.png'));
  });
}
/// BillingRepository facade over the fake (invoices list is a getter there).
class _Billing implements BillingRepository {
  final FakeBackend be; _Billing(this.be);
  @override Future<Result<List<Invoice>>> invoices() async => Result.ok(List.of(be.invoices));
  @override Future<Result<Invoice>> invoice(String id) => be.invoice(id);
  @override Future<Result<PaymentIntent>> createPayment(String invoiceId, String method) => be.createPayment(invoiceId, method);
  @override Future<Result<void>> mockPay(String paymentId) => be.mockPay(paymentId);
  @override Future<Result<List<PromissoryNote>>> notes() => be.notes();
  @override Future<Result<PromissoryNote>> note(String id) => be.note(id);
}
