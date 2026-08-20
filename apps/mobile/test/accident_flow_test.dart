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
import 'package:sinaaty/features/work_orders/domain/accident_report.dart';
import 'package:sinaaty/features/work_orders/domain/accidents_repository.dart';
import 'package:sinaaty/features/work_orders/presentation/accident_report_screen.dart';
import 'package:sinaaty/features/work_orders/presentation/providers.dart';

/// The service advisor's accident flow: look up by reference → see exactly what will be attached →
/// link → the customer-share figure leads; and a still-unpriced file says so instead of inventing numbers.
class FakeAccidents implements AccidentsRepository {
  AccidentReport? linkedReport;
  ({String ref, String woId})? lastLink;
  bool submitCalled = false;

  static const priced = AccidentReport(
    ref: 'ACC-2026-000123', status: 'assessed', actionable: true,
    insurerNameAr: 'شركة التعاونية للتأمين', claimNo: 'CLM-0031544',
    approvedAmount: '4250.00', deductibleAmount: '500.00', faultPercent: '0.00',
    damages: [AccidentDamage(partCode: 'FRONT_BUMPER', labelAr: 'الصدام الأمامي', severity: 'severe', action: 'replace')],
    suggestedItems: [
      AccidentSuggestedItem(type: 'part', descriptionAr: 'استبدال — الصدام الأمامي', quantity: '1'),
      AccidentSuggestedItem(type: 'paint', descriptionAr: 'سمكرة ودهان — الرفرف الأمامي الأيمن', quantity: '1'),
    ],
    customerEstimatedTotal: '500.00',
  );

  @override Future<Result<AccidentReport>> lookup({required String ref, String? vin}) async =>
      ref.contains('PEND')
          ? const Result.ok(AccidentReport(ref: 'ACC-2026-PEND-9', status: 'under_assessment', actionable: false, damages: [], suggestedItems: []))
          : ref.startsWith('ACC')
              ? const Result.ok(priced)
              : const Result.err(ApiFailure(404, 'NOT_FOUND', 'لا يوجد تقرير حادث بهذا الرقم.', 'No accident report'));

  @override Future<Result<AccidentReport>> link({required String ref, required String workOrderId, required String orgId}) async {
    lastLink = (ref: ref, woId: workOrderId);
    linkedReport = AccidentReport(id: 'ar1', ref: priced.ref, status: priced.status, actionable: true, insurerNameAr: priced.insurerNameAr, claimNo: priced.claimNo, approvedAmount: priced.approvedAmount, deductibleAmount: priced.deductibleAmount, faultPercent: priced.faultPercent, damages: priced.damages, suggestedItems: priced.suggestedItems, customerEstimatedTotal: priced.customerEstimatedTotal);
    return Result.ok(linkedReport!);
  }

  @override Future<Result<AccidentReport>> forWorkOrder(String workOrderId) async =>
      linkedReport != null ? Result.ok(linkedReport!) : const Result.err(ApiFailure(404, 'NOT_FOUND', 'لا يوجد تقرير مرتبط.', 'none'));

  @override Future<Result<AccidentReport>> submitRepair(String reportId) async {
    submitCalled = true;
    linkedReport = AccidentReport(id: 'ar1', ref: priced.ref, status: priced.status, actionable: true, insurerNameAr: priced.insurerNameAr, claimNo: priced.claimNo, approvedAmount: priced.approvedAmount, deductibleAmount: priced.deductibleAmount, faultPercent: priced.faultPercent, damages: priced.damages, suggestedItems: priced.suggestedItems, customerEstimatedTotal: priced.customerEstimatedTotal, repairSubmissionRef: 'RPT-AB12CD34EF');
    return Result.ok(linkedReport!);
  }
}

class FakeAuth implements AuthRepository {
  @override Future<Result<({String phone, int expiresIn, String? debugCode})>> requestOtp(String phone) async => const Result.err(UnknownFailure());
  @override Future<Result<AuthSession>> verifyOtp({required String phone, required String code, required String platform}) async => const Result.err(UnknownFailure());
  @override Future<Result<Me>> me() async => const Result.ok(Me(id: 'u', phone: '+966500000001', platformRole: 'none', nafathVerified: false, orgs: [OrgMembership('ws1', 'owner')]));
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
  late FakeAccidents acc; late MemoryTokenStore ts;

  Widget app({bool dark = false}) => ProviderScope(key: UniqueKey(), overrides: [
    appConfigProvider.overrideWithValue(const AppConfig(flavor: AppFlavor.partner, apiBaseUrl: 'http://x', appEnv: 'test', sentryDsn: '')),
    authRepositoryProvider.overrideWithValue(FakeAuth()), tokenStoreProvider.overrideWithValue(ts),
    accidentsRepositoryProvider.overrideWithValue(acc),
  ], child: MaterialApp.router(theme: AppTheme.light(), darkTheme: AppTheme.dark(), themeMode: dark ? ThemeMode.dark : ThemeMode.light, locale: const Locale('ar'), supportedLocales: L10n.supportedLocales,
    localizationsDelegates: const [L10n.delegate, GlobalMaterialLocalizations.delegate, GlobalWidgetsLocalizations.delegate, GlobalCupertinoLocalizations.delegate],
    routerConfig: GoRouter(initialLocation: '/', routes: [GoRoute(path: '/', builder: (_, _) => const AccidentReportScreen(workOrderId: 'wo1'))])));

  void size(WidgetTester t) { t.view.physicalSize = const Size(1170, 2532); t.view.devicePixelRatio = 3; addTearDown(t.view.reset); }
  setUp(() async { acc = FakeAccidents(); ts = MemoryTokenStore(); await ts.save(access: 'a', refresh: 'r'); });

  testWidgets('lookup → preview shows what will be attached → link, with the customer share leading', (tester) async {
    size(tester);
    await tester.pumpWidget(app()); await tester.pumpAndSettle();
    expect(find.text('لا يوجد تقرير مرتبط'), findsOneWidget);

    await tester.enterText(find.byType(TextField), 'ACC-2026-000123');
    await tester.tap(find.text('استعلام')); await tester.pumpAndSettle();

    expect(find.text('شركة التعاونية للتأمين'), findsOneWidget);
    expect(find.textContaining('500.00'), findsWidgets);                       // what the customer pays, on the seal card
    expect(find.text('استبدال — الصدام الأمامي'), findsOneWidget);             // the assessor's line, ready to reprice
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/accident_preview_light.png'));
    // Same file, dark — pins the coverage meter's contrast on the seal card in both themes.
    await tester.pumpWidget(app(dark: true)); await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'ACC-2026-000123');
    await tester.tap(find.text('استعلام')); await tester.pumpAndSettle();
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/accident_preview_dark.png'));

    await tester.tap(find.text('اربط بهذا الأمر')); await tester.pumpAndSettle();
    expect(acc.lastLink, isNotNull);
    expect(acc.lastLink!.woId, 'wo1');
    expect(find.text('رُبط التقرير بالأمر'), findsOneWidget);
    // Linked view now shows the file and the register-repair primary action.
    expect(find.text('سجّل تقرير الإصلاح لدى الجهة'), findsOneWidget);
  });

  testWidgets('an unpriced file says so — no figures are invented', (tester) async {
    size(tester);
    await tester.pumpWidget(app()); await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'ACC-2026-PEND-9');
    await tester.tap(find.text('استعلام')); await tester.pumpAndSettle();
    expect(find.textContaining('قيد التقييم'), findsOneWidget);
    expect(find.textContaining('4,250.00'), findsNothing);
  });

  testWidgets('a wrong reference is an ordinary error with a retry, not a dead end', (tester) async {
    size(tester);
    await tester.pumpWidget(app()); await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'XYZ-99');
    await tester.tap(find.text('استعلام')); await tester.pumpAndSettle();
    expect(find.text('لا يوجد تقرير حادث بهذا الرقم.'), findsOneWidget);
  });

  testWidgets('registering the repair flips the card to «سُجّل» with the provider reference', (tester) async {
    size(tester);
    acc.linkedReport = AccidentReport(id: 'ar1', ref: 'ACC-2026-000123', status: 'assessed', actionable: true, insurerNameAr: 'شركة التعاونية للتأمين', approvedAmount: '4250.00', deductibleAmount: '500.00', damages: const [], suggestedItems: FakeAccidents.priced.suggestedItems, customerEstimatedTotal: '500.00');
    await tester.pumpWidget(app()); await tester.pumpAndSettle();
    await tester.tap(find.text('سجّل تقرير الإصلاح لدى الجهة')); await tester.pumpAndSettle();
    expect(acc.submitCalled, isTrue);
    expect(find.text('سُجّل تقرير الإصلاح'), findsWidgets);
    expect(find.textContaining('RPT-AB12CD34EF'), findsOneWidget);
    expect(find.text('سجّل تقرير الإصلاح لدى الجهة'), findsNothing);           // done once — the button leaves
  });
}
