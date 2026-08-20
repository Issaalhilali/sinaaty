import { Injectable } from '@nestjs/common';
import { createHash, randomBytes, type KeyObject, createPrivateKey, createPublicKey } from 'node:crypto';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { AppConfig } from '../../../../config';
import { AppError } from '../../../../common/errors';
import type { AuthUser } from '../../domain/auth-user';
import type { TokenPort } from '../../application/ports/token.port';

interface Claims extends JWTPayload { role: string; nv: boolean; orgs: Array<{ o: string; r: string }>; st: string; ph: string | null; dev?: string }

/** EdDSA (Ed25519) access tokens; opaque random refresh tokens hashed with sha256. */
@Injectable()
export class JoseTokenAdapter implements TokenPort {
  private readonly priv: KeyObject; private readonly pub: KeyObject; private readonly issuer: string; private readonly ttl: number;
  constructor(config: AppConfig) {
    this.priv = createPrivateKey(Buffer.from(config.get('JWT_PRIVATE_KEY'), 'base64').toString('utf8'));
    this.pub = createPublicKey(Buffer.from(config.get('JWT_PUBLIC_KEY'), 'base64').toString('utf8'));
    this.issuer = config.get('JWT_ISSUER'); this.ttl = config.get('JWT_ACCESS_TTL_SECONDS');
  }
  async signAccess(u: AuthUser) {
    const token = await new SignJWT({ role: u.platformRole, nv: u.nafathVerified, orgs: u.orgs.map((o) => ({ o: o.orgId, r: o.role })), st: u.status, ph: u.phone, dev: u.deviceId } satisfies Omit<Claims, keyof JWTPayload>)
      .setProtectedHeader({ alg: 'EdDSA', typ: 'JWT' }).setSubject(u.id).setIssuer(this.issuer).setAudience('sinaaty-api').setIssuedAt().setExpirationTime(`${this.ttl}s`).sign(this.priv);
    return { token, expiresIn: this.ttl };
  }
  async verifyAccess(token: string): Promise<AuthUser> {
    try {
      const { payload } = await jwtVerify<Claims>(token, this.pub, { issuer: this.issuer, audience: 'sinaaty-api', algorithms: ['EdDSA'] });
      return { id: payload.sub!, phone: payload.ph, status: payload.st as AuthUser['status'], platformRole: payload.role as AuthUser['platformRole'], nafathVerified: payload.nv, orgs: payload.orgs.map((o) => ({ orgId: o.o, role: o.r as AuthUser['orgs'][number]['role'] })), deviceId: payload.dev };
    } catch { throw new AppError('TOKEN_INVALID'); }
  }
  newRefresh() { const token = randomBytes(48).toString('base64url'); return { token, hash: this.hashRefresh(token) }; }
  hashRefresh(token: string) { return createHash('sha256').update(token).digest('hex'); }
}
