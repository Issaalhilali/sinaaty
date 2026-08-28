import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { NotificationChannel } from '@sinaaty/shared-types';
import { asTx, PrismaService } from '../../../../prisma';
import type { TxHandle } from '../../../../common/ports/unit-of-work.port';
import type { NotificationRepository, NotificationRow } from '../../domain/repositories';

@Injectable()
export class NotificationPrismaRepository implements NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}
  private db(tx?: TxHandle) { return tx ? asTx(tx) : this.prisma; }
  async create(n: Parameters<NotificationRepository['create']>[0], tx?: TxHandle) { const r = await this.db(tx).notification.create({ data: { userId: n.userId, channel: n.channel, templateCode: n.templateCode, titleAr: n.titleAr, bodyAr: n.bodyAr, data: n.data as Prisma.InputJsonValue, status: n.status, providerRef: n.providerRef, sentAt: n.sentAt } }); return r as NotificationRow; }
  async markSent(id: string, providerRef: string | undefined, ok: boolean) { await this.prisma.notification.update({ where: { id }, data: { status: ok ? 'sent' : 'failed', providerRef, sentAt: ok ? new Date() : undefined } }); }
  async inbox(userId: string, opts: { unreadOnly?: boolean; limit: number }) { const rows = await this.prisma.notification.findMany({ where: { userId, channel: 'in_app', ...(opts.unreadOnly ? { readAt: null } : {}) }, orderBy: { createdAt: 'desc' }, take: opts.limit }); return rows as NotificationRow[]; }
  unreadCount(userId: string) { return this.prisma.notification.count({ where: { userId, channel: 'in_app', readAt: null } }); }
  async markRead(userId: string, id: string) { const r = await this.prisma.notification.updateMany({ where: { id, userId, channel: 'in_app', readAt: null }, data: { readAt: new Date(), status: 'read' } }); return r.count === 1; }
  async markAllRead(userId: string) { const r = await this.prisma.notification.updateMany({ where: { userId, channel: 'in_app', readAt: null }, data: { readAt: new Date(), status: 'read' } }); return r.count; }
  async exists(userId: string, templateCode: string, dedupeKey: string) { const r = await this.prisma.notification.findFirst({ where: { userId, templateCode, channel: 'in_app', data: { path: ['dedupe_key'], equals: dedupeKey } }, select: { id: true } }); return !!r; }
  async upsertTemplates(templates: Array<{ code: string; channel: NotificationChannel; titleAr: string; titleEn: string; bodyAr: string; bodyEn: string }>) { let n = 0; for (const t of templates) { await this.prisma.notificationTemplate.upsert({ where: { code: t.code }, update: { channel: t.channel, titleAr: t.titleAr, titleEn: t.titleEn, bodyAr: t.bodyAr, bodyEn: t.bodyEn }, create: { code: t.code, channel: t.channel, titleAr: t.titleAr, titleEn: t.titleEn, bodyAr: t.bodyAr, bodyEn: t.bodyEn } }); n++; } return n; }
  async pushTokens(userId: string) { const rows = await this.prisma.device.findMany({ where: { userId, revokedAt: null, pushToken: { not: null } }, select: { id: true, pushToken: true, platform: true } }); return rows.map((r) => ({ deviceId: r.id, token: r.pushToken!, platform: r.platform })); }
  async clearPushToken(deviceId: string) { await this.prisma.device.update({ where: { id: deviceId }, data: { pushToken: null } }); }
  async userContact(userId: string): Promise<{ phone: string | null; email: string | null; locale: 'ar' | 'en' } | null> { const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { phoneE164: true, email: true, preferredLocale: true } }); return u ? { phone: u.phoneE164, email: u.email, locale: (u.preferredLocale === 'en' ? 'en' : 'ar') } : null; }
}
