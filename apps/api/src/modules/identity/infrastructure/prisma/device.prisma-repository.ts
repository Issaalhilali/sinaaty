import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma';
import type { DeviceRepository } from '../../domain/repositories';

@Injectable()
export class DevicePrismaRepository implements DeviceRepository {
  constructor(private readonly prisma: PrismaService) {}
  async upsert(i: { userId: string; platform: string; deviceName?: string; pushToken?: string; appFlavor?: string; appVersion?: string; existingId?: string }) {
    const now = new Date();
    if (i.existingId) {
      const r = await this.prisma.device.updateMany({ where: { id: i.existingId, userId: i.userId, revokedAt: null }, data: { pushToken: i.pushToken, appVersion: i.appVersion, deviceName: i.deviceName, lastSeenAt: now } });
      if (r.count === 1) return { id: i.existingId };
    }
    // reuse an existing device with same push token (app reinstall) else create
    if (i.pushToken) {
      const same = await this.prisma.device.findFirst({ where: { userId: i.userId, pushToken: i.pushToken, revokedAt: null }, select: { id: true } });
      if (same) { await this.prisma.device.update({ where: { id: same.id }, data: { lastSeenAt: now, appVersion: i.appVersion, deviceName: i.deviceName } }); return { id: same.id }; }
    }
    const d = await this.prisma.device.create({ data: { userId: i.userId, platform: i.platform, deviceName: i.deviceName, pushToken: i.pushToken, appFlavor: i.appFlavor, appVersion: i.appVersion, lastSeenAt: now }, select: { id: true } });
    return { id: d.id };
  }
  async revoke(userId: string, deviceId: string) { const r = await this.prisma.device.updateMany({ where: { id: deviceId, userId, revokedAt: null }, data: { revokedAt: new Date(), pushToken: null } }); return r.count === 1; }
  list(userId: string) { return this.prisma.device.findMany({ where: { userId, revokedAt: null }, select: { id: true, platform: true, deviceName: true, appFlavor: true, lastSeenAt: true }, orderBy: { lastSeenAt: 'desc' } }); }
}
