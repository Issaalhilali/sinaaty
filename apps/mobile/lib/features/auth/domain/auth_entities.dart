/// Session/user as the app knows it (subset of GET /me).
class AuthSession { final String accessToken; final String refreshToken; final String userId; const AuthSession({required this.accessToken, required this.refreshToken, required this.userId}); }
class OrgMembership { final String orgId; final String role; const OrgMembership(this.orgId, this.role); }
class Me { final String id; final String? phone; final String? fullNameAr; final String? email; final DateTime? nameLockedUntil; final String platformRole; final bool nafathVerified; final List<OrgMembership> orgs; const Me({required this.id, this.phone, this.fullNameAr, this.email, this.nameLockedUntil, required this.platformRole, required this.nafathVerified, required this.orgs}); }
