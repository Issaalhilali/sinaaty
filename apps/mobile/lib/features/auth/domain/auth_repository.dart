import '../../../core/result/result.dart';
import 'auth_entities.dart';
/// Domain port — implemented in data/. Use cases return Result, never throw.
abstract interface class AuthRepository {
  Future<Result<({String phone, int expiresIn, String? debugCode})>> requestOtp(String phone);
  Future<Result<AuthSession>> verifyOtp({required String phone, required String code, required String platform, required String flavor});
  /// يُسجّل رمز الجهاز عند FCM بعد الدخول — به وحده يصل الإشعار والتطبيق مغلق.
  Future<Result<void>> registerPushToken(String token, {required String platform, required String flavor});
  Future<Result<Me>> me();
  /// The name the user writes about himself (refused by the server when Nafath already verified one).
  /// الاسم والبريد معاً — تمرير null للبريد يمسحه، وإغفاله يتركه.
  Future<Result<Me>> updateProfile({String? fullNameAr, String? email, bool clearEmail = false});
  Future<Result<void>> logout();
  /// حذف الحساب: يمحو الهوية ويُبقي الأثر المالي نظاماً — الخادم يرفضه على التزامٍ مفتوح.
  Future<Result<void>> deleteAccount();
}
