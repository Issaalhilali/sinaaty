import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:sinaaty/core/auth/token_store.dart';
import 'package:sinaaty/core/config/app_config.dart';
import 'package:sinaaty/core/di/core_providers.dart';
import 'package:sinaaty/core/l10n/app_localizations.dart';
import 'package:sinaaty/core/theme/app_theme.dart';
import 'package:sinaaty/features/auth/presentation/providers.dart';
import 'package:sinaaty/features/fleet/presentation/fleet_today_screen.dart';
import 'package:sinaaty/features/fleet/presentation/providers.dart';
import 'package:sinaaty/features/work_orders/presentation/accident_report_screen.dart';
import 'package:sinaaty/features/work_orders/presentation/providers.dart';

import 'accident_flow_test.dart' as acc;
import 'fleet_flow_test.dart' as fleet;

/// The tightest phone we support (iPhone SE class, 320 logical points wide): every hero card, badge
/// row and button bar must lay out without a RenderFlex overflow — the framework turns any overflow
/// into a test failure, so these tests are the guard.
void main() {
  setUpAll(fleet.loadArabicFont);

  void small(WidgetTester t) { t.view.physicalSize = const Size(640, 1136); t.view.devicePixelRatio = 2; addTearDown(t.view.reset); }

  Widget shell({required AppFlavor flavor, required List<Override> overrides, required Widget home}) => ProviderScope(key: UniqueKey(), overrides: [
    appConfigProvider.overrideWithValue(AppConfig(flavor: flavor, apiBaseUrl: 'http://x', appEnv: 'test', sentryDsn: '')),
    ...overrides,
  ], child: MaterialApp.router(theme: AppTheme.light(), locale: const Locale('ar'), supportedLocales: L10n.supportedLocales,
    localizationsDelegates: const [L10n.delegate, GlobalMaterialLocalizations.delegate, GlobalWidgetsLocalizations.delegate, GlobalCupertinoLocalizations.delegate],
    routerConfig: GoRouter(initialLocation: '/', routes: [
      GoRoute(path: '/', builder: (_, _) => Scaffold(body: home)),
      GoRoute(path: '/work-orders/:id/approve', builder: (_, _) => const Scaffold(body: SizedBox())),
    ])));

  testWidgets('fleet today fits a 320pt-wide phone', (tester) async {
    small(tester);
    final ts = MemoryTokenStore(); await ts.save(access: 'a', refresh: 'r');
    await tester.pumpWidget(shell(flavor: AppFlavor.fleet, overrides: [
      authRepositoryProvider.overrideWithValue(fleet.FakeAuth()), tokenStoreProvider.overrideWithValue(ts),
      fleetRepositoryProvider.overrideWithValue(fleet.FakeFleet()),
    ], home: const FleetTodayScreen()));
    await tester.pumpAndSettle();
    expect(find.textContaining('9,877.50'), findsOneWidget);
    await tester.drag(find.byType(Scrollable).first, const Offset(0, -800)); await tester.pumpAndSettle();
  });

  testWidgets('accident report (lookup and priced preview) fits a 320pt-wide phone', (tester) async {
    small(tester);
    final ts = MemoryTokenStore(); await ts.save(access: 'a', refresh: 'r');
    await tester.pumpWidget(shell(flavor: AppFlavor.partner, overrides: [
      authRepositoryProvider.overrideWithValue(acc.FakeAuth()), tokenStoreProvider.overrideWithValue(ts),
      accidentsRepositoryProvider.overrideWithValue(acc.FakeAccidents()),
    ], home: const AccidentReportScreen(workOrderId: 'wo1')));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'ACC-2026-000123');
    await tester.tap(find.text('استعلام')); await tester.pumpAndSettle();
    expect(find.textContaining('500.00'), findsWidgets);
    await tester.drag(find.byType(Scrollable).first, const Offset(0, -800)); await tester.pumpAndSettle();
  });
}
