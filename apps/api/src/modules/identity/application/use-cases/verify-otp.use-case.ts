import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '../../../../common/errors';
import { AppConfig } from '../../../../config';
import { normalizeSaudiPhone, otpAttemptsExhausted, otpIsExpired } from '../../domain/otp';
import { OTP_REPOSITORY, type OtpRepository, USER_REPOSITORY, type UserRepository } from '../../domain/repositories';
import { HASHER_PORT, type HasherPort } from '../ports/hasher.port';
import type { IssuedTokens } from '../ports/token.port';
import type { OtpVerifyDto } from '../dto/auth.dto';
import { SessionService } from '../session.service';

@Injectable()
export class VerifyOtpUseCase {
  constructor(
    @Inject(OTP_REPOSITORY) private readonly otps: OtpRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(HASHER_PORT) private readonly hasher: HasherPort,
    private readonly session: SessionService,
    private readonly config: AppConfig,
  ) {}

  async execute(dto: OtpVerifyDto): Promise<IssuedTokens & { user_id: string; is_new: boolean }> {
    const phone = normalizeSaudiPhone(dto.phone);
    if (!phone) throw new AppError('VALIDATION', { details: [{ path: 'phone', message: 'invalid Saudi mobile number' }] });
    const now = new Date();
    const challenge = await this.otps.findLatestActive(phone, 'login', now);
    if (!challenge) throw new AppError('OTP_EXPIRED');
    if (otpIsExpired(challenge, now)) throw new AppError('OTP_EXPIRED');
    if (otpAttemptsExhausted(challenge, this.config.get('OTP_MAX_ATTEMPTS'))) throw new AppError('OTP_TOO_MANY');
    if (challenge.codeHash !== this.hasher.sha256(`${phone}:${dto.code}`)) {
      await this.otps.incrementAttempts(challenge.id);
      throw new AppError('OTP_INVALID');
    }
    await this.otps.consume(challenge.id);
    const existing = await this.users.findByPhone(phone);
    const user = existing ?? (await this.users.upsertByPhone(phone));
    const tokens = await this.session.open(user, dto.device);
    return { ...tokens, user_id: user.id, is_new: !existing };
  }
}
