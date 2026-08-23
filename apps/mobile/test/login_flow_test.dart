import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:sinaaty/core/config/app_config.dart';
import 'package:sinaaty/core/di/core_providers.dart';
import 'package:sinaaty/core/l10n/app_localizations.dart';
import 'package:sinaaty/core/result/result.dart';
import 'package:sinaaty/core/theme/app_theme.dart';
import 'package:sinaaty/features/auth/domain/auth_entities.dart';
import 'package:sinaaty/features/auth/domain/auth_repository.dart';
import 'package:sinaaty/features/auth/presentation/login_screen.dart';
import 'package:sinaaty/features/auth/presentation/providers.dart';

class FakeAuthRepo implements AuthRepository {
  String? requested;
  @override Future<Result<({String phone, int expiresIn, String? debugCode})>> requestOtp(String phone) async { requested = phone; return Result.ok((phone: phone, expiresIn: 300, debugCode: '123456')); }
  @override Future<Result<AuthSession>> verifyOtp({required String phone, required String code, required String platform}) async => const Result.ok(AuthSession(accessToken: 'a', refreshToken: 'r', userId: 'u'));
  @override Future<Result<Me>> me() async => const Result.ok(Me(id: 'u', platformRole: 'none', nafathVerified: false, orgs: []));
  @override Future<Result<Me>> setName(String fullNameAr) => me();
  @override Future<Result<void>> logout() async => const Result.ok(null);
}
void main() {
  testWidgets('login screen validates phone locally, then requests OTP with E.164 and navigates', (tester) async {
    final repo = FakeAuthRepo();
    final router = GoRouter(routes: [GoRoute(path: '/', builder: (_, _) => const LoginScreen()), GoRoute(path: '/login/otp', builder: (_, _) => const Scaffold(body: Text('otp-screen')))]);
    await tester.pumpWidget(ProviderScope(
      overrides: [appConfigProvider.overrideWithValue(const AppConfig(flavor: AppFlavor.customer, apiBaseUrl: 'http://x', appEnv: 'test', sentryDsn: '')), authRepositoryProvider.overrideWithValue(repo)],
      child: MaterialApp.router(theme: AppTheme.light(), locale: const Locale('ar'), supportedLocales: L10n.supportedLocales, localizationsDelegates: const [L10n.delegate, GlobalMaterialLocalizations.delegate, GlobalWidgetsLocalizations.delegate, GlobalCupertinoLocalizations.delegate], routerConfig: router),
    ));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), '0111');
    await tester.tap(find.text('أرسل الرمز')); await tester.pump();
    expect(find.text('أدخل رقم جوال سعودي صحيح.'), findsOneWidget); expect(repo.requested, isNull);
    await tester.enterText(find.byType(TextField), '0501234567');
    await tester.tap(find.text('أرسل الرمز')); await tester.pumpAndSettle();
    expect(repo.requested, '+966501234567'); expect(find.text('otp-screen'), findsOneWidget);
  });
}
