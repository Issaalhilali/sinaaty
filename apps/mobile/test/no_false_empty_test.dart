import 'package:fake_async/fake_async.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sinaaty/core/auth/token_store.dart';
import 'package:sinaaty/core/di/core_providers.dart';
import 'package:sinaaty/core/result/result.dart';
import 'package:sinaaty/features/auth/domain/auth_entities.dart';
import 'package:sinaaty/features/auth/domain/auth_repository.dart';
import 'package:sinaaty/features/auth/presentation/providers.dart';
import 'package:sinaaty/features/workshop/presentation/providers.dart';

/// **الفراغ ليس خبراً — إلا إذا كان صحيحاً.**
///
/// صاحب ورشةٍ فيها ٣٧ أمراً فتح تطبيقه فقرأ «لا توجد أوامر بعد — أنشئ أول أمر إصلاح».
/// لم يكن عطلاً واحداً بل ثلاثاً متراكبة، كلٌّ منها معقولٌ وحده: فشل `myOrgs` صار `[]`،
/// ثم `[]` جعلت المنشأة مجهولة، ثم المجهولة أعادت `Result.ok([])` — **نجاحاً مُختلَقاً**.
/// وشاشةٌ تعرض حالة فراغٍ تعليمية فوق عطلٍ شبكي تقول للمستخدم إن عمله ضاع.
void main() {
  test('الجلسة لم تصل ⇐ «تعذّر الاتصال» لا «لا توجد أوامر»', () async {
    final c = ProviderContainer(overrides: [
      // لا مستخدم بعد: الاستعادة جارية أو الشبكة ساقطة
      authControllerProvider.overrideWith(() => _NoMe()),
    ]);
    addTearDown(c.dispose);
    final r = await c.read(orgOrdersProvider.future);
    expect(r.isOk, isFalse, reason: 'الفشل يجب أن يصل إلى الشاشة لا أن يُترجم فراغاً');
  });

  test('استعادةٌ فشلت شبكياً ⇐ التطبيق يعاود ويستعيد هويته بنفسه', () {
    fakeAsync((async) {
      final repo = _FlakyAuth();
      final c = ProviderContainer(overrides: [
        authRepositoryProvider.overrideWithValue(repo),
        tokenStoreProvider.overrideWithValue(_TokenWithAccess()),
      ]);
      addTearDown(c.dispose);
      c.read(authControllerProvider);              // يبدأ restore()
      async.elapse(const Duration(seconds: 1));
      expect(c.read(authControllerProvider).status, AuthStatus.signedIn);
      expect(c.read(authControllerProvider).me, isNull, reason: 'الفشل الأول: داخلٌ بلا هوية');
      async.elapse(const Duration(seconds: 5));     // أول محاولة شفاء بعد ٣ث
      expect(c.read(authControllerProvider).me, isNotNull, reason: 'التطبيق يشفي نفسه بلا تدخّل');
      expect(repo.calls, greaterThan(1));
    });
  });
}

class _TokenWithAccess implements TokenStore {
  @override Future<String?> access() async => 'tok';
  @override dynamic noSuchMethod(Invocation i) => super.noSuchMethod(i);
}

class _NoMe extends AuthController {
  @override AuthState build() => const AuthState(AuthStatus.signedIn, null);
}

/// والاستعادة التي انتهت بمهلة **تعاود بنفسها**: مهلةٌ تفتح التطبيق ولا تُنهي المحاولة.
/// كان الفشل الشبكي يترك الحساب «داخلاً» بلا هوية ولا منشأة، وكل شاشةٍ بعده فارغة إلى أن
/// يقتل صاحبها التطبيق ويفتحه — عطلٌ لا يشتكي منه أحد، يفسّره الناس بأن «التطبيق تعبان».
class _FlakyAuth implements AuthRepository {
  int calls = 0;
  @override Future<Result<Me>> me() async {
    calls++;
    // أول نداءٍ يسقط شبكياً (كما يقع على جهازٍ بطيء أو شبكةٍ متعثّرة)، ثم تعود الشبكة.
    if (calls == 1) return const Result.err(NetworkFailure());
    return const Result.ok(Me(id: 'u1', phone: '+966500000001', fullNameAr: 'أبو محمد', platformRole: 'none', nafathVerified: false, orgs: []));
  }
  @override dynamic noSuchMethod(Invocation i) => super.noSuchMethod(i);
}
