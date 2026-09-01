import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:go_router/go_router.dart';
import 'package:sinaaty/core/config/app_config.dart';
import 'package:sinaaty/core/di/core_providers.dart';
import 'package:sinaaty/core/l10n/app_localizations.dart';
import 'package:sinaaty/core/result/result.dart';
import 'package:sinaaty/core/theme/app_theme.dart';
import 'package:sinaaty/features/assist/domain/assist.dart';
import 'package:sinaaty/features/assist/presentation/ask_screen.dart';
import 'package:sinaaty/features/assist/presentation/providers.dart';
import 'package:sinaaty/features/vehicles/domain/vehicle.dart';
import 'package:sinaaty/features/vehicles/domain/vehicles_repository.dart';
import 'package:sinaaty/features/vehicles/presentation/providers.dart';
import 'workshop_flow_test.dart' show loadArabicFont;

/// «قل وش فيها» — الباب الواحد لمن ليس متمكناً من التقنية: يكتب جملته، ونحن نفهم ونرسل.
/// الاختبار يسلك طريق الشاشة كما يسلكه إنسان: يكتب، ينتظر الفهم، يقرأ الجواب، يرسل.

class _Assist implements AssistRepository {
  Triage? next; Failure? fail; String? asked;
  @override Future<Result<Triage>> analyze(String text) async {
    asked = text;
    if (fail != null) return Result.err(fail!);
    return Result.ok(next!);
  }
}

class _Vehicles implements VehiclesRepository {
  @override Future<Result<List<Vehicle>>> list() async => const Result.ok([]);
  @override Future<Result<Vehicle>> add({String? vin, String? plate}) async => const Result.err(UnknownFailure());
  @override Future<Result<VehiclePassport>> passport(String id) async => const Result.err(UnknownFailure());
  @override Future<Result<String>> shareLink(String id) async => const Result.err(UnknownFailure());
}

void main() {
  setUpAll(loadArabicFont);
  final assist = _Assist();

  Widget app() => ProviderScope(overrides: [
        appConfigProvider.overrideWithValue(const AppConfig(flavor: AppFlavor.customer, apiBaseUrl: 'http://x', appEnv: 'test', sentryDsn: '')),
        assistRepositoryProvider.overrideWithValue(assist),
        vehiclesRepositoryProvider.overrideWithValue(_Vehicles()),
      ], child: MaterialApp.router(theme: AppTheme.light(), locale: const Locale('ar'), supportedLocales: L10n.supportedLocales,
        localizationsDelegates: const [L10n.delegate, GlobalMaterialLocalizations.delegate, GlobalWidgetsLocalizations.delegate, GlobalCupertinoLocalizations.delegate],
        routerConfig: GoRouter(routes: [
          GoRoute(path: '/', builder: (_, _) => const AskScreen()),
          GoRoute(path: '/tow/new', builder: (_, _) => const Scaffold(body: Text('شاشة السطحة'))),
        ])));

  testWidgets('يكتب «ما تتحرك» فيفهم المساعد ويعرض سطحة — والإرسال يقود إلى المسار القائم', (t) async {
    t.view.physicalSize = const Size(1170, 2532); t.view.devicePixelRatio = 3; addTearDown(t.view.reset);
    assist.next = const Triage(kind: 'tow', titleAr: 'السيارة ما تتحرك', symptoms: [],
        urgent: true, confidence: .92, sayAr: 'فهمت إن سيارتك ما تتحرك — نطلب لك سطحة الحين؟');
    await t.pumpWidget(app()); await t.pumpAndSettle();
    await t.enterText(find.byType(TextField), 'السيارة ما تتحرك واقف على الطريق');
    await t.tap(find.text('حلّل وأرسل')); await t.pumpAndSettle();
    expect(assist.asked, 'السيارة ما تتحرك واقف على الطريق');       // كلامه هو يصل كما كتبه
    expect(find.textContaining('نطلب لك سطحة'), findsOneWidget);     // ويُقال له ما فُهم بلغته
    expect(find.text('عاجل'), findsOneWidget);
    await t.tap(find.text('اطلب سطحة الآن')); await t.pumpAndSettle();
    expect(find.text('شاشة السطحة'), findsOneWidget);                // لا مسار موازٍ — نفس الباب
  });

  testWidgets('قطعة: يعرض اسمها كما فهمه، ويبقى مخرجٌ لمن لم نفهمه', (t) async {
    t.view.physicalSize = const Size(1170, 2532); t.view.devicePixelRatio = 3; addTearDown(t.view.reset);
    assist.next = const Triage(kind: 'part', titleAr: 'ابغى دينمو كامري', symptoms: [],
        partNameAr: 'دينمو كامري 2019', urgent: false, confidence: .9,
        sayAr: 'فهمت إنك تبي «دينمو» لـكامري 2019 — نرسلها لمحلات القطع القريبة؟');
    await t.pumpWidget(app()); await t.pumpAndSettle();
    await t.enterText(find.byType(TextField), 'ابغى دينمو كامري ٢٠١٩');
    await t.tap(find.text('حلّل وأرسل')); await t.pumpAndSettle();
    expect(find.text('دينمو كامري 2019'), findsOneWidget);
    expect(find.text('مو هذا اللي أقصده'), findsOneWidget);          // لا نحبسه في فهمنا
    await t.tap(find.text('مو هذا اللي أقصده')); await t.pumpAndSettle();
    expect(find.text('حلّل وأرسل'), findsOneWidget);                  // يعود ليصحّح بنفسه
  });

  testWidgets('سقوط الخادم يُقال ولا يُبتلع', (t) async {
    t.view.physicalSize = const Size(1170, 2532); t.view.devicePixelRatio = 3; addTearDown(t.view.reset);
    assist.fail = const NetworkFailure();
    await t.pumpWidget(app()); await t.pumpAndSettle();
    await t.enterText(find.byType(TextField), 'فيها صوت');
    await t.tap(find.text('حلّل وأرسل')); await t.pumpAndSettle();
    expect(find.textContaining('تعذّر'), findsOneWidget);
    assist.fail = null;
  });
}
