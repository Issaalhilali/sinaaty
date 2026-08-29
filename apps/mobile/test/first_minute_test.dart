import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sinaaty/core/auth/token_store.dart';
import 'package:sinaaty/core/config/app_config.dart';
import 'package:sinaaty/core/di/core_providers.dart';
import 'package:sinaaty/core/result/result.dart';
import 'package:sinaaty/features/auth/domain/auth_entities.dart';
import 'package:sinaaty/features/auth/domain/auth_repository.dart';
import 'package:sinaaty/features/auth/presentation/providers.dart';
import 'package:sinaaty/features/auth/presentation/welcome_screen.dart';
import 'package:sinaaty/features/home/domain/effective_flavor.dart';
import 'package:sinaaty/features/home/presentation/home_shell.dart';
import 'package:sinaaty/features/vehicles/domain/vehicle.dart';
import 'package:sinaaty/features/work_orders/domain/work_order.dart';
import 'package:sinaaty/features/vehicles/domain/vehicles_repository.dart';
import 'package:sinaaty/features/vehicles/presentation/providers.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:sinaaty/core/l10n/app_localizations.dart';
import 'package:sinaaty/core/theme/app_theme.dart';
import 'workshop_flow_test.dart' show loadArabicFont;

/// الدقيقة الأولى للعميل: الترحيب يبيع الوعد، و«جهّز حسابك» يكتب في الحساب لا في الجهاز،
/// وبطاقة السيارة تعرض نبضها من سجلها — لا صفاً بارداً باسمها.

class _Auth implements AuthRepository {
  @override Future<Result<void>> deleteAccount() async => const Result.ok(null);
  String? nameAr; int saves = 0;
  _Auth({this.nameAr});
  @override Future<Result<({String phone, int expiresIn, String? debugCode})>> requestOtp(String phone) async => const Result.err(UnknownFailure());
  @override Future<Result<AuthSession>> verifyOtp({required String phone, required String code, required String platform, required String flavor}) async => const Result.err(UnknownFailure());
  @override Future<Result<void>> registerPushToken(String token, {required String platform, required String flavor}) async => const Result.ok(null);
  @override Future<Result<Me>> me() async => Result.ok(Me(id: 'u', phone: '+966512345678', fullNameAr: nameAr, platformRole: 'none', nafathVerified: false, orgs: const []));
  @override Future<Result<Me>> updateProfile({String? fullNameAr, String? email, bool clearEmail = false}) { if (fullNameAr != null) { nameAr = fullNameAr; saves++; } return me(); }
  @override Future<Result<void>> logout() async => const Result.ok(null);
}

class _Vehicles implements VehiclesRepository {
  final List<Vehicle> cars;
  _Vehicles(this.cars);
  @override Future<Result<List<Vehicle>>> list() async => Result.ok(cars);
  @override Future<Result<Vehicle>> add({String? vin, String? plate}) async => const Result.err(UnknownFailure());
  @override Future<Result<VehiclePassport>> passport(String id) async => const Result.err(UnknownFailure());
  @override Future<Result<String>> shareLink(String id) async => const Result.err(UnknownFailure());
}

void main() {
  setUpAll(loadArabicFont);

  group('قرار «جهّز حسابك» — صرف', () {
    const c = AppFlavor.customer;
    test('غياب السيارة هو السائق: بلا سيارةٍ يُقاد — حفظُ الاسم لا يقطع الرحلة', () {
      // الشرط القديم «بلا اسمٍ وبلا سيارة» معاً أخرج المستخدم من البوابة لحظة حفظ اسمه —
      // قبل خطوة السيارة التي هي مقصد الشاشة كله.
      expect(shouldGuideSetup(flavor: c, signedIn: true, carsLoaded: true, hasCars: false, dismissed: false), isTrue);
    });
    test('من عنده سيارة عرف طريقه', () {
      expect(shouldGuideSetup(flavor: c, signedIn: true, carsLoaded: true, hasCars: true, dismissed: false), isFalse);
    });
    test('«لم تصل القائمة بعد» ليس «بلا سيارة» — درس «سجّل ورشتك» نفسه', () {
      expect(shouldGuideSetup(flavor: c, signedIn: true, carsLoaded: false, hasCars: false, dismissed: false), isFalse);
    });
    test('من قال «لاحقاً» لا يُلحّ عليه، والشريك لا يُقاد أصلاً', () {
      expect(shouldGuideSetup(flavor: c, signedIn: true, carsLoaded: true, hasCars: false, dismissed: true), isFalse);
      expect(shouldGuideSetup(flavor: AppFlavor.partner, signedIn: true, carsLoaded: true, hasCars: false, dismissed: false), isFalse);
    });
  });

  Widget app({required _Auth auth, required List<Vehicle> cars, String initial = '/'}) {
    final ts = MemoryTokenStore();
    return ProviderScope(overrides: [
      appConfigProvider.overrideWithValue(const AppConfig(flavor: AppFlavor.customer, apiBaseUrl: 'http://x', appEnv: 'test', sentryDsn: '')),
      tokenStoreProvider.overrideWithValue(ts),
      authRepositoryProvider.overrideWithValue(auth),
      vehiclesRepositoryProvider.overrideWithValue(_Vehicles(cars)),
    ], child: MaterialApp.router(theme: AppTheme.light(), darkTheme: AppTheme.dark(), locale: const Locale('ar'), supportedLocales: L10n.supportedLocales,
      localizationsDelegates: const [L10n.delegate, GlobalMaterialLocalizations.delegate, GlobalWidgetsLocalizations.delegate, GlobalCupertinoLocalizations.delegate],
      routerConfig: GoRouter(initialLocation: initial, routes: [
      GoRoute(path: '/', builder: (_, _) => const HomeShell()),
      GoRoute(path: '/welcome', builder: (_, _) => const WelcomeScreen()),
      GoRoute(path: '/vehicles/add', builder: (_, _) => const Scaffold(body: Text('إضافة سيارة'))),
      GoRoute(path: '/vehicles/:id', builder: (_, s) => Scaffold(body: Text('سيارة ${s.pathParameters['id']}'))),
      GoRoute(path: '/work-orders/:id', builder: (_, s) => Scaffold(body: Text('أمر ${s.pathParameters['id']}'))),
      GoRoute(path: '/login', builder: (_, _) => const Scaffold(body: Text('دخول'))),
    ])));
  }

  Future<void> signIn(WidgetTester t) async {
    final el = t.element(find.byType(HomeShell));
    final container = ProviderScope.containerOf(el);
    await container.read(tokenStoreProvider).save(access: 'a', refresh: 'r');
    await container.read(authControllerProvider.notifier).restore();
    await t.pumpAndSettle();
  }

  testWidgets('الترحيب: ثلاثة وعود ثم «ابدأ» يكتب أنه رآها ويمضي للدخول', (t) async {
    SharedPreferences.setMockInitialValues({});
    await t.pumpWidget(app(auth: _Auth(), cars: const [], initial: '/welcome'));
    await t.pumpAndSettle();
    expect(find.text('قول وش فيها.. والعروض تجيك'), findsOneWidget);
    await t.tap(find.text('التالي')); await t.pumpAndSettle();
    expect(find.text('فلوسك محفوظة بضمان'), findsOneWidget);
    await t.tap(find.text('التالي')); await t.pumpAndSettle();
    expect(find.text('كل شي موثّق باسمك'), findsOneWidget);
    await t.tap(find.text('ابدأ')); await t.pumpAndSettle();
    expect(find.text('دخول'), findsOneWidget);
    expect((await SharedPreferences.getInstance()).getBool(WelcomeScreen.seenKey), isTrue);
  });

  testWidgets('«جهّز حسابك»: الاسم يُحفظ في الحساب عبر المستودع ثم تأتي خطوة السيارة', (t) async {
    SharedPreferences.setMockInitialValues({});
    final auth = _Auth();                                    // بلا اسم
    await t.pumpWidget(app(auth: auth, cars: const []));     // وبلا سيارات
    await t.pump(); await signIn(t);
    expect(find.text('جهّز حسابك'), findsOneWidget);
    await t.enterText(find.byType(TextField), 'مشعل العتيبي');
    await t.tap(find.text('التالي')); await t.pumpAndSettle();
    expect(auth.saves, 1);                                   // كُتب في الحساب لا في الجهاز
    expect(auth.nameAr, 'مشعل العتيبي');
    expect(find.text('أضف سيارتك'), findsOneWidget);         // الخطوة الثانية
    await t.tap(find.text('أضف سيارتي')); await t.pumpAndSettle();
    expect(find.text('إضافة سيارة'), findsOneWidget);        // مسار الإضافة الحقيقي
  });

  testWidgets('البطاقة الحيّة: آخر صيانة وضمانات من السجل — والإصلاح الجاري يعلو ويُفتح', (t) async {
    SharedPreferences.setMockInitialValues({});
    final cars = [
      Vehicle(id: 'v1', makeAr: 'تويوتا', modelAr: 'كامري', year: 2019, plate: 'أ ب ج 4821',
          lastServiceAt: DateTime(2026, 8, 20), activeWarranties: 2),
      const Vehicle(id: 'v2', makeAr: 'هوندا', modelAr: 'أكورد', year: 2021, plate: 'د م و 777', openWorkOrderId: 'wo9'),
    ];
    await t.pumpWidget(app(auth: _Auth(nameAr: 'مشعل'), cars: cars));
    await t.pump(); await signIn(t);
    expect(find.text('2 ضمان ساري'), findsOneWidget);
    expect(find.textContaining('آخر صيانة'), findsOneWidget);
    expect(find.text('في الورشة الآن — تابعها'), findsOneWidget);
    await t.ensureVisible(find.text('هوندا أكورد 2021'));                   // البطاقات أسفل الصفحة
    // ensureVisible يُدخل الحافة فقط — والشريط السفلي العائم يبتلع النقرة، فنمرر فوقه
    await t.drag(find.byType(Scrollable).first, const Offset(0, -160)); await t.pumpAndSettle();
    await t.tap(find.text('هوندا أكورد 2021')); await t.pumpAndSettle();
    expect(find.text('أمر wo9'), findsOneWidget);            // البطاقة تقود إلى الإصلاح الجاري
  });

  group('أولوية العميل — صرف', () {
    WorkOrder wo(String id, String st) => WorkOrder(id: id, number: 'WO-$id', status: st, paymentTerms: 'immediate', currentVersion: 1, titleAr: 'x', vehicleId: 'v', orgId: 'o', subtotal: '0', vatAmount: '0', total: '0', depositRequired: '0', items: const [], createdAt: DateTime(2026));
    test('ما ينتظر فعل العميل يتصدر، والمسودة آخر الصف', () {
      // مسودةُ صفرٍ تصدّرت فوق «بانتظار اعتمادك» لمجرد أنها الأحدث (جولة الصفحات 2026-08-28)
      final l = [wo('d', 'draft'), wo('p', 'in_progress'), wo('a', 'awaiting_approval'), wo('r', 'ready_for_pickup')]
        ..sort((a, b) => a.customerPriority.compareTo(b.customerPriority));
      expect(l.map((w) => w.status).toList(), ['awaiting_approval', 'ready_for_pickup', 'in_progress', 'draft']);
    });
  });
}
