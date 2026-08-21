import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:sinaaty/core/auth/token_store.dart';
import 'package:sinaaty/core/config/app_config.dart';
import 'package:sinaaty/core/di/core_providers.dart';
import 'package:sinaaty/core/flags/feature_flags.dart';
import 'package:sinaaty/core/l10n/app_localizations.dart';
import 'package:sinaaty/core/result/result.dart';
import 'package:sinaaty/core/theme/app_theme.dart';
import 'package:sinaaty/features/auth/presentation/providers.dart';
import 'package:sinaaty/features/billing/domain/billing.dart';
import 'package:sinaaty/features/billing/presentation/providers.dart';
import 'package:sinaaty/features/billing/presentation/wallet_screen.dart';
import 'package:sinaaty/features/home/presentation/request_hub_screen.dart';
import 'package:sinaaty/features/parts/presentation/providers.dart';
import 'package:sinaaty/features/transport/presentation/providers.dart';
import 'package:sinaaty/features/vehicles/presentation/providers.dart';

import 'fleet_flow_test.dart' show FakeAuth, loadArabicFont;

/// A flag is a license to hide, never to show (p1 scope §1): an explicit `false` removes the
/// entry point entirely; a failed config load leaves everything visible.
class FakeFlags implements FlagsRepository {
  final Result<FeatureFlags> result;
  FakeFlags(this.result);
  @override Future<Result<FeatureFlags>> load({String? orgId}) async => result;
}

void main() {
  setUpAll(loadArabicFont);
  late MemoryTokenStore ts;
  setUp(() async { ts = MemoryTokenStore(); await ts.save(access: 'a', refresh: 'r'); });

  Widget app(Widget home, {required FlagsRepository flags, List<Override> extra = const []}) => ProviderScope(key: UniqueKey(), overrides: [
    appConfigProvider.overrideWithValue(const AppConfig(flavor: AppFlavor.customer, apiBaseUrl: 'http://x', appEnv: 'test', sentryDsn: '')),
    authRepositoryProvider.overrideWithValue(FakeAuth()), tokenStoreProvider.overrideWithValue(ts),
    flagsRepositoryProvider.overrideWithValue(flags),
    vehiclesProvider.overrideWith((ref) async => const Result.ok([])),
    myPartRequestsProvider.overrideWith((ref) async => const Result.ok([])),
    myTowJobsProvider.overrideWith((ref) async => const Result.ok([])),
    ...extra,
  ], child: MaterialApp.router(theme: AppTheme.light(), locale: const Locale('ar'), supportedLocales: L10n.supportedLocales,
    localizationsDelegates: const [L10n.delegate, GlobalMaterialLocalizations.delegate, GlobalWidgetsLocalizations.delegate, GlobalCupertinoLocalizations.delegate],
    routerConfig: GoRouter(initialLocation: '/', routes: [GoRoute(path: '/', builder: (_, _) => Scaffold(body: home))])));

  void size(WidgetTester t) { t.view.physicalSize = const Size(1170, 2532); t.view.devicePixelRatio = 3; addTearDown(t.view.reset); }

  testWidgets('tow off: the tow entry vanishes from «اطلب»; parts stays', (tester) async {
    size(tester);
    await tester.pumpWidget(app(const RequestHubScreen(), flags: FakeFlags(const Result.ok(FeatureFlags({'tow': false})))));
    await tester.pumpAndSettle();
    expect(find.text('أطلب سطحة'), findsNothing);
    expect(find.text('أطلب قطعة غيار'), findsOneWidget);
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/request_hub_tow_off_light.png'));
  });

  testWidgets('warranty_wallet off: the warranties entry vanishes from محفظتي', (tester) async {
    size(tester);
    final inv = Invoice(id: 'i1', number: 'INV-2026-000001', type: 'simplified', status: 'issued', workOrderId: 'w1', sellerNameAr: 'ورشة النور', subtotal: '1000.00', vatTotal: '150.00', total: '1150.00', paidTotal: '0', paymentTerms: 'on_delivery', issueDate: DateTime(2026, 8, 20), lines: const []);
    await tester.pumpWidget(app(const WalletScreen(), flags: FakeFlags(const Result.ok(FeatureFlags({'warranty_wallet': false}))), extra: [
      invoicesProvider.overrideWith((ref) async => Result.ok([inv])),
      notesProvider.overrideWith((ref) async => const Result.ok([])),
    ]));
    await tester.pumpAndSettle();
    expect(find.textContaining('1,150.00'), findsWidgets);
    expect(find.text('الضمانات'), findsNothing);
  });

  testWidgets('config load failure hides nothing — the flag is a license to hide, not to show', (tester) async {
    size(tester);
    await tester.pumpWidget(app(const RequestHubScreen(), flags: FakeFlags(const Result.err(NetworkFailure()))));
    await tester.pumpAndSettle();
    expect(find.text('أطلب سطحة'), findsOneWidget);
    expect(find.text('أطلب قطعة غيار'), findsOneWidget);
  });
}
