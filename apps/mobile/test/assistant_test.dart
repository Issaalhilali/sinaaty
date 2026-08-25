import 'package:flutter/material.dart';
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
import 'package:sinaaty/core/voice/assistant.dart';
import 'package:sinaaty/core/voice/voice_input.dart';
import 'package:sinaaty/features/auth/presentation/providers.dart';
import 'package:sinaaty/features/home/presentation/home_shell.dart';
import 'package:sinaaty/features/notifications/presentation/providers.dart';
import 'package:sinaaty/features/parts/presentation/providers.dart';
import 'package:sinaaty/features/transport/presentation/providers.dart';
import 'package:sinaaty/features/vehicles/presentation/providers.dart';
import 'package:sinaaty/features/workshop/presentation/providers.dart';

import 'fleet_flow_test.dart' show FakeAuth, loadArabicFont;

/// The voice assistant executes the errand's first mile: one spoken sentence lands the user on the
/// right screen. Money/legal actions stay behind their own taps — the parser has no such targets.

class FakeVoice implements VoiceInput {
  final String text;
  FakeVoice(this.text);
  @override Future<bool> init() async => true;
  @override Stream<String> start({String localeId = 'ar-SA'}) => Stream.fromIterable([text]);
  @override Future<void> stop() async {}
}

class DeafVoice implements VoiceInput {
  @override Future<bool> init() async => false;
  @override Stream<String> start({String localeId = 'ar-SA'}) => const Stream.empty();
  @override Future<void> stop() async {}
}

void main() {
  setUpAll(loadArabicFont);

  group('parseAssistant — the rule table is deterministic', () {
    test('customer sentences land on their targets, normalization included', () {
      expect(parseAssistant('اطلب لي سطحه الحين', partner: false)!.target, AssistantTarget.tow);
      expect(parseAssistant('أبغى قطع غيار للكامري', partner: false)!.target, AssistantTarget.partRequest);
      expect(parseAssistant('أصلح سيارتي فيها صوت غريب', partner: false)!.target, AssistantTarget.serviceRequest);
      expect(parseAssistant('افتح محفظتي', partner: false)!.target, AssistantTarget.wallet);
      expect(parseAssistant('وريني الضمانات', partner: false)!.target, AssistantTarget.warranties);
      expect(parseAssistant('سياراتي', partner: false)!.target, AssistantTarget.vehicles);
    });
    test('partner sentences use the partner table', () {
      expect(parseAssistant('افتح أمر جديد', partner: true)!.target, AssistantTarget.newOrder);
      expect(parseAssistant('الطلبات القريبة', partner: true)!.target, AssistantTarget.nearbyRequests);
      expect(parseAssistant('المحفظه', partner: true)!.target, AssistantTarget.wallet);
    });
    test('nonsense and empty return null — the caller shows examples, never a dead end', () {
      expect(parseAssistant('الطقس اليوم حار', partner: false), isNull);
      expect(parseAssistant('   ', partner: false), isNull);
    });
  });

  late MemoryTokenStore ts;
  setUp(() async { ts = MemoryTokenStore(); await ts.save(access: 'a', refresh: 'r'); });

  Widget app({required VoiceInput voice}) => ProviderScope(key: UniqueKey(), overrides: [
    appConfigProvider.overrideWithValue(const AppConfig(flavor: AppFlavor.customer, apiBaseUrl: 'http://x', appEnv: 'test', sentryDsn: '')),
    authRepositoryProvider.overrideWithValue(FakeAuth()), tokenStoreProvider.overrideWithValue(ts),
    voiceInputProvider.overrideWithValue(voice),
    vehiclesProvider.overrideWith((ref) async => const Result.ok([])),
    myPartRequestsProvider.overrideWith((ref) async => const Result.ok([])),
    myTowJobsProvider.overrideWith((ref) async => const Result.ok([])),
    unreadCountProvider.overrideWith((ref) async => 0),
    currentOrgInfoProvider.overrideWith((ref) async => null),
  ], child: MaterialApp.router(theme: AppTheme.light(), locale: const Locale('ar'), supportedLocales: L10n.supportedLocales,
    localizationsDelegates: const [L10n.delegate, GlobalMaterialLocalizations.delegate, GlobalWidgetsLocalizations.delegate, GlobalCupertinoLocalizations.delegate],
    routerConfig: GoRouter(initialLocation: '/', routes: [
      GoRoute(path: '/', builder: (_, _) => const HomeShell()),
      GoRoute(path: '/tow/new', builder: (_, _) => const Scaffold(body: Center(child: Text('TOW-SCREEN')))),
    ])));

  void size(WidgetTester t) { t.view.physicalSize = const Size(1170, 2532); t.view.devicePixelRatio = 3; addTearDown(t.view.reset); }

  testWidgets('«اطلب سطحة» spoken at the shell mic lands on the tow screen', (tester) async {
    size(tester);
    await tester.pumpWidget(app(voice: FakeVoice('اطلب لي سطحة الحين')));
    await tester.pumpAndSettle();
    expect(find.byIcon(Icons.mic_none), findsOneWidget);
    await tester.tap(find.byIcon(Icons.mic_none));
    await tester.pumpAndSettle();
    await tester.tap(find.text('تم'));
    await tester.pumpAndSettle();
    expect(find.text('TOW-SCREEN'), findsOneWidget);
  });

  testWidgets('no dictation on the device → the mic goes after one honest attempt, not before', (tester) async {
    // فحص القدرة هو نفسه ما يطلب إذن التسجيل، فإجراؤه عند الإقلاع كان يضع سؤال الإذن فوق أول
    // شاشة يراها المستخدم (مشية أندرويد ٢٥ أغسطس). فالزر يظهر، وأول ضغطة تكشف الحقيقة وتخفيه.
    size(tester);
    await tester.pumpWidget(app(voice: DeafVoice()));
    await tester.pumpAndSettle();
    expect(find.byIcon(Icons.mic_none), findsWidgets);          // موجود قبل أي محاولة
    await tester.tap(find.byIcon(Icons.mic_none).first); await tester.pumpAndSettle();
    expect(find.text('الإملاء الصوتي غير متاح على هذا الجهاز.'), findsOneWidget);
    expect(find.byIcon(Icons.mic_none), findsNothing);          // ولا يبقى زرّاً ميتاً
  });
}
