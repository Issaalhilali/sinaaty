import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma';
import type { OtpChallenge, OtpPurpose } from '../../domain/otp';
import type { OtpRepository } from '../../domain/repositories';

@Injectable()
export class OtpPrismaRepository implements OtpRepository {
  constructor(private readonly prisma: PrismaService) {}
  async create(i: { phone: string; purpose: OtpPurpose; codeHash: string; expiresAt: Date }): Promise<OtpChallenge> {
    const r = await this.prisma.otpChallenge.create({ data: { phoneE164: i.phone, purpose: i.purpose, codeHash: i.codeHash, expiresAt: i.expiresAt } });
    return { id: r.id, phone: r.phoneE164, purpose: r.purpose as OtpPurpose, attempts: r.attempts, expiresAt: r.expiresAt, consumedAt: r.consumedAt };
  }
  async findLatestActive(phone: string, purpose: OtpPurpose, now: Date) {
    const r = await this.prisma.otpChallenge.findFirst({ where: { phoneE164: phone, purpose, consumedAt: null, expiresAt: { gt: now } }, orderBy: { createdAt: 'desc' } });
    return r ? { id: r.id, phone: r.phoneE164, purpose, attempts: r.attempts, expiresAt: r.expiresAt, consumedAt: r.consumedAt, codeHash: r.codeHash } : null;
  }
  countRecent(phone: string, since: Date) { return this.prisma.otpChallenge.count({ where: { phoneE164: phone, createdAt: { gte: since } } }); }
  async incrementAttempts(id: string) { await this.prisma.otpChallenge.update({ where: { id }, data: { attempts: { increment: 1 } } }); }
  async consume(id: string) { await this.prisma.otpChallenge.update({ where: { id }, data: { consumedAt: new Date() } }); }
}
