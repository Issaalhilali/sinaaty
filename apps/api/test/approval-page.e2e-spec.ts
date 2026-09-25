import { Test } from '@nestjs/testing';
import { type INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ApprovalLinkService } from '../src/modules/work-orders/application/approval-link.service';
import { AppConfig } from '../src/config';
import { OutboxProcessor } from '../src/modules/integrations/outbox/outbox.processor';
import { SmsMockAdapter } from '../src/modules/notifications/infrastructure/channels/mock-channels';

/** Step 13: "approve without installing the app" — SMS link → RTL web page → OTP → signed version. */
describe('Web approval page (e2e)', () => {
  let app: INestApplication; const http = () => request(app.getHttpServer());
  const suffix = String(Date.now()).slice(-7); const customerPhone = `+96654${suffix}`;
  let wsTok: string; let orgId: string; let woId: string; let token: string; let links: ApprovalLinkService; let outbox: OutboxProcessor; let sms: SmsMockAdapter;
  const login = async (phone: string) => { const r = await http().post('/v1/auth/otp/request').send({ phone }).expect(200); const v = await http().post('/v1/auth/otp/verify').send({ phone, code: r.body.debug_code }).expect(200); return v.body.accessToken as string; };
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });
  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication(); app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' }); await app.init(); await app.listen(0, '127.0.0.1');
    links = app.get(ApprovalLinkService); outbox = app.get(OutboxProcessor); sms = app.get(SmsMockAdapter); wsTok = await login('+966500000001'); await login(customerPhone);
    const me = await http().get('/v1/me').set(auth(wsTok)).expect(200); orgId = me.body.orgs[0].org_id;
    const wo = await http().post('/v1/work-orders').set(auth(wsTok)).send({ org_id: orgId, customer_phone: customerPhone, vin: `JTDKN3DU0A0${suffix.slice(0, 6)}`, title_ar: 'تغيير زيت وفلاتر', payment_terms: 'on_delivery', items: [{ type: 'labor', description_ar: 'تغيير زيت', quantity: 1, unit_price: '150' }] }).expect(201);
    woId = wo.body.id;
    await http().post(`/v1/work-orders/${woId}/transition`).set(auth(wsTok)).send({ to: 'received' }).expect(200);
    await http().post(`/v1/work-orders/${woId}/request-approval`).set(auth(wsTok)).send({}).expect(200);
    token = links.mint(woId, 1);
  });
  afterAll(async () => { await app.close(); });

  it('renders an Arabic RTL page with items, total, terms and one primary button', async () => {
    const r = await http().get(`/v1/approve/${token}`).expect(200);
    expect(r.headers['content-type']).toMatch(/text\/html/); expect(r.text).toContain('dir="rtl"'); expect(r.text).toContain('تغيير زيت'); expect(r.text).toContain('172.50'); expect(r.text).toContain('الدفع عند الاستلام'); expect(r.text).toContain('id="go"');
    const d = await http().get(`/v1/approve/${token}/data`).expect(200); expect(d.body.signed).toBe(false); expect(d.body.phone_masked).toMatch(/\*\*\*\*\*/);
  });
  it('tampered / expired tokens are rejected as not found', async () => {
    await http().get(`/v1/approve/${token.slice(0, -3)}abc`).expect(404);
    const [body] = token.split('.'); await http().get(`/v1/approve/${body}.bad`).expect(404);
    await http().get(`/v1/approve/${links.mint(woId, 1, -1)}`).expect(404);
  });
  it('OTP → complete signs the version and moves the order to approved (as the customer)', async () => {
    await http().post(`/v1/approve/${token}/complete`).send({ code: '000000' }).expect(400);
    const otp = await http().post(`/v1/approve/${token}/otp`).send({}).expect(200);
    const done = await http().post(`/v1/approve/${token}/complete`).send({ code: otp.body.debug_code }).expect(200);
    expect(['approved', 'in_progress']).toContain(done.body.work_order.status);
    const again = await http().get(`/v1/approve/${token}`).expect(200); expect(again.text).toContain('تم اعتماد هذه النسخة'); expect(again.text).not.toContain('id="go"');
    const v = await http().get(`/v1/work-orders/${woId}/versions/1`).set(auth(wsTok)).expect(200); expect(v.body.signed).toBe(true); expect(v.body.signature?.method ?? v.body.signatures?.[0]?.method ?? 'otp').toBe('otp');
  });
  it('the public OTP endpoint is quota-limited: a leaked link cannot pump SMS at the customer', async () => {
    // Its own work order: earlier tests already approved `woId`, and an approved order never reaches the quota.
    const wo = await http().post('/v1/work-orders').set(auth(wsTok)).send({ org_id: orgId, customer_phone: customerPhone, vin: `JTDKN3DU2A0${suffix.slice(0, 6)}`, title_ar: 'فحص كهرباء', payment_terms: 'on_delivery', items: [{ type: 'labor', description_ar: 'فحص', quantity: 1, unit_price: '80' }] }).expect(201);
    await http().post(`/v1/work-orders/${wo.body.id}/transition`).set(auth(wsTok)).send({ to: 'received' }).expect(200);
    await http().post(`/v1/work-orders/${wo.body.id}/request-approval`).set(auth(wsTok)).send({}).expect(200);
    const t = links.mint(wo.body.id, 1);
    const config = app.get(AppConfig); const real = config.get.bind(config);
    const spy = jest.spyOn(config, 'get').mockImplementation(((k: string) => (k === 'OTP_MAX_REQUESTS_PER_10MIN' ? 0 : real(k as never))));
    try { const r = await http().post(`/v1/approve/${t}/otp`).send({}).expect(429); expect(r.body.code).toBe('OTP_TOO_MANY'); }
    finally { spy.mockRestore(); }
    await http().post(`/v1/approve/${t}/otp`).send({}).expect(200);   // back to normal once the window clears
  });
  it('the approval-request SMS carries the link', async () => {
    const wo2 = await http().post('/v1/work-orders').set(auth(wsTok)).send({ org_id: orgId, customer_phone: customerPhone, vin: `JTDKN3DU1A0${suffix.slice(0, 6)}`, title_ar: 'فحص', payment_terms: 'on_delivery', items: [{ type: 'labor', description_ar: 'فحص', quantity: 1, unit_price: '50' }] }).expect(201);
    await http().post(`/v1/work-orders/${wo2.body.id}/transition`).set(auth(wsTok)).send({ to: 'received' }).expect(200);
    await http().post(`/v1/work-orders/${wo2.body.id}/request-approval`).set(auth(wsTok)).send({}).expect(200);
    await outbox.drain(500); await outbox.drain(500);
    const m = sms.sent.find((s) => s.to === customerPhone && s.body.includes(wo2.body.number)); expect(m).toBeDefined();
    const url = m!.body.match(/https?:\/\/\S+\/v1\/approve\/\S+/)?.[0]; expect(url).toBeDefined();
    const t2 = url!.split('/v1/approve/')[1]; const d = await http().get(`/v1/approve/${t2}/data`).expect(200); expect(d.body.work_order_id).toBe(wo2.body.id);
  });
});
