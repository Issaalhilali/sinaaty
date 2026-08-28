import '../../../core/api/api_client.dart';
import '../../../core/api/api_error_mapper.dart';
import '../../../core/auth/token_store.dart';
import '../../../core/result/result.dart';
import '../domain/auth_entities.dart';
import '../domain/auth_repository.dart';
class AuthRepositoryImpl implements AuthRepository {
  final ApiClient api; final TokenStore tokens;
  AuthRepositoryImpl(this.api, this.tokens);
  @override Future<Result<({String phone, int expiresIn, String? debugCode})>> requestOtp(String phone) async {
    try { final r = await api.dio.post<Map<String, dynamic>>('/auth/otp/request', data: {'phone': phone}); final d = r.data!; return Result.ok((phone: d['phone'] as String, expiresIn: (d['expires_in'] as num).toInt(), debugCode: d['debug_code'] as String?)); }
    catch (e) { return Result.err(mapDioError(e)); }
  }
  @override Future<Result<AuthSession>> verifyOtp({required String phone, required String code, required String platform, required String flavor}) async {
    // النكهة الحقيقية لا 'customer' دائماً: كانت الثلاث تُسجَّل أجهزةَ عملاء، فيستحيل على العمليات
    // معرفة من يحمل تطبيق الشركاء — ولا يُوجَّه إشعارٌ إلى نكهة بعينها.
    try { final r = await api.dio.post<Map<String, dynamic>>('/auth/otp/verify', data: {'phone': phone, 'code': code, 'device': {'platform': platform, 'app_flavor': flavor}}); final d = r.data!; final s = AuthSession(accessToken: d['accessToken'] as String, refreshToken: d['refreshToken'] as String, userId: d['user_id'] as String); await tokens.save(access: s.accessToken, refresh: s.refreshToken); return Result.ok(s); }
    catch (e) { return Result.err(mapDioError(e)); }
  }
  /// بعد الدخول لا قبله: الحصول على الرمز يطلب الإذن على iOS، والإذن يُطلب حين يفيد صاحبه.
  @override Future<Result<void>> registerPushToken(String token, {required String platform, required String flavor}) async {
    try { await api.dio.post<void>('/me/devices', data: {'platform': platform, 'app_flavor': flavor, 'push_token': token}); return const Result.ok(null); }
    catch (e) { return Result.err(mapDioError(e)); }
  }
  @override Future<Result<Me>> me() async {
    try { final r = await api.dio.get<Map<String, dynamic>>('/me'); return Result.ok(_me(r.data!)); }
    catch (e) { return Result.err(mapDioError(e)); }
  }
  Me _me(Map<String, dynamic> d) => Me(id: d['id'] as String, phone: d['phone'] as String?, fullNameAr: d['full_name_ar'] as String?, email: d['email'] as String?, nameLockedUntil: d['name_locked_until'] == null ? null : DateTime.parse(d['name_locked_until'] as String), platformRole: d['platform_role'] as String, nafathVerified: d['nafath_verified'] as bool, orgs: ((d['orgs'] as List?) ?? []).map((o) => OrgMembership((o as Map)['org_id'] as String, o['role'] as String)).toList());
  @override Future<Result<Me>> updateProfile({String? fullNameAr, String? email, bool clearEmail = false}) async {
    try {
      final r = await api.dio.patch<Map<String, dynamic>>('/me', data: {
        'full_name_ar': ?fullNameAr,
        if (clearEmail) 'email': null else 'email': ?email,
      });
      return Result.ok(_me(r.data!));
    } catch (e) { return Result.err(mapDioError(e)); }
  }
  @override Future<Result<void>> logout() async {
    try { final rt = await tokens.refresh(); await api.dio.post<void>('/auth/logout', data: {'refresh_token': rt}); } catch (_) {/* best effort */}
    await tokens.clear(); return const Result.ok(null);
  }
}
