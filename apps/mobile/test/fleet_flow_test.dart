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
}

class FakeAuth implements AuthRepository {
  @override Future<Result<({String phone, int expiresIn, String? debugCode})>> requestOtp(String phone) async => const Result.err(UnknownFailure());
  @override Future<Result<AuthSession>> verifyOtp({required String phone, required String code, required String platform}) async => const Result.err(UnknownFailure());
  @override Future<Result<Me>> me() async => const Result.ok(Me(id: 'u', phone: '+966508887771', fullNameAr: 'مدير الأسطول', platformRole: 'none', nafathVerified: true, orgs: [OrgMembership('fleet1', 'owner')]));
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

  Widget app(GoRouter router) => ProviderScope(key: UniqueKey(), overrides: [
    appConfigProvider.overrideWithValue(const AppConfig(flavor: AppFlavor.fleet, apiBaseUrl: 'http://x', appEnv: 'test', sentryDsn: '')),
    authRepositoryProvider.overrideWithValue(FakeAuth()), tokenStoreProvider.overrideWithValue(ts),
    fleetRepositoryProvider.overrideWithValue(fleet),
  ], child: MaterialApp.router(theme: AppTheme.light(), locale: const Locale('ar'), supportedLocales: L10n.supportedLocales,
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
}
