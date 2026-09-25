import { Inject, Injectable, Logger } from '@nestjs/common';
import type { NotificationChannel } from '@sinaaty/shared-types';
import { render, TEMPLATES } from '../domain/templates';
import { NOTIFICATION_REPOSITORY, type NotificationRepository } from '../domain/repositories';
import { EMAIL_PORT, type EmailPort, PUSH_PORT, type PushPort, SMS_PORT, type SmsPort } from './ports/channels.port';

export interface NotifyInput { userId: string; template: string; data: Record<string, unknown>; dedupeKey?: string; channels?: NotificationChannel[] }
/** Renders a template for the user's locale, stores in-app copy, and fans out to push/SMS ports. Idempotent by dedupeKey. */
@Injectable()
export class NotificationService {
  private readonly log = new Logger(NotificationService.name);
  constructor(@Inject(NOTIFICATION_REPOSITORY) private readonly repo: NotificationRepository, @Inject(PUSH_PORT) private readonly push: PushPort, @Inject(SMS_PORT) private readonly sms: SmsPort, @Inject(EMAIL_PORT) private readonly email: EmailPort) {}

  async notify(i: NotifyInput): Promise<{ sent: NotificationChannel[]; skipped?: string }> {
    const t = TEMPLATES[i.template]; if (!t) { this.log.warn(`unknown template ${i.template}`); return { sent: [], skipped: 'unknown_template' }; }
    const dedupe = i.dedupeKey ?? `${i.template}:${JSON.stringify(i.data.id ?? i.data.number ?? '')}`;
    if (await this.repo.exists(i.userId, i.template, dedupe)) return { sent: [], skipped: 'duplicate' };
    const contact = await this.repo.userContact(i.userId); const locale = contact?.locale ?? 'ar';
    const r = render(t, i.data, locale); const channels = i.channels ?? t.channels; const data = { ...i.data, deep_link: r.deepLink, dedupe_key: dedupe };
    const sent: NotificationChannel[] = [];
    // in-app copy is always stored (Arabic title/body columns hold the rendered locale)
    await this.repo.create({ userId: i.userId, channel: 'in_app', templateCode: t.code, titleAr: r.title, bodyAr: r.body, data, status: 'delivered', sentAt: new Date() }); sent.push('in_app');
    if (channels.includes('push')) {
      const tokens = await this.repo.pushTokens(i.userId);
      const row = await this.repo.create({ userId: i.userId, channel: 'push', templateCode: t.code, titleAr: r.title, bodyAr: r.body, data, status: tokens.length ? 'queued' : 'failed' });
      if (tokens.length) { let ok = false; let ref: string | undefined; for (const tk of tokens) { const res = await this.push.send({ token: tk.token, title: r.title, body: r.body, data: { deep_link: r.deepLink ?? '', template: t.code } }); ok = ok || res.ok; ref = res.providerRef ?? ref; // الرمز الميت يُنزع فوراً: من أعاد تنصيب التطبيق يترك خلفه رمزاً يفشل إلى الأبد، فتتراكم
        // الأجهزة المهجورة وتُبطئ كل إشعار لاحق بمحاولات محكوم عليها بالفشل.
        if (res.invalidToken) await this.repo.clearPushToken(tk.deviceId); } await this.repo.markSent(row.id, ref, ok); if (ok) sent.push('push'); }
    }
    if (channels.includes('sms') && contact?.phone) {
      const row = await this.repo.create({ userId: i.userId, channel: 'sms', templateCode: t.code, titleAr: r.title, bodyAr: r.body, data, status: 'queued' });
      const res = await this.sms.send(contact.phone, `${r.title}\n${r.body}`); await this.repo.markSent(row.id, res.providerRef, res.ok); if (res.ok) sent.push('sms');
    }
    // الفواتير والإيصالات تصل بريدَ من تركه — الغرض الذي وُعد به تحت حقل البريد حرفياً
    if (channels.includes('email') && contact?.email) {
      const row = await this.repo.create({ userId: i.userId, channel: 'email', templateCode: t.code, titleAr: r.title, bodyAr: r.body, data, status: 'queued' });
      const res = await this.email.send(contact.email, r.title, r.body); await this.repo.markSent(row.id, res.providerRef, res.ok); if (res.ok) sent.push('email');
    }
    return { sent };
  }
  async notifyMany(userIds: string[], i: Omit<NotifyInput, 'userId'>) { const out = []; for (const userId of [...new Set(userIds)]) out.push(await this.notify({ ...i, userId })); return out; }
}
