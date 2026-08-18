import { Test } from '@nestjs/testing';
import { type INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { OutboxProcessor } from '../src/modules/integrations/outbox/outbox.processor';
import { SmsMockAdapter, PushMockAdapter } from '../src/modules/notifications/infrastructure/channels/mock-channels';

/** Step 11 verify: each transition emits the right template to the right party (in-app inbox + push/SMS mocks). */
describe('Notifications (e2e)', () => {
  let app: INestApplication; let outbox: OutboxProcessor; let sms: SmsMockAdapter; let push: PushMockAdapter;
  const http = () => request(app.getHttpServer());
  const suffix = String(Date.now()).slice(-7);
  const wsPhone = '+966500000001'; const custPhone = `+96657${suffix}`; const adminPhone = '+966500000099';
  let wsTok: string; let custTok: string; let adminTok: string; let orgId: string;
  const login = async (phone: string) => { const r = await http().post('/v1/auth/otp/request').send({ phone }).expect(200); const v = await http().post('/v1/auth/otp/verify').send({ phone, code: r.body.debug_code, device: { platform: 'android', push_token: `tok_${phone}` } }).expect(200); return v.body.accessToken as string; };
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });
  const drain = async () => { await outbox.drain(500); await outbox.drain(500); };
  const codes = async (tok: string) => (await http().get('/v1/me/notifications?limit=100').set(auth(tok)).expect(200)).body.map((n: { templateCode: string }) => n.templateCode) as string[];

  beforeAll(async () => { const mod = await Test.createTestingModule({ imports: [AppModule] }).compile(); app = mod.createNestApplication({ rawBody: true }); app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' }); await app.init(); outbox = app.get(OutboxProcessor); sms = app.get(SmsMockAdapter); push = app.get(PushMockAdapter); wsTok = await login(wsPhone); custTok = await login(custPhone); adminTok = await login(adminPhone); orgId = (await http().get('/v1/me').set(auth(wsTok))).body.orgs[0].org_id; await drain(); });
  afterAll(async () => { await app.close(); });

  let woId: string;
  it('create → customer gets wo.created; request approval → wo.awaiting_approval (push + SMS)', async () => {
    const before = sms.sent.length;
    const wo = await http().post('/v1/work-orders').set(auth(wsTok)).send({ org_id: orgId, customer_phone: custPhone, plate: 'ب ح د 1122', payment_terms: 'deferred', items: [{ type: 'labor', description_ar: 'سمكرة', quantity: 1, unit_price: '1000' }] }).expect(201); woId = wo.body.id;
    await http().post(`/v1/work-orders/${woId}/request-approval`).set(auth(wsTok)).send({}).expect(200); await drain();
    const c = await codes(custTok); expect(c).toContain('wo.created'); expect(c).toContain('wo.awaiting_approval');
    expect(sms.sent.slice(before).some((s) => s.to === custPhone && s.body.includes(wo.body.number))).toBe(true);
    const inbox = await http().get('/v1/me/notifications?unread=true').set(auth(custTok)).expect(200);
    const n = inbox.body.find((x: { templateCode: string }) => x.templateCode === 'wo.awaiting_approval'); expect(n.bodyAr).toContain('1,150.00'); expect(n.data.deep_link).toBe(`sinaaty://work-orders/${woId}/approve`);
    // draining again does not duplicate
    await drain(); expect((await codes(custTok)).filter((x) => x === 'wo.awaiting_approval')).toHaveLength(1);
  });
  it('approve (deferred) → workshop gets wo.approved; note issued → customer note.issued (SMS) + workshop note.issued.creditor', async () => {
    const init = await http().post(`/v1/work-orders/${woId}/approve`).set(auth(custTok)).send({ method: 'otp' }).expect(200);
    await http().post(`/v1/work-orders/${woId}/approve/complete`).set(auth(custTok)).send({ method: 'otp', code: init.body.debug_code }).expect(200); await drain();
    expect(await codes(wsTok)).toContain('wo.approved'); expect(await codes(wsTok)).toContain('note.issued.creditor');
    const c = await codes(custTok); expect(c).toContain('note.issued'); expect(c).toContain('wo.status.in_progress');
    expect(sms.sent.some((s) => s.to === custPhone && s.body.includes('سند'))).toBe(true);
    expect(push.sent.some((p) => p.token === `tok_${custPhone}` && p.data?.template === 'note.issued')).toBe(true);
  });
  it('change order → wo.change_order; ready/delivered/closed statuses; invoice issued/paid; escrow released; note closed', async () => {
    const co = await http().post(`/v1/work-orders/${woId}/change-orders`).set(auth(wsTok)).send({ reason_ar: 'بند إضافي', add: [{ type: 'labor', description_ar: 'تلميع', quantity: 1, unit_price: '100' }] }).expect(200); await drain();
    expect(await codes(custTok)).toContain('wo.change_order');
    const init = await http().post(`/v1/work-orders/${woId}/approve`).set(auth(custTok)).send({ method: 'otp' }).expect(200);
    await http().post(`/v1/work-orders/${woId}/approve/complete`).set(auth(custTok)).send({ method: 'otp', code: init.body.debug_code }).expect(200);
    await http().post(`/v1/work-orders/${woId}/transition`).set(auth(wsTok)).send({ to: 'ready' }).expect(200);
    await http().post(`/v1/work-orders/${woId}/inspections`).set(auth(wsTok)).send({ type: 'check_out', media_ids: [] }).expect(201);
    await http().post(`/v1/work-orders/${woId}/transition`).set(auth(wsTok)).send({ to: 'delivered' }).expect(200);
    const inv = await http().post('/v1/invoices').set(auth(wsTok)).send({ work_order_id: woId }).expect(201); await drain();
    let c = await codes(custTok); expect(c).toContain('wo.status.ready'); expect(c).toContain('wo.status.delivered'); expect(c).toContain('invoice.issued');
    const p = await http().post('/v1/payments').set(auth(custTok)).send({ invoice_id: inv.body.id, method: 'mada' }).expect(201);
    await http().post(`/v1/payments/${p.body.payment_id}/mock-pay`).set(auth(custTok)).expect(200); await drain();
    c = await codes(custTok); expect(c).toContain('invoice.paid.customer'); expect(c).toContain('note.closed');
    let w = await codes(wsTok); expect(w).toContain('invoice.paid');
    await http().post(`/v1/work-orders/${woId}/confirm-receipt`).set(auth(custTok)).expect(200);
    await http().post(`/v1/work-orders/${woId}/transition`).set(auth(custTok)).send({ to: 'closed' }).expect(200); await drain();
    w = await codes(wsTok); expect(w).toContain('escrow.released'); expect(w).toContain('wo.status.closed'); expect(await codes(custTok)).toContain('wo.status.closed');
    expect(co.body.version).toBe(2);
  });
  it('dunning formal notice → SMS; enforcement → enforcement.requested; org approval → org.active', async () => {
    const wo = await http().post('/v1/work-orders').set(auth(wsTok)).send({ org_id: orgId, customer_phone: custPhone, plate: 'ب ح د 1122', payment_terms: 'deferred', due_date: '2026-01-01', items: [{ type: 'labor', description_ar: 'دهان', quantity: 1, unit_price: '500' }] }).expect(201);
    await http().post(`/v1/work-orders/${wo.body.id}/request-approval`).set(auth(wsTok)).send({}).expect(200);
    const init = await http().post(`/v1/work-orders/${wo.body.id}/approve`).set(auth(custTok)).send({ method: 'otp' }).expect(200);
    await http().post(`/v1/work-orders/${wo.body.id}/approve/complete`).set(auth(custTok)).send({ method: 'otp', code: init.body.debug_code }).expect(200); await drain();
    const before = sms.sent.length;
    await http().post('/v1/admin/promissory-notes/run-dunning').set(auth(adminTok)).expect(200); await drain();
    const c = await codes(custTok); expect(c).toContain('note.dunning.reminder'); expect(c).toContain('note.dunning.formal');
    expect(sms.sent.slice(before).some((s) => s.body.includes('إشعار رسمي'))).toBe(true);
    const note = (await http().get(`/v1/promissory-notes?org_id=${orgId}&limit=200`).set(auth(wsTok))).body.find((n: { workOrderId: string }) => n.workOrderId === wo.body.id);
    await http().post(`/v1/promissory-notes/${note.id}/enforce`).set(auth(wsTok)).expect(201); await drain();
    expect(await codes(custTok)).toContain('enforcement.requested');
    // org lifecycle: suspend → org.suspended to owner
    await http().post(`/v1/admin/organizations/${orgId}/suspend`).set(auth(adminTok)).send({ reason: 'اختبار الإشعارات' }).expect(200); await drain();
    expect(await codes(wsTok)).toContain('org.suspended');
    await http().post(`/v1/admin/organizations/${orgId}/reactivate`).set(auth(adminTok)).send({ reason: 'انتهى الاختبار' }).expect(200); await drain();
    expect(await codes(wsTok)).toContain('org.active');
  });
  it('inbox: unread count, mark one read, mark all read; templates listing is admin-only', async () => {
    const before = (await http().get('/v1/me/notifications/unread-count').set(auth(custTok)).expect(200)).body.unread; expect(before).toBeGreaterThan(0);
    const first = (await http().get('/v1/me/notifications?unread=true&limit=1').set(auth(custTok))).body[0];
    await http().post(`/v1/me/notifications/${first.id}/read`).set(auth(custTok)).expect(200);
    expect((await http().get('/v1/me/notifications/unread-count').set(auth(custTok))).body.unread).toBe(before - 1);
    await http().post('/v1/me/notifications/read-all').set(auth(custTok)).expect(200);
    expect((await http().get('/v1/me/notifications/unread-count').set(auth(custTok))).body.unread).toBe(0);
    await http().get('/v1/admin/notifications/templates').set(auth(custTok)).expect(403);
    const t = await http().get('/v1/admin/notifications/templates').set(auth(adminTok)).expect(200); expect(t.body.length).toBeGreaterThan(20);
  });
});
