import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/otp_screen.dart';
import '../../features/auth/presentation/providers.dart';
import '../../features/home/presentation/home_shell.dart';
import '../di/core_providers.dart';
/// go_router with an auth guard: unknown → splash, signedOut → /login, signedIn → /.
final routerProvider = Provider<GoRouter>((ref) {
  final notifier = _AuthListenable(ref);
  return GoRouter(
    initialLocation: '/', refreshListenable: notifier,
    redirect: (ctx, state) {
      final auth = ref.read(authControllerProvider); final loggingIn = state.matchedLocation.startsWith('/login');
      if (auth.status == AuthStatus.unknown) return state.matchedLocation == '/splash' ? null : '/splash';
      if (auth.status == AuthStatus.signedOut) return loggingIn ? null : '/login';
      if (loggingIn || state.matchedLocation == '/splash') return '/';
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, _) => const Scaffold(body: Center(child: CircularProgressIndicator()))),
      GoRoute(path: '/login', builder: (_, _) => const LoginScreen(), routes: [GoRoute(path: 'otp', builder: (_, s) { final e = (s.extra as Map?) ?? {}; return OtpScreen(phone: e['phone'] as String? ?? '', debugCode: e['debug'] as String?); })]),
      GoRoute(path: '/', builder: (_, _) => const HomeShell()),
    ],
  );
});
class _AuthListenable extends ChangeNotifier { _AuthListenable(Ref ref) { ref.listen(authControllerProvider, (_, _) => notifyListeners()); ref.listen(sessionExpiredProvider, (_, _) { ref.read(authControllerProvider.notifier).signOut(); }); } }
