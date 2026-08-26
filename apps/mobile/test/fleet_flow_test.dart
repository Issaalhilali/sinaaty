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
import 'package:sinaaty/features/fleet/domain/fleet.dart';
import 'package:sinaaty/features/fleet/domain/fleet_repository.dart';
import 'package:sinaaty/features/fleet/presentation/fleet_statements_screen.dart';
import 'package:sinaaty/features/fleet/presentation/fleet_policy_screen.dart';
import 'package:sinaaty/features/fleet/presentation/fleet_today_screen.dart';
import 'package:sinaaty/features/fleet/presentation/providers.dart';

/// The fleet manager's day: what waits on a decision, what the policy says about each repair, and that a
/// decision is recorded — while the signature stays a separate act.
class FakeFleet implements FleetRepository {
  ({String id, String decision, String? note})? lastDecision;

  @override Future<Result<FleetOverview>> overview(String orgId) async => const Result.ok(FleetOverview(
    vehicles: 5, openWorkOrders: 3, awaitingApproval: 3, monthSpend: '9877.50',
    budgetRemaining: '50122.50', budgetUsedPct: '16.5', openNotes: 0,
    policyNameAr: 'سياسة صيانة 2026', autoApproveBelow: '500.00', monthlyBudget: '60000.00'));

  FleetPolicy policy = const FleetPolicy(id: 'p1', nameAr: 'سياسة صيانة 2026', autoApproveBelow: '500.00', requiresTwoApproversAbove: '5000.00', monthlyBudget: '60000.00');
  FleetPolicy? saved;
  @override Future<Result<List<FleetPolicy>>> policies(String orgId) async => Result.ok([policy]);
  @override Future<Result<FleetPolicy>> savePolicy(String orgId, FleetPolicy p) async { saved = p; policy = p; return Result.ok(p); }

  @override Future<Result<List<FleetPending>>> pending(String orgId) async => Result.ok([
    FleetPending(workOrderId: 'w1', number: 'WO-2026-004361', total: '8280.00', workshopNameAr: 'ورشة النور للسمكرة والميكانيكا', assetCode: 'TRK-001', plate: null,
      requestedAt: DateTime(2026, 8, 20, 10), outcome: 'two_approvers', approvalsRequired: 2, blocked: false, policyReasonAr: '',
      approvals: [FleetApprovalRecord(byNameAr: 'عيسى', decision: 'approved', noteAr: 'الشاحنة متوقفة', at: DateTime(2026, 8, 20, 11))], readyToSign: false),
    FleetPending(workOrderId: 'w2', number: 'WO-2026-004362', total: '1897.50', workshopNameAr: 'ورشة النور للسمكرة والميكانيكا', assetCode: 'VAN-001', plate: null,
      requestedAt: DateTime(2026, 8, 20, 10), outcome: 'one_approver', approvalsRequired: 1, blocked: false, policyReasonAr: '', approvals: const [], readyToSign: false),
    FleetPending(workOrderId: 'w3', number: 'WO-2026-004363', total: '437.00', workshopNameAr: 'ورشة النور للسمكرة والميكانيكا', assetCode: 'BUS-001', plate: null,
      requestedAt: DateTime(2026, 8, 20, 10), outcome: 'auto', approvalsRequired: 0, blocked: false, policyReasonAr: '', approvals: const [], readyToSign: true),
  ]);

  @override Future<Result<FleetDecision>> decide(String workOrderId, {required String decision, String? noteAr}) async {
    lastDecision = (id: workOrderId, decision: decision, note: noteAr);
    return const Result.ok(FleetDecision(decision: 'approved', approvals: 2, approvalsRequired: 2, readyToSign: true));
  }

  String? generatedMonth; String? copiedCsvId;
  final stmt = FleetStatement(id: 's1', periodStart: DateTime(2026, 7, 1), periodEnd: DateTime(2026, 7, 31), total: '12650.00', status: 'final', invoiceCount: 2, lines: [
    FleetStatementLine(invoiceId: 'i1', number: 'INV-2026-000201', issueDate: DateTime(2026, 7, 5), workOrderNumber: 'WO-2026-004201', assetCode: 'TRK-001', total: '8280.00', status: 'paid'),
    FleetStatementLine(invoiceId: 'i2', number: 'INV-2026-000202', issueDate: DateTime(2026, 7, 19), workOrderNumber: 'WO-2026-004202', assetCode: 'VAN-001', total: '4370.00', status: 'issued'),
  ]);
  @override Future<Result<List<FleetStatement>>> statements(String orgId) async => Result.ok([stmt]);
  @override Future<Result<FleetStatement>> statement(String id) async => Result.ok(stmt);
  @override Future<Result<FleetStatement>> generateStatement(String orgId, String month) async { generatedMonth = month; return Result.ok(stmt); }
  @override Future<Result<String>> statementCsv(String id) async { copiedCsvId = id; return const Result.ok('رقم الفاتورة,التاريخ,المركبة,الإجمالي\nINV-2026-000201,2026-07-05,TRK-001,8280.00\n'); }
}

class FakeAuth implements AuthRepository {
  @override Future<Result<({String phone, int expiresIn, String? debugCode})>> requestOtp(String phone) async => const Result.err(UnknownFailure());
  @override Future<Result<AuthSession>> verifyOtp({required String phone, required String code, required String platform, required String flavor}) async => const Result.err(UnknownFailure());
  @override Future<Result<void>> registerPushToken(String token, {required String platform, required String flavor}) async => const Result.ok(null);
  @override Future<Result<Me>> me() async => const Result.ok(Me(id: 'u', phone: '+966508887771', fullNameAr: 'مدير الأسطول', platformRole: 'none', nafathVerified: true, orgs: [OrgMembership('fleet1', 'owner')]));
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
  late FakeFleet fleet; late MemoryTokenStore ts;

  Widget app(GoRouter router, {bool dark = false}) => ProviderScope(key: UniqueKey(), overrides: [
    appConfigProvider.overrideWithValue(const AppConfig(flavor: AppFlavor.fleet, apiBaseUrl: 'http://x', appEnv: 'test', sentryDsn: '')),
    authRepositoryProvider.overrideWithValue(FakeAuth()), tokenStoreProvider.overrideWithValue(ts),
    fleetRepositoryProvider.overrideWithValue(fleet),
  ], child: MaterialApp.router(theme: AppTheme.light(), darkTheme: AppTheme.dark(), themeMode: dark ? ThemeMode.dark : ThemeMode.light, locale: const Locale('ar'), supportedLocales: L10n.supportedLocales,
    localizationsDelegates: const [L10n.delegate, GlobalMaterialLocalizations.delegate, GlobalWidgetsLocalizations.delegate, GlobalCupertinoLocalizations.delegate], routerConfig: router));

  GoRouter router() => GoRouter(initialLocation: '/', routes: [
    GoRoute(path: '/', builder: (_, _) => const Scaffold(body: FleetTodayScreen())),
    GoRoute(path: '/work-orders/:id/approve', builder: (_, s) => Scaffold(body: Text('sign:${s.pathParameters['id']}'))),
  ]);

  void size(WidgetTester t) { t.view.physicalSize = const Size(1170, 2532); t.view.devicePixelRatio = 3; addTearDown(t.view.reset); }
  // A token must exist for the auth controller to load `me` — that is where the fleet org id comes from.
  setUp(() async { fleet = FakeFleet(); ts = MemoryTokenStore(); await ts.save(access: 'a', refresh: 'r'); });

  testWidgets('the day leads with the budget, and every pending repair says what the policy wants', (tester) async {
    size(tester);
    await tester.pumpWidget(app(router())); await tester.pumpAndSettle();
    expect(find.textContaining('9,877.50'), findsOneWidget);                        // committed this month
    expect(find.textContaining('50,122.50'), findsOneWidget);                       // budget left
    expect(find.text('يحتاج اعتماد شخصين'), findsOneWidget);
    expect(find.text('اعتمده عيسى'), findsOneWidget);                               // who already decided
    expect(find.text('يحتاج اعتماداً واحداً'), findsOneWidget);
    expect(find.text('تحت الحد — جاهز للتوقيع'), findsOneWidget);
    expect(find.text('اكتمل الاعتماد — وقّع الآن'), findsOneWidget);                // the auto one goes straight to signing
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/fleet_today_light.png'));
    await tester.pumpWidget(app(router(), dark: true)); await tester.pumpAndSettle();
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/fleet_today_dark.png'));
  });

  testWidgets('approving records the decision with its note; signing is its own separate step', (tester) async {
    size(tester);
    await tester.pumpWidget(app(router())); await tester.pumpAndSettle();
    await tester.tap(find.text('أوافق على الصرف').first); await tester.pumpAndSettle();
    expect(find.text('قرارك يُسجَّل باسمك. التوقيع النهائي خطوة مستقلة عبر نفاذ أو رمز التحقق.'), findsOneWidget);
    await tester.enterText(find.byType(TextField).last, 'أولوية تشغيلية');
    await tester.tap(find.text('أوافق على الصرف').last); await tester.pumpAndSettle();
    expect(fleet.lastDecision, isNotNull);
    expect(fleet.lastDecision!.decision, 'approved');
    expect(fleet.lastDecision!.note, 'أولوية تشغيلية');
    expect(find.text('سُجّل قرارك'), findsOneWidget);
    // The ready-to-sign card routes into the existing signing flow, not some new one.
    await tester.pump(const Duration(seconds: 5));   // let the snackbar clear the bottom of the screen
    await tester.scrollUntilVisible(find.text('اكتمل الاعتماد — وقّع الآن'), 300, scrollable: find.byType(Scrollable).first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('اكتمل الاعتماد — وقّع الآن')); await tester.pumpAndSettle();
    expect(find.text('sign:w3'), findsOneWidget);
  });

  testWidgets('monthly statements: list → month detail with its lines → CSV one copy away', (tester) async {
    size(tester);
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, (call) async => null);   // Clipboard.setData resolves in tests
    final r = GoRouter(initialLocation: '/fleet/statements', routes: [
      GoRoute(path: '/fleet/statements', builder: (_, _) => const FleetStatementsScreen()),
      GoRoute(path: '/fleet/statements/:id', builder: (_, s) => FleetStatementScreen(id: s.pathParameters['id']!)),
    ]);
    await tester.pumpWidget(app(r)); await tester.pumpAndSettle();
    expect(find.textContaining('يوليو'), findsOneWidget);                         // the month, named
    expect(find.textContaining('12,650.00'), findsOneWidget);
    expect(find.text('2 فاتورة'), findsOneWidget);
    // Generation is one tap and idempotent on the API — it lands on the month it made.
    await tester.tap(find.text('أنشئ كشف هذا الشهر')); await tester.pumpAndSettle();
    await tester.pump(const Duration(seconds: 5)); await tester.pumpAndSettle();  // let the «جُهّز» snackbar expire so the copy toast isn't queued behind it
    expect(fleet.generatedMonth, matches(RegExp(r'^\d{4}-\d{2}$')));
    expect(find.text('TRK-001'), findsOneWidget);                                 // the fleet reads by asset code
    expect(find.textContaining('INV-2026-000201'), findsOneWidget);
    expect(find.text('مدفوعة'), findsOneWidget);
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/fleet_statement_light.png'));
    await tester.tap(find.byIcon(Icons.more_horiz)); await tester.pumpAndSettle();
    await tester.tap(find.text('نسخ CSV')); await tester.pumpAndSettle();
    expect(fleet.copiedCsvId, 's1');
    expect(find.text('نُسخ الكشف — ألصقه في جداولك'), findsOneWidget);
  });

  testWidgets('قواعد الصرف: تُقرأ، ويُرى أثرها على مبالغ حقيقية، ثم تُحفظ', (tester) async {
    tester.view.physicalSize = const Size(1170, 2532); tester.view.devicePixelRatio = 3; addTearDown(tester.view.reset);
    fleet = FakeFleet();
    await tester.pumpWidget(app(GoRouter(initialLocation: '/policy', routes: [
      GoRoute(path: '/', builder: (_, _) => const Scaffold(body: Text('الأسطول'))),
      GoRoute(path: '/policy', builder: (_, _) => const FleetPolicyScreen(orgId: 'org1')),
    ])));
    await tester.pumpAndSettle();

    // القيم الحالية محمّلة، والمعنى معروض بها لا بأرقام فارغة.
    expect(find.text('500.00'), findsWidgets);
    expect(find.text('يمرّ تلقائياً'), findsOneWidget, reason: '350 تحت حدّ الـ500');
    expect(find.text('اعتماد شخصين'), findsOneWidget, reason: '6000 فوق حدّ الـ5000');

    // حدّان متناقضان يُرفضان قبل أن يصلا الخادم.
    await tester.enterText(find.widgetWithText(TextField, 'يحتاج معتمدَين فوق'), '100');
    await tester.tap(find.text('حفظ القواعد')); await tester.pumpAndSettle();
    expect(find.textContaining('لن يمرّ أي أمر باعتماد واحد'), findsOneWidget);
    expect(fleet.saved, isNull, reason: 'لم يُرسل شيء');

    await tester.enterText(find.widgetWithText(TextField, 'يحتاج معتمدَين فوق'), '4000');
    await tester.pumpAndSettle();
    expect(find.textContaining('لن يمرّ أي أمر باعتماد واحد'), findsNothing, reason: 'الخطأ يزول مع تصحيح سببه');
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/fleet_policy_light.png'));
    await tester.tap(find.text('حفظ القواعد')); await tester.pumpAndSettle();
    expect(fleet.saved?.requiresTwoApproversAbove, '4000');
    expect(fleet.saved?.autoApproveBelow, '500.00', reason: 'ما لم يُلمس يبقى كما هو');
  });
}
