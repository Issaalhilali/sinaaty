import { render, TEMPLATES } from '../domain/templates';
describe('notification templates', () => {
  it('every template has Arabic + English and at least one channel', () => { for (const t of Object.values(TEMPLATES)) { expect(t.titleAr && t.bodyAr && t.titleEn && t.bodyEn).toBeTruthy(); expect(t.channels.length).toBeGreaterThan(0); } });
  it('covers every customer-facing work order status', () => { for (const s of ['awaiting_parts', 'in_progress', 'quality_check', 'ready', 'delivered', 'closed', 'cancelled', 'disputed', 'abandoned']) expect(TEMPLATES[`wo.status.${s}`]).toBeDefined(); });
  it('renders placeholders in both locales and drops unknowns', () => {
    const r = render(TEMPLATES['wo.awaiting_approval']!, { id: 'w1', number: 'WO-1', org: 'ورشة النور', total: '1,368.50' }, 'ar');
    expect(r.title).toBe('أمر إصلاح بانتظار اعتمادك'); expect(r.body).toContain('WO-1'); expect(r.body).toContain('1,368.50'); expect(r.deepLink).toBe('sinaaty://work-orders/w1/approve');
    const en = render(TEMPLATES['wo.awaiting_approval']!, { number: 'WO-1', org: 'X', total: '1' }, 'en'); expect(en.title).toBe('Repair order awaiting your approval'); expect(en.body).not.toContain('{');
  });
  it('legal/formal templates go by SMS too', () => { for (const c of ['wo.awaiting_approval', 'note.issued', 'note.dunning.formal', 'enforcement.requested', 'wo.status.ready']) expect(TEMPLATES[c]!.channels).toContain('sms'); });
});
