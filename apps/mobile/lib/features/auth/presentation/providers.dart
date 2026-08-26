import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/di/core_providers.dart';
import '../data/auth_repository_impl.dart';
import '../domain/auth_entities.dart';
import '../../../core/push/push_tokens.dart';
import '../domain/auth_repository.dart';
import '../../../core/result/result.dart';
/// Composition root for the auth feature (the only file in presentation/ allowed to import data/).
final pushTokensProvider = Provider<PushTokens>((_) => FcmPushTokens());
final authRepositoryProvider = Provider<AuthRepository>((ref) => AuthRepositoryImpl(ref.watch(apiClientProvider), ref.watch(tokenStoreProvider)));
enum AuthStatus { unknown, signedOut, signedIn }
class AuthState { final AuthStatus status; final Me? me; const AuthState(this.status, [this.me]); }
class AuthController extends Notifier<AuthState> {
  @override AuthState build() { Future.microtask(restore); return const AuthState(AuthStatus.unknown); }
  Future<void> restore() async {
    final t = await ref.read(tokenStoreProvider).access(); if (t == null) { state = const AuthState(AuthStatus.signedOut); return; }
    final me = await ref.read(authRepositoryProvider).me();
    state = me.when(ok: (m) => AuthState(AuthStatus.signedIn, m), err: (_) => const AuthState(AuthStatus.signedOut));
  }
  Future<void> signedIn() async { final me = await ref.read(authRepositoryProvider).me(); state = me.when(ok: (m) => AuthState(AuthStatus.signedIn, m), err: (_) => const AuthState(AuthStatus.signedOut)); }
  Future<Result<Me>> setName(String fullNameAr) async {
    final r = await ref.read(authRepositoryProvider).setName(fullNameAr);
    r.when(ok: (m) => state = AuthState(AuthStatus.signedIn, m), err: (_) {});
    return r;
  }
  Future<void> signOut() async { await ref.read(authRepositoryProvider).logout(); state = const AuthState(AuthStatus.signedOut); }
}
final authControllerProvider = NotifierProvider<AuthController, AuthState>(AuthController.new);
