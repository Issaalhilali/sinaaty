import { Inject, Injectable } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';
import { AppError } from '../../../common/errors';
import { AppConfig } from '../../../config';
import { type AuthUser } from '../domain/auth-user';
import { type User } from '../domain/user';
import { DEVICE_REPOSITORY, type DeviceRepository, REFRESH_TOKEN_REPOSITORY, type RefreshTokenRepository, USER_REPOSITORY, type UserRepository } from '../domain/repositories';
import { type IssuedTokens, TOKEN_PORT, type TokenPort } from './ports/token.port';
import type { RegisterDeviceDto } from './dto/auth.dto';

/** Shared by all login paths: user → (device) → access + refresh tokens. */
@Injectable()
export class SessionService {
  constructor(
    @Inject(TOKEN_PORT) private readonly tokens: TokenPort,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshRepo: RefreshTokenRepository,
    @Inject(DEVICE_REPOSITORY) private readonly devices: DeviceRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly config: AppConfig,
  ) {}

  toAuthUser(u: User, deviceId?: string): AuthUser {
    return { id: u.id, phone: u.phone, status: u.status, platformRole: u.platformRole, nafathVerified: !!u.nafathVerifiedAt, orgs: u.orgs, deviceId };
  }

  async open(user: User, device?: RegisterDeviceDto, familyId?: string): Promise<IssuedTokens> {
    if (user.status === 'suspended' || user.status === 'deleted') throw new AppError('USER_SUSPENDED');
    let deviceId: string | undefined;
    if (device) {
      const d = await this.devices.upsert({ userId: user.id, platform: device.platform, deviceName: device.device_name, pushToken: device.push_token, appFlavor: device.app_flavor, appVersion: device.app_version });
      deviceId = d.id;
    }
    const authUser = this.toAuthUser(user, deviceId);
    const access = await this.tokens.signAccess(authUser);
    const refresh = this.tokens.newRefresh();
    const expiresAt = new Date(Date.now() + this.config.get('JWT_REFRESH_TTL_DAYS') * 86_400_000);
    await this.refreshRepo.create({ userId: user.id, deviceId: deviceId ?? null, tokenHash: refresh.hash, familyId: familyId ?? uuidv7(), expiresAt });
    await this.users.touchLogin(user.id);
    return { accessToken: access.token, accessExpiresIn: access.expiresIn, refreshToken: refresh.token, refreshExpiresAt: expiresAt, tokenType: 'Bearer' };
  }
}
