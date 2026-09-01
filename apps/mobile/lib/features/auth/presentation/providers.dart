import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/config/platform_info.dart';
import '../../../core/di/core_providers.dart';
import '../../../core/push/push_tokens.dart';
import '../../../core/result/result.dart';
import '../data/auth_repository_impl.dart';
import '../domain/auth_entities.dart';
import '../domain/auth_repository.dart';
/// Composition root for the auth feature (the only file in presentation/ allowed to import data/).
final pushTokensProvider = Provider<PushTokens>((_) => FcmPushTokens());
final authRepositoryProvider = Provider<AuthRepository>((ref) => AuthRepositoryImpl(ref.watch(apiClientProvider), ref.watch(tokenStoreProvider)));
enum AuthStatus { unknown, signedOut, signedIn }
class AuthState { final AuthStatus status; final Me? me; const AuthState(this.status, [this.me]); }
class AuthController extends Notifier<AuthState> {
  @override AuthState build() { Future.microtask(restore); return const AuthState(AuthStatus.unknown); }
  Future<void> restore() async {
    final t = await ref.read(tokenStoreProvider).access(); if (t == null) { state = const AuthState(AuthStatus.signedOut); return; }
    // ولا ننتظر الشبكة بلا سقف: مهلةٌ قصيرة ثم نفتح التطبيق. الخادم الساقط كان يُبقي صاحبه
    // أمام شاشة الإقلاع أبداً (مهلة الاتصال ١٥ث ثم بحثٌ عن الخادم فوقها) — والتطبيق لديه
    // رمزٌ صالح ويستطيع أن يفتح ويقول الحقيقة بدل أن يتجمّد.
    final me = await ref.read(authRepositoryProvider).me()
        .timeout(const Duration(seconds: 6), onTimeout: () => const Result.err(NetworkFailure()));
    // **انقطاعُ الشبكة ليس انتهاءَ جلسة.** كان أيُّ فشلٍ في /me يطرد صاحب الرمز إلى شاشة الدخول:
    // خادمٌ متعثّر أو شبكةٌ ضعيفة على الطريق = خروجٌ من الحساب في أسوأ لحظة. الطردُ الآن لمن
    // رفضه الخادمُ فعلاً (رمزٌ باطل)؛ ومن تعذّر الوصول إليه يبقى داخلاً وتقول له الشاشة الحقيقة.
    state = me.when(
      ok: (m) => AuthState(AuthStatus.signedIn, m),
      err: (f) => f is NetworkFailure ? AuthState(AuthStatus.signedIn, state.me) : const AuthState(AuthStatus.signedOut));
    if (state.status == AuthStatus.signedIn) unawaited(_syncPushToken());
  }
  Future<void> signedIn() async {
    final me = await ref.read(authRepositoryProvider).me();
    state = me.when(ok: (m) => AuthState(AuthStatus.signedIn, m), err: (_) => const AuthState(AuthStatus.signedOut));
    if (state.status == AuthStatus.signedIn) unawaited(_syncPushToken());
  }

  /// رمز الإشعار يُسجَّل عند **كل** إقلاع لا عند تسجيل الدخول وحده.
  ///
  /// كان يُرسَل داخل شاشة الرمز فقط: فمن كان داخلاً أصلاً وحدّث التطبيق لا يمرّ بها أبداً، ويبقى
  /// الخادم بلا عنوانٍ لجهازه — يُرسل الإشعار إلى لا أحد ولا يظهر خطأ في أي مكان. وهذا بالضبط ما
  /// حدث. ويُتابَع تبدّل الرمز أيضاً: يتبدّل بعد إعادة التنصيب أو تنظيف البيانات، ومن لا يتابعه
  /// تتوقّف إشعاراته إلى الأبد بصمت.
  Future<void> _syncPushToken() async {
    final push = ref.read(pushTokensProvider);
    Future<void> send(String t) => ref.read(authRepositoryProvider).registerPushToken(t, platform: platformName(), flavor: ref.read(appConfigProvider).flavor.name).then((_) {});
    final t = await push.token();
    if (t != null) await send(t);
    unawaited(_refreshSub?.cancel() ?? Future<void>.value());
    _refreshSub = push.refreshed.listen(send);
    ref.onDispose(() => _refreshSub?.cancel());
  }
  StreamSubscription<String>? _refreshSub;
  Future<Result<Me>> setName(String fullNameAr) => updateProfile(fullNameAr: fullNameAr);
  Future<Result<Me>> updateProfile({String? fullNameAr, String? email, bool clearEmail = false}) async {
    final r = await ref.read(authRepositoryProvider).updateProfile(fullNameAr: fullNameAr, email: email, clearEmail: clearEmail);
    r.when(ok: (m) => state = AuthState(AuthStatus.signedIn, m), err: (_) {});
    return r;
  }
  Future<void> signOut() async { await ref.read(authRepositoryProvider).logout(); state = const AuthState(AuthStatus.signedOut); }
}
final authControllerProvider = NotifierProvider<AuthController, AuthState>(AuthController.new);
