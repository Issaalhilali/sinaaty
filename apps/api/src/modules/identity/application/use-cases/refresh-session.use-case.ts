import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '../../../../common/errors';
import { refreshIsUsable } from '../../domain/refresh-token';
import { REFRESH_TOKEN_REPOSITORY, type RefreshTokenRepository, USER_REPOSITORY, type UserRepository } from '../../domain/repositories';
import { type IssuedTokens, TOKEN_PORT, type TokenPort } from '../ports/token.port';
import { SessionService } from '../session.service';

/** Rotation with family reuse detection: a revoked token presented again kills the whole family. */
@Injectable()
export class RefreshSessionUseCase {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshRepo: RefreshTokenRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(TOKEN_PORT) private readonly tokens: TokenPort,
    private readonly session: SessionService,
  ) {}

  async execute(refreshToken: string): Promise<IssuedTokens> {
    const rec = await this.refreshRepo.findByHash(this.tokens.hashRefresh(refreshToken));
    if (!rec) throw new AppError('TOKEN_INVALID');
    const state = refreshIsUsable(rec, new Date());
    if (state === 'revoked') {
      await this.refreshRepo.revokeFamily(rec.familyId);
      throw new AppError('TOKEN_REUSED');
    }
    if (state === 'expired') throw new AppError('TOKEN_INVALID');
    await this.refreshRepo.revoke(rec.id);
    const user = await this.users.findById(rec.userId);
    if (!user) throw new AppError('TOKEN_INVALID');
    return this.session.open(user, undefined, rec.familyId);
  }
}
