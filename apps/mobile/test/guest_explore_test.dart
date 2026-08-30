import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sinaaty/core/auth/token_store.dart';
import 'package:sinaaty/core/config/app_config.dart';
import 'package:sinaaty/core/di/core_providers.dart';
import 'package:sinaaty/core/location/here.dart';
import 'package:sinaaty/core/l10n/app_localizations.dart';
import 'package:sinaaty/core/result/result.dart';
import 'package:sinaaty/core/routing/app_router.dart';
import 'package:sinaaty/core/theme/app_theme.dart';
import 'package:sinaaty/features/auth/domain/auth_entities.dart';
import 'package:sinaaty/features/auth/domain/auth_repository.dart';
import 'package:sinaaty/features/auth/presentation/providers.dart';
import 'package:sinaaty/features/explore/domain/explore.dart';
import 'package:sinaaty/features/explore/presentation/providers.dart';
import 'workshop_flow_test.dart' show loadArabicFont;

/// تصفح الضيف: «أستكشف أولاً» من الدخول → الورش من حوله بلا رمز — وكل فعلٍ يقوده للتسجيل.
/// يمشي بالحارس الحقيقي (routerProvider) لا بشبيهه: الحارس هو الذي انكسر مراراً في غير هذا الملف.

class _Here extends Here {
  const _Here();
  @override Future<({double lat, double lng})?> ifGranted() async => null;   // ضيف بلا إذن موقع → الرياض
}

class _Auth implements AuthRepository {
  @override Future<Result<({String phone, int expiresIn, String? debugCode})>> requestOtp(String phone) async => const Result.err(UnknownFailure());
  @override Future<Result<AuthSession>> verifyOtp({required String phone, required String code, required String platform, required String flavor}) async => const Result.err(UnknownFailure());
  @override Future<Result<void>> registerPushToken(String token, {required String platform, required String flavor}) async => const Result.ok(null);
  @override Future<Result<Me>> me() async => const Result.err(UnknownFailure());
  @override Future<Result<Me>> updateProfile({String? fullNameAr, String? email, bool clearEmail = false}) async => const Result.err(UnknownFailure());
  @override Future<Result<void>> logout() async => const Result.ok(null);
  @override Future<Result<void>> deleteAccount() async => const Result.ok(null);
}

class _Explore implements ExploreRepository {
  @override Future<Result<List<NearbyOrg>>> nearby({required double lat, required double lng, double radiusKm = 40, String? q}) async =>
      const Result.ok([
        NearbyOrg(id: 'o1', type: 'workshop', nameAr: 'ورشة النور للسمكرة', ratingAvg: '4.31', ratingCount: 64, city: 'الرياض', distanceKm: 3.2),
        NearbyOrg(id: 'o2', type: 'scrapyard', nameAr: 'تشليح الجزيرة', ratingAvg: '0.00', ratingCount: 0, city: 'الرياض', distanceKm: 11),
      ]);
}

void main() {
  setUpAll(loadArabicFont);

  testWidgets('ضيفٌ يستكشف ثم يُقاد إلى بابه: دخول → استكشاف → ورقة منشأة → «سجّل» → دخول', (t) async {
    SharedPreferences.setMockInitialValues({});
    await t.pumpWidget(ProviderScope(overrides: [
      appConfigProvider.overrideWithValue(const AppConfig(flavor: AppFlavor.customer, apiBaseUrl: 'http://x', appEnv: 'test', sentryDsn: '')),
      tokenStoreProvider.overrideWithValue(MemoryTokenStore()),
      authRepositoryProvider.overrideWithValue(_Auth()),
      hereProvider.overrideWithValue(const _Here()),
      exploreRepositoryProvider.overrideWithValue(_Explore()),
    ], child: Consumer(builder: (c, ref, _) => MaterialApp.router(
      theme: AppTheme.light(), locale: const Locale('ar'), supportedLocales: L10n.supportedLocales,
      localizationsDelegates: const [L10n.delegate, GlobalMaterialLocalizations.delegate, GlobalWidgetsLocalizations.delegate, GlobalCupertinoLocalizations.delegate],
      routerConfig: ref.watch(routerProvider),
    ))));
    // لا رموز محفوظة → الحارس يقود إلى الدخول
    final el = t.element(find.byType(MaterialApp).first);
    await ProviderScope.containerOf(el).read(authControllerProvider.notifier).restore();
    await t.pumpAndSettle();
    expect(find.text('أستكشف أولاً'), findsOneWidget);

    await t.tap(find.text('أستكشف أولاً'));
    await t.pumpAndSettle();
    expect(find.text('ورشة النور للسمكرة'), findsOneWidget);       // القائمة من المستودع
    expect(find.text('4.31'), findsOneWidget);                     // التقييم يظهر
    expect(find.text('جديدة'), findsOneWidget);                    // بلا تقييمات = «جديدة» لا «0.00»

    await t.tap(find.text('تشليح الجزيرة'));                       // ورقة المنشأة
    await t.pumpAndSettle();
    await t.tap(find.text('سجّل لتطلب منها'));
    await t.pumpAndSettle();
    expect(find.text('أستكشف أولاً'), findsOneWidget);             // عاد إلى بابه — الدخول
  });

  testWidgets('ضيف بلا إذن: /explore بلا وضع الضيف تُقاد إلى الدخول', (t) async {
    SharedPreferences.setMockInitialValues({});
    await t.pumpWidget(ProviderScope(overrides: [
      appConfigProvider.overrideWithValue(const AppConfig(flavor: AppFlavor.customer, apiBaseUrl: 'http://x', appEnv: 'test', sentryDsn: '')),
      tokenStoreProvider.overrideWithValue(MemoryTokenStore()),
      authRepositoryProvider.overrideWithValue(_Auth()),
      hereProvider.overrideWithValue(const _Here()),
      exploreRepositoryProvider.overrideWithValue(_Explore()),
    ], child: Consumer(builder: (c, ref, _) => MaterialApp.router(
      theme: AppTheme.light(), locale: const Locale('ar'), supportedLocales: L10n.supportedLocales,
      localizationsDelegates: const [L10n.delegate, GlobalMaterialLocalizations.delegate, GlobalWidgetsLocalizations.delegate, GlobalCupertinoLocalizations.delegate],
      routerConfig: ref.watch(routerProvider),
    ))));
    final container = ProviderScope.containerOf(t.element(find.byType(MaterialApp).first));
    await container.read(authControllerProvider.notifier).restore();
    await t.pumpAndSettle();
    container.read(routerProvider).go('/explore');                 // بلا enter()
    await t.pumpAndSettle();
    expect(find.text('أستكشف أولاً'), findsOneWidget);             // الحارس ردّه إلى الدخول
  });
}
