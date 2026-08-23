import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
import 'package:sinaaty/core/voice/voice_input.dart';
import 'package:sinaaty/features/auth/presentation/providers.dart';
import 'package:sinaaty/features/billing/presentation/providers.dart';
import 'package:sinaaty/features/home/presentation/request_hub_screen.dart';
import 'package:sinaaty/features/parts/presentation/providers.dart';
import 'package:sinaaty/features/service_market/presentation/providers.dart';
import 'package:sinaaty/features/transport/presentation/providers.dart';
import 'package:sinaaty/features/vehicles/domain/vehicle.dart';
import 'package:sinaaty/features/vehicles/presentation/providers.dart';
import 'package:sinaaty/features/work_orders/presentation/providers.dart';
import 'package:sinaaty/features/workshop/domain/workshop.dart';
import 'package:sinaaty/features/workshop/presentation/order_screen.dart';
import 'package:sinaaty/features/workshop/presentation/providers.dart';
import 'package:sinaaty/features/workshop/presentation/voice_invoice_screen.dart';

import 'customer_flow_test.dart' show FakeBilling;
import 'feature_flags_test.dart' show FakeFlags;
import 'service_market_test.dart' show FakeServiceMarket;
import 'workshop_flow_test.dart' show FakeBackend, FakeAuth, fakeJpeg, loadArabicFont;

/// Voice as an input method everywhere (owner's directive, voice-input scope): dictation fills any
/// request field; and the workshop dictates its items — recorded, uploaded, extracted, then priced
/// by the human before anything touches the order. Upload failure loses nothing.
class FakeVoice implements VoiceInput {
  final bool available; final List<String> script;
  FakeVoice({this.available = true, this.script = const ['تبديل', 'تبديل دسكات أمامية مع أجور الفك']});
  @override Future<bool> init() async => available;
  @override Stream<String> start({String localeId = 'ar-SA'}) async* { for (final t in script) { yield t; } }
  @override Future<void> stop() async {}
}

class FakeRecorder implements VoiceRecorder {
  final bool works;
  FakeRecorder({this.works = true});
  @override Future<bool> begin() async => works;
  @override Future<Uint8List?> finish() async => works ? fakeJpeg : null;
}

void main() {
  setUpAll(loadArabicFont);
  late FakeBackend be; late MemoryTokenStore ts;
  setUp(() async {
    be = FakeBackend(); ts = MemoryTokenStore(); await ts.save(access: 'a', refresh: 'r');
    await be.create(const NewWorkOrder(orgId: 'org1', plate: 'x', customerPhone: '+966512345678', titleAr: 'سمكرة رفرف', paymentTerms: 'on_delivery', items: [NewItem(type: 'labor', descriptionAr: 'سمكرة', unitPrice: '1190')]));
    be.voiceNoteResult = const VoiceNote(id: 'vn1', transcriptAr: 'بدل دسكات أمامية بمئتين وستين مع أجور الفك',
      items: [
        VoiceProposal(type: 'part', descriptionAr: 'دسكات أمامية', quantity: '1', unitPrice: '260.00', heardAr: 'مئتين وستين', needsPrice: false),
        VoiceProposal(type: 'labor', descriptionAr: 'أجور فك وتركيب', quantity: '1', needsPrice: true),
      ]);
  });

  Widget partnerApp(String initial, {Map<String, bool> flags = const {'voice_to_invoice': true}, VoiceInput? voice, VoiceRecorder? recorder}) => ProviderScope(key: UniqueKey(), overrides: [
    appConfigProvider.overrideWithValue(const AppConfig(flavor: AppFlavor.partner, apiBaseUrl: 'http://x', appEnv: 'test', sentryDsn: '')), tokenStoreProvider.overrideWithValue(ts),
    authRepositoryProvider.overrideWithValue(FakeAuth()), workshopRepositoryProvider.overrideWithValue(be), workOrdersRepositoryProvider.overrideWithValue(be), workOrderRealtimeProvider.overrideWithValue(be), billingRepositoryProvider.overrideWithValue(FakeBilling()), pendingActionsProvider.overrideWithValue(be),
    flagsRepositoryProvider.overrideWithValue(FakeFlags(Result.ok(FeatureFlags(flags)))),
    voiceInputProvider.overrideWithValue(voice ?? FakeVoice()), voiceRecorderProvider.overrideWithValue(recorder ?? FakeRecorder()),
  ], child: MaterialApp.router(theme: AppTheme.light(), locale: const Locale('ar'), supportedLocales: L10n.supportedLocales,
    localizationsDelegates: const [L10n.delegate, GlobalMaterialLocalizations.delegate, GlobalWidgetsLocalizations.delegate, GlobalCupertinoLocalizations.delegate],
    routerConfig: GoRouter(initialLocation: initial, routes: [
      GoRoute(path: '/ws/orders/wo1', builder: (_, _) => const WorkshopOrderScreen(id: 'wo1'), routes: [GoRoute(path: 'voice', builder: (_, _) => const VoiceInvoiceScreen(workOrderId: 'wo1'))]),
    ])));

  void size(WidgetTester t) { t.view.physicalSize = const Size(1170, 2532); t.view.devicePixelRatio = 3; addTearDown(t.view.reset); }

  testWidgets('dictation fills the fix-car description through the mic on the field', (tester) async {
    size(tester);
    final market = FakeServiceMarket();
    await tester.pumpWidget(ProviderScope(key: UniqueKey(), overrides: [
      appConfigProvider.overrideWithValue(const AppConfig(flavor: AppFlavor.customer, apiBaseUrl: 'http://x', appEnv: 'test', sentryDsn: '')), tokenStoreProvider.overrideWithValue(ts),
      authRepositoryProvider.overrideWithValue(FakeAuth()),
      flagsRepositoryProvider.overrideWithValue(FakeFlags(const Result.ok(FeatureFlags({'service_marketplace': true})))),
      serviceMarketRepositoryProvider.overrideWithValue(market),
      voiceInputProvider.overrideWithValue(FakeVoice()),
      vehiclesProvider.overrideWith((ref) async => const Result.ok([Vehicle(id: 'v1', vin: 'JTDKN3DU0A0123456', plate: 'أ ب ج 4821', makeAr: 'تويوتا', modelAr: 'كامري', year: 2019, odometerKm: 84250)])),
      myPartRequestsProvider.overrideWith((ref) async => const Result.ok([])),
      myTowJobsProvider.overrideWith((ref) async => const Result.ok([])),
    ], child: MaterialApp.router(theme: AppTheme.light(), locale: const Locale('ar'), supportedLocales: L10n.supportedLocales,
      localizationsDelegates: const [L10n.delegate, GlobalMaterialLocalizations.delegate, GlobalWidgetsLocalizations.delegate, GlobalCupertinoLocalizations.delegate],
      routerConfig: GoRouter(initialLocation: '/', routes: [GoRoute(path: '/', builder: (_, _) => const Scaffold(body: RequestHubScreen()))]))));
    await tester.pumpAndSettle();
    await tester.tap(find.text('أصلح سيارتي')); await tester.pumpAndSettle();
    await tester.tap(find.byIcon(Icons.mic_none).first); await tester.pumpAndSettle();
    expect(find.text('تبديل دسكات أمامية مع أجور الفك'), findsOneWidget);      // live words on the voice sheet
    await tester.tap(find.text('تم')); await tester.pumpAndSettle();
    expect(find.widgetWithText(TextField, 'تبديل دسكات أمامية مع أجور الفك'), findsOneWidget);
  });

  testWidgets('voice → items: dictate, upload, review with prices, apply through the normal path', (tester) async {
    size(tester);
    await tester.pumpWidget(partnerApp('/ws/orders/wo1/voice')); await tester.pumpAndSettle();
    expect(find.text('تبديل دسكات أمامية مع أجور الفك'), findsOneWidget);      // live transcript
    await tester.tap(find.text('تم')); await tester.pumpAndSettle();
    expect(be.lastVoiceNote!.hint, 'تبديل دسكات أمامية مع أجور الفك');         // on-device transcript rides as the hint
    expect(find.textContaining('سُمع: بدل دسكات'), findsOneWidget);            // the server transcript, reviewable
    expect(find.text('يحتاج سعراً'), findsOneWidget);                          // the unpriced line says so
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/voice_review_light.png'));
    await tester.enterText(find.byType(TextField).last, '120'); await tester.pumpAndSettle();
    await tester.tap(find.text('أضف البنود المسعّرة')); await tester.pumpAndSettle();
    expect(be.lastApplied!.length, 2);
    expect(be.lastApplied!.map((i) => i.unitPrice), containsAll(['260.00', '120.00']));
    expect(find.text('أُضيفت البنود — تحتاج إعادة اعتماد العميل'), findsOneWidget);
  });

  testWidgets('upload failure loses nothing: the dictated text stays and retry completes the flow', (tester) async {
    size(tester);
    await tester.pumpWidget(partnerApp('/ws/orders/wo1/voice')); await tester.pumpAndSettle();
    be.offline = true;
    await tester.tap(find.text('تم')); await tester.pumpAndSettle();
    expect(find.textContaining('نصك محفوظ'), findsOneWidget);                  // the failure says what it kept
    expect(find.text('تبديل دسكات أمامية مع أجور الفك'), findsOneWidget);      // and it kept it
    be.offline = false;
    await tester.tap(find.text('أعد الرفع')); await tester.pumpAndSettle();
    expect(be.lastVoiceNote!.hint, 'تبديل دسكات أمامية مع أجور الفك');
    expect(find.textContaining('سُمع:'), findsWidgets);                        // review reached (note + per-line hints)
  });

  testWidgets('a session that dies instantly in dev flips the sheet to typing — never a dead end', (tester) async {
    size(tester);
    final market = FakeServiceMarket();
    await tester.pumpWidget(ProviderScope(key: UniqueKey(), overrides: [
      appConfigProvider.overrideWithValue(const AppConfig(flavor: AppFlavor.customer, apiBaseUrl: 'http://x', appEnv: 'dev', sentryDsn: '')), tokenStoreProvider.overrideWithValue(ts),
      authRepositoryProvider.overrideWithValue(FakeAuth()),
      flagsRepositoryProvider.overrideWithValue(FakeFlags(const Result.ok(FeatureFlags({'service_marketplace': true})))),
      serviceMarketRepositoryProvider.overrideWithValue(market),
      voiceInputProvider.overrideWithValue(FakeVoice(script: const [])),      // the engine accepts, the session dies empty
      vehiclesProvider.overrideWith((ref) async => const Result.ok([Vehicle(id: 'v1', vin: 'JTDKN3DU0A0123456', plate: 'أ ب ج 4821', makeAr: 'تويوتا', modelAr: 'كامري', year: 2019, odometerKm: 84250)])),
      myPartRequestsProvider.overrideWith((ref) async => const Result.ok([])),
      myTowJobsProvider.overrideWith((ref) async => const Result.ok([])),
    ], child: MaterialApp.router(theme: AppTheme.light(), locale: const Locale('ar'), supportedLocales: L10n.supportedLocales,
      localizationsDelegates: const [L10n.delegate, GlobalMaterialLocalizations.delegate, GlobalWidgetsLocalizations.delegate, GlobalCupertinoLocalizations.delegate],
      routerConfig: GoRouter(initialLocation: '/', routes: [GoRoute(path: '/', builder: (_, _) => const Scaffold(body: RequestHubScreen()))]))));
    await tester.pumpAndSettle();
    await tester.tap(find.text('أصلح سيارتي')); await tester.pumpAndSettle();
    await tester.tap(find.byIcon(Icons.mic_none).first); await tester.pumpAndSettle();
    expect(find.textContaining('الإملاء لا يعمل'), findsOneWidget);           // the sheet flipped, it did not die
    await tester.enterText(find.byType(TextField).last, 'صوت طقطقة من الأمام');
    await tester.tap(find.text('تم')); await tester.pumpAndSettle();
    expect(find.widgetWithText(TextField, 'صوت طقطقة من الأمام'), findsOneWidget);
  });

  testWidgets('flag off or no dictation on the device: the menu entry does not exist', (tester) async {
    size(tester);
    await tester.pumpWidget(partnerApp('/ws/orders/wo1', flags: const {'voice_to_invoice': false})); await tester.pumpAndSettle();
    await tester.tap(find.byIcon(Icons.more_horiz)); await tester.pumpAndSettle();
    expect(find.text('أملِ البنود صوتاً'), findsNothing);
    await tester.tap(find.text('تقرير الحادث')); await tester.pumpAndSettle();  // close the menu by navigating away is overkill — dismiss
    await tester.pumpWidget(partnerApp('/ws/orders/wo1', voice: FakeVoice(available: false))); await tester.pumpAndSettle();
    await tester.tap(find.byIcon(Icons.more_horiz)); await tester.pumpAndSettle();
    expect(find.text('أملِ البنود صوتاً'), findsNothing);                       // flag on, but the device cannot dictate
  });
}
