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
import 'package:sinaaty/features/billing/presentation/providers.dart';
import 'package:sinaaty/features/work_orders/presentation/providers.dart';
import 'package:sinaaty/features/workshop/domain/workshop.dart';
import 'package:sinaaty/features/workshop/presentation/order_screen.dart';
import 'package:sinaaty/features/workshop/presentation/providers.dart';

import 'customer_flow_test.dart' show FakeBilling;
import 'workshop_flow_test.dart' show FakeBackend, FakeAuth, loadArabicFont;

/// The abandoned-vehicle ledger on the workshop's order screen (backlog 78): the three notices as a
/// timeline, the accruing storage, and the declaration button that exists ONLY when the server says
/// every legal condition is met — the client never counts days.
void main() {
  setUpAll(loadArabicFont);
  late FakeBackend be; late MemoryTokenStore ts;

  AbandonedStatus status({required bool eligible}) => AbandonedStatus(
    status: 'ready', daysReady: 16,
    steps: [
      AbandonedNoticeStep(step: 1, afterDays: 5, formal: false, sentAt: DateTime(2026, 8, 10)),
      AbandonedNoticeStep(step: 2, afterDays: 10, formal: false, sentAt: DateTime(2026, 8, 15)),
      AbandonedNoticeStep(step: 3, afterDays: 15, formal: true, sentAt: eligible ? DateTime(2026, 8, 20) : null),
    ],
    storageAmount: '140.00', perDay: '20.00', freeDays: 2, chargeableDays: 7,
    canDeclare: eligible, reasonAr: eligible ? null : 'لم تُرسل جميع الإنذارات بعد.',
  );

  setUp(() async {
    be = FakeBackend(); ts = MemoryTokenStore(); await ts.save(access: 'a', refresh: 'r');
    await be.create(const NewWorkOrder(orgId: 'org1', plate: 'x', customerPhone: '+966512345678', titleAr: 'سمكرة رفرف أمامي', paymentTerms: 'on_delivery', items: [NewItem(type: 'labor', descriptionAr: 'سمكرة', unitPrice: '1190')]));
    await be.transition('wo1', 'ready');
  });

  Widget app() => ProviderScope(key: UniqueKey(), overrides: [
    appConfigProvider.overrideWithValue(const AppConfig(flavor: AppFlavor.partner, apiBaseUrl: 'http://x', appEnv: 'test', sentryDsn: '')), tokenStoreProvider.overrideWithValue(ts),
    authRepositoryProvider.overrideWithValue(FakeAuth()), workshopRepositoryProvider.overrideWithValue(be), workOrdersRepositoryProvider.overrideWithValue(be), workOrderRealtimeProvider.overrideWithValue(be), billingRepositoryProvider.overrideWithValue(FakeBilling()), pendingActionsProvider.overrideWithValue(be),
  ], child: MaterialApp.router(theme: AppTheme.light(), locale: const Locale('ar'), supportedLocales: L10n.supportedLocales,
    localizationsDelegates: const [L10n.delegate, GlobalMaterialLocalizations.delegate, GlobalWidgetsLocalizations.delegate, GlobalCupertinoLocalizations.delegate],
    routerConfig: GoRouter(initialLocation: '/ws/orders/wo1', routes: [
      GoRoute(path: '/ws/orders/wo1', builder: (_, _) => const WorkshopOrderScreen(id: 'wo1')),
      GoRoute(path: '/invoices/:id', builder: (_, _) => const Scaffold(body: SizedBox())),
    ])));

  void size(WidgetTester t) { t.view.physicalSize = const Size(1170, 2532); t.view.devicePixelRatio = 3; addTearDown(t.view.reset); }

  testWidgets('not eligible: the notices timeline and storage show, the declare button does not exist', (tester) async {
    size(tester);
    be.abandoned = status(eligible: false);
    await tester.pumpWidget(app()); await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('مركبة لم تُستلم'), 400, scrollable: find.byType(Scrollable).first); await tester.pumpAndSettle();
    expect(find.text('إنذار 1'), findsOneWidget);
    expect(find.text('إنذار 3 — رسمي'), findsOneWidget);
    expect(find.textContaining('140.00'), findsWidgets);                    // storage so far
    expect(find.text('إعلان مركبة مهجورة'), findsNothing);                  // the server said no — no button
    expect(find.text('لم تُرسل جميع الإنذارات بعد.'), findsOneWidget);      // and the reason says why
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/abandoned_timeline_light.png'));
  });

  testWidgets('eligible: the declare button appears, warns, and records the declaration', (tester) async {
    size(tester);
    be.abandoned = status(eligible: true);
    await tester.pumpWidget(app()); await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('إعلان مركبة مهجورة'), 400, scrollable: find.byType(Scrollable).first); await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(OutlinedButton, 'إعلان مركبة مهجورة')); await tester.pumpAndSettle();
    expect(find.textContaining('لا رجعة فيه'), findsOneWidget);             // the warning comes before the act
    await tester.enterText(find.byType(TextField).last, 'استنفاد الإنذارات الثلاثة');
    await tester.tap(find.widgetWithText(FilledButton, 'إعلان مركبة مهجورة')); await tester.pumpAndSettle();
    expect(be.declaredReason, 'استنفاد الإنذارات الثلاثة');
    expect(find.text('أُعلنت المركبة مهجورة'), findsOneWidget);
  });
}
