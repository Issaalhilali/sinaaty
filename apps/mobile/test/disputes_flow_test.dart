import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
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
import 'package:sinaaty/features/billing/presentation/providers.dart';
import 'package:sinaaty/features/disputes/domain/dispute.dart';
import 'package:sinaaty/features/disputes/domain/disputes_repository.dart';
import 'package:sinaaty/features/disputes/presentation/dispute_screen.dart';
import 'package:sinaaty/features/disputes/presentation/providers.dart';
import 'package:sinaaty/features/work_orders/presentation/providers.dart';
import 'package:sinaaty/features/work_orders/presentation/work_order_screen.dart';

import 'customer_flow_test.dart' show FakeAuth, FakeBilling, FakeWorkOrders, loadArabicFont;
import 'feature_flags_test.dart' show FakeFlags;

/// The dispute journey both parties get: one entry in «المزيد» once the order is past approval,
/// a sheet that says the money will be held BEFORE the button, and one screen — status, held
/// amount, conversation with photo evidence. No decision buttons: the platform decides.
class FakeDisputes implements DisputesRepository {
  final store = <Dispute>[];
  ({String? wo, String? po, String cat, String desc, List<String> media})? lastOpen;
  ({String id, String body, List<String> media})? lastMessage;
  int uploads = 0;

  @override Future<Result<List<Dispute>>> mine() async => Result.ok(List.of(store));
  @override Future<Result<Dispute>> byId(String id) async => Result.ok(store.firstWhere((d) => d.id == id));
  @override Future<Result<Dispute>> open({String? workOrderId, String? partOrderId, required String category, required String descriptionAr, List<String> mediaIds = const []}) async {
    lastOpen = (wo: workOrderId, po: partOrderId, cat: category, desc: descriptionAr, media: mediaIds);
    final d = Dispute(id: 'd1', number: 'DS-2026-000001', status: 'open', category: category, descriptionAr: descriptionAr, workOrderId: workOrderId, partOrderId: partOrderId, createdAt: DateTime(2026, 8, 21, 10), escrow: (status: 'frozen', amount: '1368.50'));
    store.add(d);
    return Result.ok(d);
  }
  @override Future<Result<void>> message(String id, {required String bodyAr, List<String> mediaIds = const []}) async {
    lastMessage = (id: id, body: bodyAr, media: mediaIds);
    final d = store.firstWhere((x) => x.id == id);
    store[store.indexOf(d)] = Dispute(id: d.id, number: d.number, status: d.status, category: d.category, descriptionAr: d.descriptionAr, workOrderId: d.workOrderId, partOrderId: d.partOrderId, createdAt: d.createdAt, escrow: d.escrow,
      messages: [...d.messages, DisputeMessage(id: 'm${d.messages.length + 1}', authorNameAr: 'أبو فهد', bodyAr: bodyAr, createdAt: DateTime(2026, 8, 21, 11))],
      media: [...d.media, for (final m in mediaIds) DisputeMedia(mediaId: m, mimeType: 'image/jpeg')]);
    return const Result.ok(null);
  }
  @override Future<Result<String>> uploadEvidence(List<int> bytes, {required String mimeType}) async { uploads++; return Result.ok('m-up-$uploads'); }
}

void main() {
  setUpAll(loadArabicFont);
  late FakeWorkOrders wo; late FakeDisputes ds; late MemoryTokenStore ts;
  setUp(() async { wo = FakeWorkOrders()..status = 'in_progress'; ds = FakeDisputes(); ts = MemoryTokenStore(); await ts.save(access: 'a', refresh: 'r'); });

  Widget app({Map<String, bool> flags = const {'disputes': true}, bool dark = false}) => ProviderScope(key: UniqueKey(), overrides: [
    appConfigProvider.overrideWithValue(const AppConfig(flavor: AppFlavor.customer, apiBaseUrl: 'http://x', appEnv: 'test', sentryDsn: '')),
    authRepositoryProvider.overrideWithValue(FakeAuth()), tokenStoreProvider.overrideWithValue(ts),
    workOrdersRepositoryProvider.overrideWithValue(wo), workOrderRealtimeProvider.overrideWithValue(wo),
    billingRepositoryProvider.overrideWithValue(FakeBilling()),
    disputesRepositoryProvider.overrideWithValue(ds),
    flagsRepositoryProvider.overrideWithValue(FakeFlags(Result.ok(FeatureFlags(flags)))),
  ], child: MaterialApp.router(theme: AppTheme.light(), darkTheme: AppTheme.dark(), themeMode: dark ? ThemeMode.dark : ThemeMode.light, locale: const Locale('ar'), supportedLocales: L10n.supportedLocales,
    localizationsDelegates: const [L10n.delegate, GlobalMaterialLocalizations.delegate, GlobalWidgetsLocalizations.delegate, GlobalCupertinoLocalizations.delegate],
    routerConfig: GoRouter(initialLocation: '/', routes: [
      GoRoute(path: '/', builder: (_, _) => const WorkOrderScreen(id: 'wo1')),
      GoRoute(path: '/disputes/:id', builder: (_, s) => DisputeScreen(id: s.pathParameters['id']!, pickImage: () async => Uint8List.fromList(List.filled(64, 7)))),
      GoRoute(path: '/invoices/:id', builder: (_, _) => const Scaffold(body: SizedBox())),
    ])));

  void size(WidgetTester t) { t.view.physicalSize = const Size(1170, 2532); t.view.devicePixelRatio = 3; addTearDown(t.view.reset); }

  testWidgets('open a dispute from the order → held money said upfront → conversation with photo evidence', (tester) async {
    size(tester);
    await tester.pumpWidget(app()); await tester.pumpAndSettle();
    await tester.tap(find.byIcon(Icons.more_horiz)); await tester.pumpAndSettle();
    await tester.tap(find.text('فتح نزاع')); await tester.pumpAndSettle();
    expect(find.text('المبلغ محفوظ حتى يُحل النزاع'), findsOneWidget);          // said before the button
    await tester.tap(find.text('جودة التنفيذ'));
    await tester.enterText(find.byType(TextField).last, 'القطعة المركبة ليست الأصلية المتفق عليها في العرض.');
    await tester.tap(find.text('افتح النزاع')); await tester.pumpAndSettle();
    expect(ds.lastOpen, isNotNull);
    expect(ds.lastOpen!.wo, 'wo1');
    expect(ds.lastOpen!.cat, 'quality');
    // Landed on the dispute screen: status, held amount, the platform-decides sentence.
    expect(find.textContaining('DS-2026-000001'), findsWidgets);
    expect(find.text('المبلغ محفوظ حتى يُحل النزاع'), findsOneWidget);
    expect(find.textContaining('1,368.50'), findsOneWidget);
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/dispute_light.png'));
    // A text message, then a photo: the upload happens through the existing media pipeline.
    await tester.enterText(find.byType(TextField), 'أرفقت صورة القطعة.');
    await tester.tap(find.byIcon(Icons.add_a_photo_outlined)); await tester.pumpAndSettle();
    expect(ds.uploads, 1);
    expect(ds.lastMessage!.media, ['m-up-1']);
    expect(ds.lastMessage!.body, 'أرفقت صورة القطعة.');
  });

  testWidgets('the open dispute shows as a status card on the order; dark golden', (tester) async {
    size(tester);
    await ds.open(workOrderId: 'wo1', category: 'quality', descriptionAr: 'وصف المشكلة بما يكفي من الحروف.');
    await tester.pumpWidget(app(dark: true)); await tester.pumpAndSettle();
    expect(find.text('نزاع مفتوح على هذا الطلب'), findsOneWidget);
    await tester.tap(find.text('نزاع مفتوح على هذا الطلب')); await tester.pumpAndSettle();
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/dispute_dark.png'));
  });

  testWidgets('disputes flag off: no entry, no card — the feature does not exist', (tester) async {
    size(tester);
    await ds.open(workOrderId: 'wo1', category: 'quality', descriptionAr: 'وصف المشكلة بما يكفي من الحروف.');
    await tester.pumpWidget(app(flags: const {'disputes': false})); await tester.pumpAndSettle();
    expect(find.byIcon(Icons.more_horiz), findsNothing);
    expect(find.text('نزاع مفتوح على هذا الطلب'), findsNothing);
  });
}
