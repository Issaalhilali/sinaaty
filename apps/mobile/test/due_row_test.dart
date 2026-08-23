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
import 'package:sinaaty/core/result/result.dart';
import 'package:sinaaty/core/theme/app_theme.dart';
import 'package:sinaaty/features/auth/presentation/providers.dart';
import 'package:sinaaty/features/billing/domain/billing.dart';
import 'package:sinaaty/features/billing/presentation/providers.dart';
import 'package:sinaaty/features/vehicles/domain/vehicle.dart';
import 'package:sinaaty/features/vehicles/presentation/providers.dart';
import 'package:sinaaty/features/vehicles/presentation/vehicles_screen.dart';
import 'package:sinaaty/features/work_orders/presentation/providers.dart';

import 'fleet_flow_test.dart' show FakeAuth, loadArabicFont;

/// «مستحقّ عليك» على شاشة العميل الأولى: المبلغ الذي يفتح إنذاراً إن نُسي يجب أن يُرى قبل فتح المحفظة.
void main() {
  setUpAll(loadArabicFont);
  late MemoryTokenStore ts;
  setUp(() async { ts = MemoryTokenStore(); await ts.save(access: 'a', refresh: 'r'); });

  final car = const Vehicle(id: 'v1', makeAr: 'تويوتا', modelAr: 'كامري', plate: 'أ ب ح 4821');
  Invoice inv(String id, String total, String paid, {String status = 'issued'}) => Invoice(
        id: id, number: 'INV-2026-00000$id', type: 'simplified', status: status, workOrderId: 'w1',
        sellerNameAr: 'ورشة النور', subtotal: total, vatTotal: '0.00', total: total, paidTotal: paid,
        paymentTerms: 'deferred', issueDate: DateTime(2026, 8, 20), lines: const []);
  PromissoryNote note(String invoiceId, String outstanding, {bool overdue = false, String status = 'issued'}) =>
      PromissoryNote(id: 'n$invoiceId', number: 'PN-2026-000001', status: status, amount: outstanding,
          outstanding: outstanding, dueDate: DateTime(2026, 9, 1), overdue: overdue, invoiceId: invoiceId);

  String? went;
  Widget app({required List<Invoice> invoices, required List<PromissoryNote> notes}) {
    went = null;
    final overrides = <Override>[
      appConfigProvider.overrideWithValue(const AppConfig(flavor: AppFlavor.customer, apiBaseUrl: 'http://x', appEnv: 'test', sentryDsn: '')),
      authRepositoryProvider.overrideWithValue(FakeAuth()), tokenStoreProvider.overrideWithValue(ts),
      vehiclesProvider.overrideWith((ref) async => Result.ok([car])),
      workOrdersProvider.overrideWith((ref) async => const Result.ok([])),
      invoicesProvider.overrideWith((ref) async => Result.ok(invoices)),
      notesProvider.overrideWith((ref) async => Result.ok(notes)),
    ];
    return ProviderScope(key: UniqueKey(), overrides: overrides, child: MaterialApp.router(
      theme: AppTheme.light(), locale: const Locale('ar'), supportedLocales: L10n.supportedLocales,
      localizationsDelegates: const [L10n.delegate, GlobalMaterialLocalizations.delegate, GlobalWidgetsLocalizations.delegate, GlobalCupertinoLocalizations.delegate],
      routerConfig: GoRouter(initialLocation: '/', routes: [
        GoRoute(path: '/', builder: (_, _) => const Scaffold(body: VehiclesScreen())),
        GoRoute(path: '/wallet', builder: (_, _) { went = '/wallet'; return const Scaffold(body: Text('المحفظة')); }),
      ])));
  }

  void size(WidgetTester t) { t.view.physicalSize = const Size(1170, 2532); t.view.devicePixelRatio = 3; addTearDown(t.view.reset); }

  testWidgets('لا مستحقّات ⟵ لا سطر على الشاشة الأولى', (tester) async {
    size(tester);
    await tester.pumpWidget(app(invoices: [inv('1', '500.00', '500.00', status: 'paid')], notes: const []));
    await tester.pumpAndSettle();
    expect(find.text('مستحقّ عليك'), findsNothing);
  });

  testWidgets('فاتورة آجلة وسندها ⟵ مبلغ واحد لا ضعفه، ويفتح المحفظة', (tester) async {
    size(tester);
    await tester.pumpWidget(app(invoices: [inv('1', '1000.00', '0')], notes: [note('1', '1000.00')]));
    await tester.pumpAndSettle();
    expect(find.text('مستحقّ عليك'), findsOneWidget);
    expect(find.textContaining('1,000.00'), findsOneWidget, reason: 'لا 2,000 — السند وفاتورته شيء واحد');
    await tester.tap(find.text('مستحقّ عليك'));
    await tester.pumpAndSettle();
    expect(went, '/wallet');
  });

  testWidgets('سند متأخر ⟵ السطر يقول ما سيحدث، لا «متأخر» وحدها', (tester) async {
    size(tester);
    await tester.pumpWidget(app(invoices: [inv('1', '1000.00', '0')], notes: [note('1', '1000.00', overdue: true)]));
    await tester.pumpAndSettle();
    expect(find.text('تأخّر السداد — يبدأ الإنذار الرسمي ثم التنفيذ.'), findsOneWidget);
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/customer_due_overdue_light.png'));
  });
}
