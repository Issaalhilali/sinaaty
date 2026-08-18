import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '../../../../common/errors';
import { AppConfig } from '../../../../config';
import { normalizeSaudiPhone, OTP_LENGTH } from '../../domain/otp';
import { OTP_REPOSITORY, type OtpRepository } from '../../domain/repositories';
import { HASHER_PORT, type HasherPort } from '../ports/hasher.port';
import { OTP_SENDER_PORT, type OtpSenderPort } from '../ports/otp-sender.port';
import type { OtpRequestDto } from '../dto/auth.dto';

const MAX_PER_10_MIN = 3;

@Injectable()
export class RequestOtpUseCase {
  constructor(
    @Inject(OTP_REPOSITORY) private readonly otps: OtpRepository,
    @Inject(OTP_SENDER_PORT) private readonly sender: OtpSenderPort,
    @Inject(HASHER_PORT) private readonly hasher: HasherPort,
    private readonly config: AppConfig,
  ) {}

  async execute(dto: OtpRequestDto): Promise<{ phone: string; expires_in: number; debug_code?: string }> {
    const phone = normalizeSaudiPhone(dto.phone);
    if (!phone) throw new AppError('VALIDATION', { details: [{ path: 'phone', message: 'invalid Saudi mobile number' }] });
    const recent = await this.otps.countRecent(phone, new Date(Date.now() - 10 * 60_000));
    if (recent >= MAX_PER_10_MIN) throw new AppError('OTP_TOO_MANY');
    const code = this.hasher.randomDigits(OTP_LENGTH);
    const ttl = this.config.get('OTP_TTL_SECONDS');
    await this.otps.create({ phone, purpose: dto.purpose, codeHash: this.hasher.sha256(`${phone}:${code}`), expiresAt: new Date(Date.now() + ttl * 1000) });
    const sent = await this.sender.send(phone, code);
    const exposeDebug = !this.config.isProd && this.config.get('INTEGRATION_SMS') === 'mock';
    return { phone, expires_in: ttl, ...(exposeDebug && sent.debugCode ? { debug_code: sent.debugCode } : {}) };
  }
}
