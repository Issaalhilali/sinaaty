import { normalizeSaudiPhone, otpAttemptsExhausted, otpIsExpired } from '../domain/otp';
import { refreshIsUsable } from '../domain/refresh-token';
import { isPlatformStaff, membership, type AuthUser } from '../domain/auth-user';

describe('identity domain', () => {
  it('normalizes Saudi mobile numbers to E.164', () => {
    for (const v of ['0501234567', '501234567', '+966501234567', '00966501234567', '966 50 123 4567', '050-123-4567']) expect(normalizeSaudiPhone(v)).toBe('+966501234567');
    expect(normalizeSaudiPhone('0111234567')).toBeNull(); // landline
    expect(normalizeSaudiPhone('+971501234567')).toBeNull(); // UAE
    expect(normalizeSaudiPhone('12345')).toBeNull();
  });
  it('otp expiry and attempts', () => {
    const c = { id: '1', phone: '+966500000000', purpose: 'login' as const, attempts: 5, expiresAt: new Date(1000), consumedAt: null };
    expect(otpIsExpired(c, new Date(999))).toBe(false);
    expect(otpIsExpired(c, new Date(1000))).toBe(true);
    expect(otpAttemptsExhausted(c, 5)).toBe(true);
    expect(otpAttemptsExhausted({ ...c, attempts: 4 }, 5)).toBe(false);
  });
  it('refresh token state', () => {
    const t = { id: '1', userId: 'u', deviceId: null, familyId: 'f', expiresAt: new Date(Date.now() + 1000), revokedAt: null };
    expect(refreshIsUsable(t, new Date())).toBe('ok');
    expect(refreshIsUsable({ ...t, revokedAt: new Date() }, new Date())).toBe('revoked');
    expect(refreshIsUsable({ ...t, expiresAt: new Date(0) }, new Date())).toBe('expired');
  });
  it('auth user helpers', () => {
    const u: AuthUser = { id: 'u', phone: null, status: 'active', platformRole: 'none', nafathVerified: false, orgs: [{ orgId: 'o1', role: 'owner' }] };
    expect(isPlatformStaff(u)).toBe(false);
    expect(isPlatformStaff({ ...u, platformRole: 'ops' })).toBe(true);
    expect(membership(u, 'o1')?.role).toBe('owner');
    expect(membership(u, 'o2')).toBeUndefined();
  });
});
