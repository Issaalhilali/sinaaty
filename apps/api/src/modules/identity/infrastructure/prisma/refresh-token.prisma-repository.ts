import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma';
import type { RefreshTokenRecord } from '../../domain/refresh-token';
import type { RefreshTokenRepository } from '../../domain/repositories';

@Injectable()
export class RefreshTokenPrismaRepository implements RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}
  async create(i: { userId: string; deviceId: string | null; tokenHash: string; familyId: string; expiresAt: Date }): Promise<RefreshTokenRecord> {
    const r = await this.prisma.refreshToken.create({ data: i });
    return { id: r.id, userId: r.userId, deviceId: r.deviceId, familyId: r.familyId, expiresAt: r.expiresAt, revokedAt: r.revokedAt };
  }
  async findByHash(tokenHash: string) {
    const r = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    return r ? { id: r.id, userId: r.userId, deviceId: r.deviceId, familyId: r.familyId, expiresAt: r.expiresAt, revokedAt: r.revokedAt } : null;
  }
  async revoke(id: string) { await this.prisma.refreshToken.update({ where: { id }, data: { revokedAt: new Date() } }); }
  async revokeFamily(familyId: string) { const r = await this.prisma.refreshToken.updateMany({ where: { familyId, revokedAt: null }, data: { revokedAt: new Date() } }); return r.count; }
  async revokeAllForUser(userId: string) { const r = await this.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }); return r.count; }
}
