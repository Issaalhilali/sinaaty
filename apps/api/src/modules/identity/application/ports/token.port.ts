import type { AuthUser } from '../../domain/auth-user';

export interface IssuedTokens {
  accessToken: string;
  accessExpiresIn: number; // seconds
  refreshToken: string; // opaque, shown once
  refreshExpiresAt: Date;
  tokenType: 'Bearer';
}
export interface TokenPort {
  signAccess(user: AuthUser): Promise<{ token: string; expiresIn: number }>;
  verifyAccess(token: string): Promise<AuthUser>;
  /** Random opaque refresh token + its sha256 hash (only the hash is stored). */
  newRefresh(): { token: string; hash: string };
  hashRefresh(token: string): string;
}
export const TOKEN_PORT = Symbol('TOKEN_PORT');
