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
import 'package:sinaaty/features/billing/presentation/invoice_screen.dart';
import 'package:sinaaty/features/billing/presentation/providers.dart';
import 'package:sinaaty/features/vehicles/domain/vehicle.dart';
import 'package:sinaaty/features/vehicles/domain/vehicles_repository.dart';
import 'package:sinaaty/features/vehicles/presentation/providers.dart';
import 'package:sinaaty/features/vehicles/presentation/vehicles_screen.dart';
import 'package:sinaaty/features/work_orders/domain/work_order.dart';
import 'package:sinaaty/features/work_orders/domain/work_orders_repository.dart';
import 'package:sinaaty/features/work_orders/presentation/approve_screen.dart';
import 'package:sinaaty/features/work_orders/presentation/inspection_diff_screen.dart';
import 'package:sinaaty/features/work_orders/presentation/providers.dart';
import 'package:sinaaty/features/work_orders/presentation/work_order_screen.dart';

/// Step 13 verify: approve (OTP) → invoice → pay, against in-memory repositories (same shapes as the API).
class FakeWorkOrders implements WorkOrdersRepository, WorkOrderRealtime {
  @override Future<Result<MyReview?>> myReview(String workOrderId) async => const Result.ok(null);
  @override Future<Result<void>> submitReview(String workOrderId, {required int rating, String? commentAr}) async => const Result.ok(null);

  String status = 'awaiting_approval'; String? lastMethod; String? lastCode; String? signedMethod;
  WorkOrder get wo => WorkOrder(id: 'wo1', number: 'WO-2026-000042', status: status, paymentTerms: 'on_delivery', currentVersion: 1, titleAr: 'سمكرة رفرف', vehicleId: 'v1', orgId: 'o1', subtotal: '1190.00', vatAmount: '178.50', total: '1368.50', depositRequired: '0', createdAt: DateTime(2026, 8, 18), items: const [WoItem(id: 'i1', type: 'labor', descriptionAr: 'سمكرة ودهان رفرف أمامي أيمن', quantity: '1', unitPrice: '650.00', lineTotal: '650.00', warrantyDays: 0), WoItem(id: 'i2', type: 'part', descriptionAr: 'دسكات أمامية — أصلي', quantity: '1', unitPrice: '420.00', lineTotal: '420.00', warrantyDays: 365), WoItem(id: 'i3', type: 'labor', descriptionAr: 'أجور فك وتركيب', quantity: '1', unitPrice: '120.00', lineTotal: '120.00', warrantyDays: 0)]);
  @override Future<Result<List<WorkOrder>>> list() async => Result.ok([wo]);
  @override Future<Result<WorkOrder>> get(String id) async => Result.ok(wo);
  @override Future<Result<WoTimeline>> timeline(String id) async => Result.ok(WoTimeline(status: status, history: [WoHistory(to: 'received', at: DateTime(2026, 8, 18, 9)), WoHistory(from: 'received', to: 'inspecting', at: DateTime(2026, 8, 18, 9, 20)), WoHistory(from: 'inspecting', to: 'awaiting_approval', at: DateTime(2026, 8, 18, 10)), if (status != 'awaiting_approval') WoHistory(from: 'awaiting_approval', to: status, at: DateTime(2026, 8, 18, 11))], versions: [WoVersionSummary(version: 1, sha256: 'a' * 64, signed: status != 'awaiting_approval', createdAt: DateTime(2026, 8, 18, 10), signedMethod: signedMethod)], inspections: [WoInspection(id: 'ins1', type: 'check_in', odometerKm: 84250, damagesCount: 1, mediaIds: const ['m1', 'm2', 'm3'], performedAt: DateTime(2026, 8, 18, 9, 10))], media: const [WoMedia(mediaId: 'm1', mimeType: 'image/jpeg'), WoMedia(mediaId: 'm2', mimeType: 'image/jpeg'), WoMedia(mediaId: 'm3', mimeType: 'image/jpeg')]));
  @override Future<Result<WoVersion>> version(String id, int version) async => Result.ok(WoVersion(version: 1, sha256: 'a' * 64, signed: false, orgNameAr: 'ورشة النور للسمكرة والميكانيكا', vehicleLine: 'تويوتا كامري 2019 · أ ب ج 4821', paymentTerms: 'on_delivery', depositRequired: '0', items: [for (final i in wo.items) (descriptionAr: i.descriptionAr, quantity: i.quantity, unitPrice: i.unitPrice, lineTotal: i.lineTotal, warrantyDays: i.warrantyDays)], subtotal: '1190.00', vat: '178.50', total: '1368.50'));
  @override Future<Result<ApproveInit>> approveInit(String id, {required String method, int? version}) async { lastMethod = method; return ApproveInit(method: method, version: 1, debugCode: method == 'otp' ? '123456' : null, transactionId: method == 'nafath' ? 'tx1' : null, random: '42').let(Result.ok); }
  @override Future<Result<WorkOrder>> approveComplete(String id, {required String method, int? version, String? transactionId, String? code}) async { lastCode = code; if (method == 'otp' && code != '123456') return const Result.err(ApiFailure(400, 'OTP_INVALID', 'رمز غير صحيح', 'Invalid code')); status = 'in_progress'; return Result.ok(wo); }
  @override Future<Result<WorkOrder>> cancel(String id, String reasonAr) async { status = 'cancelled'; return Result.ok(wo); }
  @override Future<Result<void>> confirmReceipt(String id) async { status = 'closed'; return const Result.ok(null); }
  InspectionDiff diff = InspectionDiff(
    comparable: true, summaryAr: 'لا توجد أضرار جديدة مقارنة بالاستلام.',
    appeared: const [], worsened: const [], repaired: const [],
    unchanged: const [DamageEntry(zone: 'front_bumper', zoneAr: 'الصدام الأمامي', severity: 'minor', noteAr: 'خدش قديم', mediaIds: [], source: 'inspector')],
    checkInAt: DateTime(2026, 8, 18, 9), checkOutAt: DateTime(2026, 8, 20, 15),
    checkInPhotos: const ['a', 'b'], checkOutPhotos: const ['c'],
  );
  @override Future<Result<InspectionDiff>> inspectionDiff(String id) async => Result.ok(diff);
  @override Stream<void> changes(String workOrderId) => const Stream.empty();
}
extension<T> on T { R let<R>(R Function(T) f) => f(this); }
class FakeBilling implements BillingRepository {
  String status = 'issued'; String paid = '0.00'; final paidIds = <String>[];
  /// يحاكي انقطاع الطريق **بعد** إنشاء العملية على الخادم — أخطر لحظةٍ في مسار المال.
  bool confirmFails = false;
  Invoice get inv => Invoice(id: 'inv1', number: 'INV-2026-000007', type: 'simplified_tax', status: status, workOrderId: 'wo1', sellerNameAr: 'ورشة النور للسمكرة والميكانيكا', subtotal: '1190.00', vatTotal: '178.50', total: '1368.50', paidTotal: paid, paymentTerms: 'on_delivery', issueDate: DateTime(2026, 8, 18), lines: const [InvoiceLine(descriptionAr: 'سمكرة ودهان رفرف أمامي أيمن', quantity: '1', unitPrice: '650.00', vatAmount: '97.50', lineTotal: '747.50'), InvoiceLine(descriptionAr: 'دسكات أمامية — أصلي', quantity: '1', unitPrice: '420.00', vatAmount: '63.00', lineTotal: '483.00'), InvoiceLine(descriptionAr: 'أجور فك وتركيب', quantity: '1', unitPrice: '120.00', vatAmount: '18.00', lineTotal: '138.00')]);
  @override Future<Result<List<Invoice>>> invoices() async => Result.ok([inv]);
  @override Future<Result<Invoice>> invoice(String id) async => Result.ok(inv);
  @override Future<Result<PaymentIntent>> createPayment(String invoiceId, String method) async => const Result.ok(PaymentIntent(paymentId: 'p1', amount: '1368.50'));
  @override Future<Result<void>> mockPay(String paymentId) async {
    paidIds.add(paymentId);
    if (confirmFails) return const Result.err(NetworkFailure());
    status = 'paid'; paid = '1368.50'; return const Result.ok(null);
  }
  @override Future<Result<List<PromissoryNote>>> notes() async => const Result.ok([]);
  @override Future<Result<PromissoryNote>> note(String id) async => const Result.err(UnknownFailure());
}
class FakeVehicles implements VehiclesRepository {
  @override Future<Result<List<Vehicle>>> list() async => const Result.ok([Vehicle(id: 'v1', vin: 'JTDKN3DU0A0123456', plate: 'أ ب ج 4821', makeAr: 'تويوتا', modelAr: 'كامري', year: 2019, odometerKm: 84250)]);
  @override Future<Result<Vehicle>> add({String? vin, String? plate}) async => const Result.err(UnknownFailure());
  @override Future<Result<VehiclePassport>> passport(String id) async => const Result.err(UnknownFailure());
  @override Future<Result<String>> shareLink(String id) async => const Result.err(UnknownFailure());
}
class FakeAuth implements AuthRepository {
  @override Future<Result<void>> deleteAccount() async => const Result.ok(null);
  @override Future<Result<({String phone, int expiresIn, String? debugCode})>> requestOtp(String phone) async => const Result.err(UnknownFailure());
  @override Future<Result<AuthSession>> verifyOtp({required String phone, required String code, required String platform, required String flavor}) async => const Result.err(UnknownFailure());
  @override Future<Result<void>> registerPushToken(String token, {required String platform, required String flavor}) async => const Result.ok(null);
  @override Future<Result<Me>> me() async => const Result.ok(Me(id: 'u', phone: '+966512345678', platformRole: 'none', nafathVerified: false, orgs: []));
  @override Future<Result<Me>> updateProfile({String? fullNameAr, String? email, bool clearEmail = false}) => me();
  @override Future<Result<void>> logout() async => const Result.ok(null);
}
Future<void> loadArabicFont() async { final loader = FontLoader('PlexArabic'); for (final f in ['Regular', 'Medium', 'SemiBold', 'Bold']) { loader.addFont(File('assets/fonts/IBMPlexSansArabic-$f.ttf').readAsBytes().then((b) => ByteData.view(b.buffer))); } await loader.load(); }

void main() {
  setUpAll(loadArabicFont);
  late FakeWorkOrders wos; late FakeBilling billing;
  Widget app(GoRouter router, {bool dark = false}) => ProviderScope(key: UniqueKey(), overrides: [
      appConfigProvider.overrideWithValue(const AppConfig(flavor: AppFlavor.customer, apiBaseUrl: 'http://x', appEnv: 'test', sentryDsn: '')),
      authRepositoryProvider.overrideWithValue(FakeAuth()), tokenStoreProvider.overrideWithValue(MemoryTokenStore()), workOrdersRepositoryProvider.overrideWithValue(wos), workOrderRealtimeProvider.overrideWithValue(wos), billingRepositoryProvider.overrideWithValue(billing), vehiclesRepositoryProvider.overrideWithValue(FakeVehicles()),
    ], child: MaterialApp.router(theme: AppTheme.light(), darkTheme: AppTheme.dark(), themeMode: dark ? ThemeMode.dark : ThemeMode.light, locale: const Locale('ar'), supportedLocales: L10n.supportedLocales, localizationsDelegates: const [L10n.delegate, GlobalMaterialLocalizations.delegate, GlobalWidgetsLocalizations.delegate, GlobalCupertinoLocalizations.delegate], routerConfig: router));
  GoRouter router(String initial) => GoRouter(initialLocation: initial, routes: [
    GoRoute(path: '/', builder: (_, _) => const Scaffold(body: VehiclesScreen())),
    GoRoute(path: '/work-orders/:id', builder: (_, s) => WorkOrderScreen(id: s.pathParameters['id']!), routes: [GoRoute(path: 'approve', builder: (_, s) => ApproveScreen(id: s.pathParameters['id']!)), GoRoute(path: 'condition', builder: (_, s) => InspectionDiffScreen(id: s.pathParameters['id']!))]),
    GoRoute(path: '/invoices/:id', builder: (_, s) => InvoiceScreen(id: s.pathParameters['id']!)),
    GoRoute(path: '/vehicles/:id', builder: (_, _) => const Scaffold(body: Text('vehicle'))),
  ]);
  setUp(() { wos = FakeWorkOrders(); billing = FakeBilling(); });

  testWidgets('home shows the awaiting-approval order with one big approve button', (tester) async {
    tester.view.physicalSize = const Size(1170, 2532); tester.view.devicePixelRatio = 3; addTearDown(tester.view.reset);
    await tester.pumpWidget(app(router('/'))); await tester.pumpAndSettle();
    expect(find.text('سمكرة رفرف'), findsOneWidget); expect(find.text('بانتظار اعتمادك'), findsOneWidget); expect(find.text('راجع واعتمد'), findsOneWidget);
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/customer_home_light.png'));
  });

  testWidgets('approve flow: review snapshot → OTP → approved; then invoice → pay sheet → paid', (tester) async {
    tester.view.physicalSize = const Size(1170, 2532); tester.view.devicePixelRatio = 3; addTearDown(tester.view.reset);
    await tester.pumpWidget(app(router('/work-orders/wo1'))); await tester.pumpAndSettle();
    expect(find.textContaining('WO-2026-000042'), findsWidgets); expect(find.text('راجع واعتمد'), findsOneWidget);
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/customer_work_order_light.png'));
    await tester.tap(find.text('راجع واعتمد')); await tester.pumpAndSettle();
    expect(find.text('ورشة النور للسمكرة والميكانيكا'), findsOneWidget); expect(find.text('النسخة 1'), findsOneWidget); expect(find.textContaining('1,368.50'), findsWidgets);
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/customer_approve_light.png'));
    await tester.ensureVisible(find.text('اعتماد برمز التحقق')); await tester.tap(find.text('اعتماد برمز التحقق')); await tester.pumpAndSettle();
    expect(wos.lastMethod, 'otp');
    // ListView يبني كسولاً: حقل الرمز صار تحت النافذة بالخط الأعرض — نمرّر إليه كما يفعل المستخدم
    await tester.scrollUntilVisible(find.byType(TextField), 200, scrollable: find.byType(Scrollable).first);
    expect(find.byType(TextField), findsOneWidget);
    await tester.enterText(find.byType(TextField), '000000'); await tester.tap(find.text('تأكيد الاعتماد')); await tester.pumpAndSettle();
    expect(find.text('رمز غير صحيح'), findsOneWidget);
    await tester.enterText(find.byType(TextField), '123456'); await tester.tap(find.text('تأكيد الاعتماد')); await tester.pumpAndSettle();
    expect(wos.lastCode, '123456'); expect(wos.status, 'in_progress'); expect(find.text('تم الاعتماد — الورشة تبدأ العمل'), findsOneWidget);
    await tester.tap(find.text('تم')); await tester.pumpAndSettle();
    // Back on the order: status moved on and the primary action is now "pay" (invoice exists & payable).
    expect(find.text('قيد التنفيذ'), findsWidgets); expect(find.text('ادفع 1,368.50 ر.س'), findsOneWidget);
    await tester.tap(find.text('ادفع 1,368.50 ر.س')); await tester.pumpAndSettle();
    expect(find.textContaining('INV-2026-000007'), findsWidgets);
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/customer_invoice_light.png'));
    await tester.tap(find.text('ادفع 1,368.50 ر.س')); await tester.pumpAndSettle();
    expect(find.text('اختر طريقة الدفع'), findsOneWidget);
    await tester.tap(find.textContaining('مدى')); await tester.pumpAndSettle();
    expect(billing.paidIds, ['p1']); expect(find.text('تم الدفع — شكراً لك'), findsOneWidget); expect(find.text('مدفوعة'), findsOneWidget); expect(find.textContaining('ادفع '), findsNothing);
  });

  testWidgets('انقطاع بعد إنشاء الدفع: لا زرّ «ادفع» يعود — الشاشة تقول «قيد التأكيد» وتعطي «تحقّق الآن»', (tester) async {
    tester.view.physicalSize = const Size(1170, 2532); tester.view.devicePixelRatio = 3; addTearDown(tester.view.reset);
    billing.confirmFails = true;                                  // الطريق ينقطع بعد إنشاء العملية
    await tester.pumpWidget(app(router('/invoices/inv1'))); await tester.pumpAndSettle();
    await tester.tap(find.text('ادفع 1,368.50 ر.س')); await tester.pumpAndSettle();
    await tester.tap(find.textContaining('مدى')); await tester.pumpAndSettle();
    expect(billing.paidIds, ['p1']);                              // العملية أُنشئت فعلاً
    expect(find.text('دفعتك قيد التأكيد'), findsOneWidget);        // الحقيقة تُقال
    expect(find.textContaining('ادفع '), findsNothing);            // ولا بابَ لدفعٍ ثانٍ
    expect(find.text('تحقّق الآن'), findsOneWidget);               // الفعل الوحيد: اسأل عن المصير
    // ثم يُشفى الخادم ويؤكّد الدفع: «تحقّق الآن» تُنهي الشك
    billing.confirmFails = false; billing.status = 'paid'; billing.paid = '1368.50';
    await tester.tap(find.text('تحقّق الآن')); await tester.pumpAndSettle();
    expect(find.text('مدفوعة'), findsOneWidget);
    expect(find.text('دفعتك قيد التأكيد'), findsNothing);
  });

  testWidgets('condition comparison: clean handover leads with «سيارتك كما استلمناها»', (tester) async {
    tester.view.physicalSize = const Size(1170, 2532); tester.view.devicePixelRatio = 3; addTearDown(tester.view.reset);
    await tester.pumpWidget(app(router('/work-orders/wo1'))); await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('قارن حالة السيارة'), 200, scrollable: find.byType(Scrollable).first);
    await tester.tap(find.text('قارن حالة السيارة')); await tester.pumpAndSettle();
    expect(find.text('سيارتك كما استلمناها'), findsOneWidget);
    expect(find.text('الصدام الأمامي'), findsOneWidget);           // the old scratch, unchanged
    expect(find.text('كما كان عند الاستلام'), findsOneWidget);
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/customer_diff_clean_light.png'));
  });

  testWidgets('condition comparison: new damage is named, counted, and marked when system-detected', (tester) async {
    tester.view.physicalSize = const Size(1170, 2532); tester.view.devicePixelRatio = 3; addTearDown(tester.view.reset);
    wos.diff = InspectionDiff(
      comparable: true, summaryAr: 'ضرر جديد (الباب الخلفي الأيسر) — راجع الصور قبل التسليم.',
      appeared: const [DamageEntry(zone: 'rear_left_door', zoneAr: 'الباب الخلفي الأيسر', severity: 'severe', noteAr: 'انبعاج جديد', mediaIds: ['m9'], source: 'inspector')],
      worsened: const [WorsenedEntry(zone: 'front_bumper', zoneAr: 'الصدام الأمامي', from: 'minor', to: 'moderate')],
      repaired: const [DamageEntry(zone: 'hood', zoneAr: 'غطاء المحرك', severity: 'moderate', mediaIds: [], source: 'inspector')],
      unchanged: const [], checkInAt: DateTime(2026, 8, 18, 9), checkOutAt: DateTime(2026, 8, 20, 15),
      checkInPhotos: const ['a'], checkOutPhotos: const ['b'],
    );
    await tester.pumpWidget(app(router('/work-orders/wo1/condition'))); await tester.pumpAndSettle();
    expect(find.textContaining('الباب الخلفي الأيسر'), findsWidgets);   // in the verdict and in the list
    expect(find.text('ظهر بعد الاستلام: 1'), findsOneWidget);
    expect(find.text('ازداد سوءاً: 1'), findsOneWidget);
    expect(find.text('تم إصلاحه'), findsOneWidget);
    expect(find.text('شديد'), findsOneWidget);
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/customer_diff_damage_light.png'));
  });

  testWidgets('the signature badge names the method actually used, never assumes Nafath', (tester) async {
    tester.view.physicalSize = const Size(1170, 2532); tester.view.devicePixelRatio = 3; addTearDown(tester.view.reset);
    wos.status = 'in_progress'; wos.signedMethod = 'otp';
    await tester.pumpWidget(app(router('/work-orders/wo1'))); await tester.pumpAndSettle();
    expect(find.text('موقّع برمز التحقق'), findsOneWidget); expect(find.text('موقّع بنفاذ'), findsNothing);
    wos.signedMethod = 'nafath';
    await tester.pumpWidget(app(router('/work-orders/wo1'))); await tester.pumpAndSettle();
    expect(find.text('موقّع بنفاذ'), findsOneWidget); expect(find.text('موقّع برمز التحقق'), findsNothing);
  });

  testWidgets('dark theme: work order screen', (tester) async {
    tester.view.physicalSize = const Size(1170, 2532); tester.view.devicePixelRatio = 3; addTearDown(tester.view.reset);
    await tester.pumpWidget(app(router('/work-orders/wo1'), dark: true)); await tester.pumpAndSettle();
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/customer_work_order_dark.png'));
  });
}
