export interface RefreshTokenRecord {
  id: string;
  userId: string;
  deviceId: string | null;
  familyId: string;
  expiresAt: Date;
  revokedAt: Date | null;
}
export function refreshIsUsable(t: RefreshTokenRecord, now: Date): 'ok' | 'expired' | 'revoked' {
  if (t.revokedAt) return 'revoked';
  if (t.expiresAt.getTime() <= now.getTime()) return 'expired';
  return 'ok';
}
