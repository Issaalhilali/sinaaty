import { Injectable } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
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
  constructor(config: AppConfig, private readonly logger: Logger) {
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
    } catch (e) {
      // The response stays a bare 401 in production, but the reason (signature vs expiry vs claim
      // shape) must survive — the intermittent whole-suite 401 was unactionable while this catch
      // swallowed it. e2e runs log at silent, so outside production the reason also rides in the
      // envelope's details: the next flake prints its own diagnosis in the failing assertion.
      const err = e as { code?: string; name?: string; claim?: string; message?: string };
      const reason = `${err.code ?? err.name ?? 'unknown'}${err.claim ? ` claim=${err.claim}` : ''}`;
      this.logger.warn({ reason }, 'access token rejected');
      throw new AppError('TOKEN_INVALID', process.env['NODE_ENV'] === 'production' ? { cause: e } : { cause: e, details: { reason, message: err.message } });
    }
  }
  newRefresh() { const token = randomBytes(48).toString('base64url'); return { token, hash: this.hashRefresh(token) }; }
  hashRefresh(token: string) { return createHash('sha256').update(token).digest('hex'); }
}
