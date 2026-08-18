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
  @override Future<Result<AuthSession>> verifyOtp({required String phone, required String code, required String platform}) async {
    try { final r = await api.dio.post<Map<String, dynamic>>('/auth/otp/verify', data: {'phone': phone, 'code': code, 'device': {'platform': platform, 'app_flavor': 'customer'}}); final d = r.data!; final s = AuthSession(accessToken: d['accessToken'] as String, refreshToken: d['refreshToken'] as String, userId: d['user_id'] as String); await tokens.save(access: s.accessToken, refresh: s.refreshToken); return Result.ok(s); }
    catch (e) { return Result.err(mapDioError(e)); }
  }
  @override Future<Result<Me>> me() async {
    try { final r = await api.dio.get<Map<String, dynamic>>('/me'); final d = r.data!; return Result.ok(Me(id: d['id'] as String, phone: d['phone'] as String?, fullNameAr: d['full_name_ar'] as String?, platformRole: d['platform_role'] as String, nafathVerified: d['nafath_verified'] as bool, orgs: ((d['orgs'] as List?) ?? []).map((o) => OrgMembership((o as Map)['org_id'] as String, o['role'] as String)).toList())); }
    catch (e) { return Result.err(mapDioError(e)); }
  }
  @override Future<Result<void>> logout() async {
    try { final rt = await tokens.refresh(); await api.dio.post<void>('/auth/logout', data: {'refresh_token': rt}); } catch (_) {/* best effort */}
    await tokens.clear(); return const Result.ok(null);
  }
}
