import '../../../core/result/result.dart';
import 'auth_entities.dart';
/// Domain port — implemented in data/. Use cases return Result, never throw.
abstract interface class AuthRepository {
  Future<Result<({String phone, int expiresIn, String? debugCode})>> requestOtp(String phone);
  Future<Result<AuthSession>> verifyOtp({required String phone, required String code, required String platform});
  Future<Result<Me>> me();
  Future<Result<void>> logout();
}
