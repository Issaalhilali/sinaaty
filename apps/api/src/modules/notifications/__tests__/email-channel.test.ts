import { NotificationService } from '../application/notification.service';
import { EmailMockAdapter, PushMockAdapter, SmsMockAdapter } from '../infrastructure/channels/mock-channels';
import type { NotificationRepository } from '../domain/repositories';

/** البريد قناةُ الفواتير: يصل من تركه، ويُتخطى بصمتٍ من لم يتركه — والوعد تحت حقل البريد
 *  («لإرسال فواتيرك وإيصالاتك») يصدُق هنا حرفياً. */
describe('قناة البريد', () => {
  const rows: Array<{ channel: string; status: string }> = [];
  const repo = (email: string | null): NotificationRepository => ({
    exists: async () => false,
    userContact: async () => ({ phone: '+966500000000', email, locale: 'ar' as const }),
    pushTokens: async () => [],
    clearPushToken: async () => {},
    create: async (r: { channel: string; status: string }) => { rows.push({ channel: r.channel, status: r.status }); return { id: `${rows.length}` } as never; },
    markSent: async () => {},
  }) as unknown as NotificationRepository;

  const build = (email: string | null) => {
    const em = new EmailMockAdapter();
    const svc = new NotificationService(repo(email), new PushMockAdapter(), new SmsMockAdapter(), em);
    return { svc, em };
  };

  beforeEach(() => rows.splice(0));

  it('فاتورة مدفوعة لمن له بريد → رسالة واحدة بعنوان القالب', async () => {
    const { svc, em } = build('meshal@example.com');
    const r = await svc.notify({ userId: 'u1', template: 'invoice.paid.customer', data: { id: 'i1', number: 'INV-1', amount: '540.50' } });
    expect(r.sent).toContain('email');
    expect(em.sent).toHaveLength(1);
    expect(em.sent[0]!.to).toBe('meshal@example.com');
    expect(em.sent[0]!.subject).toContain('تم الدفع');
    expect(rows.some((x) => x.channel === 'email')).toBe(true);              // الأثر في الجدول أيضاً
  });

  it('من لا بريد له يُتخطى بصمت — لا صفّ فاشل ولا محاولة', async () => {
    const { svc, em } = build(null);
    const r = await svc.notify({ userId: 'u1', template: 'invoice.paid.customer', data: { id: 'i2', number: 'INV-2', amount: '10' } });
    expect(r.sent).not.toContain('email');
    expect(em.sent).toHaveLength(0);
    expect(rows.some((x) => x.channel === 'email')).toBe(false);
  });

  it('قالبٌ بلا قناة بريد لا يراسل حتى صاحبَ البريد — القناة قرار القالب', async () => {
    const { svc, em } = build('meshal@example.com');
    await svc.notify({ userId: 'u1', template: 'wo.status', data: { id: 'w1', number: 'WO-1', status_ar: 'قيد التنفيذ' } });
    expect(em.sent).toHaveLength(0);
  });
});
