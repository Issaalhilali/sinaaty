import { Inject, Injectable } from '@nestjs/common';
import { REFRESH_TOKEN_REPOSITORY, type RefreshTokenRepository } from '../../domain/repositories';
import { TOKEN_PORT, type TokenPort } from '../ports/token.port';

@Injectable()
export class LogoutUseCase {
  constructor(@Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshRepo: RefreshTokenRepository, @Inject(TOKEN_PORT) private readonly tokens: TokenPort) {}
  /** Revoke this refresh token's family (this device); `everywhere` revokes all of the user's sessions. */
  async execute(userId: string, refreshToken?: string, everywhere = false): Promise<{ revoked: number }> {
    if (everywhere) return { revoked: await this.refreshRepo.revokeAllForUser(userId) };
    if (!refreshToken) return { revoked: 0 };
    const rec = await this.refreshRepo.findByHash(this.tokens.hashRefresh(refreshToken));
    if (!rec || rec.userId !== userId) return { revoked: 0 };
    return { revoked: await this.refreshRepo.revokeFamily(rec.familyId) };
  }
}
