import type { NotificationChannel, NotificationStatus } from '@sinaaty/shared-types';
import type { TxHandle } from '../../../common/ports/unit-of-work.port';
export interface NotificationRow { id: string; userId: string; channel: NotificationChannel; templateCode: string | null; titleAr: string | null; bodyAr: string; data: unknown; status: NotificationStatus; providerRef: string | null; sentAt: Date | null; readAt: Date | null; createdAt: Date }
export interface NotificationRepository {
  create(n: { userId: string; channel: NotificationChannel; templateCode: string; titleAr: string; bodyAr: string; data: unknown; status: NotificationStatus; providerRef?: string; sentAt?: Date }, tx?: TxHandle): Promise<NotificationRow>;
  markSent(id: string, providerRef: string | undefined, ok: boolean): Promise<void>;
  inbox(userId: string, opts: { unreadOnly?: boolean; limit: number }): Promise<NotificationRow[]>;
  unreadCount(userId: string): Promise<number>;
  markRead(userId: string, id: string): Promise<boolean>;
  markAllRead(userId: string): Promise<number>;
  /** Idempotency: has this (user, template, key) already been sent? key = aggregate id + step. */
  exists(userId: string, templateCode: string, dedupeKey: string): Promise<boolean>;
  upsertTemplates(templates: Array<{ code: string; channel: NotificationChannel; titleAr: string; titleEn: string; bodyAr: string; bodyEn: string }>): Promise<number>;
  pushTokens(userId: string): Promise<Array<{ deviceId: string; token: string; platform: string }>>;
  /** رمز رفضه المزوّد نهائياً (التطبيق حُذف أو أُعيد تنصيبه) — يُنزع فلا يُحاوَل إليه ثانيةً. */
  clearPushToken(deviceId: string): Promise<void>;
  userContact(userId: string): Promise<{ phone: string | null; email: string | null; locale: 'ar' | 'en' } | null>;
}
export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');
