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
import 'package:sinaaty/features/auth/presentation/providers.dart';
import 'package:sinaaty/features/work_orders/presentation/accident_report_screen.dart';
import 'package:sinaaty/features/work_orders/presentation/providers.dart';
import 'package:sinaaty/features/workshop/domain/workshop.dart';
import 'package:sinaaty/features/workshop/presentation/providers.dart';

import 'accident_flow_test.dart' show FakeAccidents, FakeAuth;
import 'workshop_flow_test.dart' show FakeBackend, loadArabicFont;

/// Backlog 53: the assessor's lines become work-order items in one flow — the advisor prices each
/// line (the report never carries prices), and the addition rides the normal add-item path so
/// versioning and re-approval behave exactly as if they were typed.
void main() {
  setUpAll(loadArabicFont);
  late FakeAccidents acc; late FakeBackend be; late MemoryTokenStore ts;
  setUp(() async {
    acc = FakeAccidents(); be = FakeBackend(); ts = MemoryTokenStore(); await ts.save(access: 'a', refresh: 'r');
    await be.create(const NewWorkOrder(orgId: 'org1', plate: 'x', customerPhone: '+966512345678', titleAr: 'إصلاح حادث', paymentTerms: 'on_delivery', items: [NewItem(type: 'labor', descriptionAr: 'فحص', unitPrice: '100')]));
  });

  Widget app() => ProviderScope(key: UniqueKey(), overrides: [
    appConfigProvider.overrideWithValue(const AppConfig(flavor: AppFlavor.partner, apiBaseUrl: 'http://x', appEnv: 'test', sentryDsn: '')), tokenStoreProvider.overrideWithValue(ts),
    authRepositoryProvider.overrideWithValue(FakeAuth()), accidentsRepositoryProvider.overrideWithValue(acc), workshopRepositoryProvider.overrideWithValue(be),
  ], child: MaterialApp.router(theme: AppTheme.light(), locale: const Locale('ar'), supportedLocales: L10n.supportedLocales,
    localizationsDelegates: const [L10n.delegate, GlobalMaterialLocalizations.delegate, GlobalWidgetsLocalizations.delegate, GlobalCupertinoLocalizations.delegate],
    routerConfig: GoRouter(initialLocation: '/', routes: [GoRoute(path: '/', builder: (_, _) => const AccidentReportScreen(workOrderId: 'wo1'))])));

  void size(WidgetTester t) { t.view.physicalSize = const Size(1170, 2532); t.view.devicePixelRatio = 3; addTearDown(t.view.reset); }

  testWidgets('the assessor lines land on the order priced by the advisor, through the normal item path', (tester) async {
    size(tester);
    await tester.pumpWidget(app()); await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'ACC-2026-000123');
    await tester.tap(find.text('استعلام')); await tester.pumpAndSettle();
    await tester.tap(find.text('اربط بهذا الأمر')); await tester.pumpAndSettle();
    await tester.pump(const Duration(seconds: 5)); await tester.pumpAndSettle();   // let the «رُبط التقرير» snackbar expire so ours isn't queued behind it

    await tester.scrollUntilVisible(find.text('أضفها لأمر العمل'), 400, scrollable: find.byType(Scrollable).first); await tester.pumpAndSettle();
    await tester.tap(find.text('أضفها لأمر العمل')); await tester.pumpAndSettle();
    expect(find.textContaining('إعادة اعتماد'), findsWidgets);              // says what adding means

    final priceFields = find.byType(TextField);
    await tester.enterText(priceFields.at(0), '850');
    await tester.enterText(priceFields.at(1), '400');
    await tester.tap(find.text('أضفها لأمر العمل').last); await tester.pumpAndSettle();

    final items = be.addedItems;
    expect(items.map((i) => i.descriptionAr), containsAll(['استبدال — الصدام الأمامي', 'سمكرة ودهان — الرفرف الأمامي الأيمن']));
    expect(items.map((i) => i.unitPrice), containsAll(['850.00', '400.00'])); // the advisor's prices, 2dp
    expect(items.map((i) => i.type), containsAll(['part', 'paint']));         // assessor types pass through
    expect(find.text('أُضيفت البنود — أرسلها للاعتماد'), findsOneWidget);
  });
}
