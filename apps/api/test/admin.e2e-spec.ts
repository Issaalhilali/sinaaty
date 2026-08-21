import { Test } from '@nestjs/testing';
import { type INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
/** Step 15 verify (API side): KPIs, audit browser + CSV export, settings editor (super admin + reason), integrations monitor + DLQ retry, users/roles. */
describe('Admin back-office API (e2e)', () => {
  let app: INestApplication; const http = () => request(app.getHttpServer());
  const login = async (phone: string) => { const r = await http().post('/v1/auth/otp/request').send({ phone }).expect(200); const v = await http().post('/v1/auth/otp/verify').send({ phone, code: r.body.debug_code }).expect(200); return v.body.accessToken as string; };
  const auth = (t: string) => ({ authorization: `Bearer ${t}` }); let admin: string; let ws: string; const suffix = String(Date.now()).slice(-7);
  beforeAll(async () => { const mod = await Test.createTestingModule({ imports: [AppModule] }).compile(); app = mod.createNestApplication(); app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' }); await app.init(); await app.listen(0, '127.0.0.1'); admin = await login('+966500000099'); ws = await login('+966500000001'); });
  afterAll(async () => { await app.close(); });
  it('overview KPIs: staff only; shapes', async () => {
    await http().get('/v1/admin/overview').set(auth(ws)).expect(403);
    const r = await http().get('/v1/admin/overview').set(auth(admin)).expect(200);
    expect(r.body.orgs.total).toBeGreaterThan(0); expect(r.body.money.ledger_imbalance).toBe('0.00'); expect(Array.isArray(r.body.integrations)).toBe(true); expect(r.body.outbox).toHaveProperty('pending');
  });
  it('audit browser: filter + CSV export', async () => {
    // Self-sufficient: write our own audit row instead of depending on an earlier suite having issued
    // an invoice — jest file order shifts with file sizes, and this suite may run first.
    await http().put(`/v1/admin/settings/audit_probe.${suffix}`).set(auth(admin)).send({ value: { on: true }, reason_ar: 'صف تدقيق للاختبار' }).expect(200);
    const r = await http().get('/v1/admin/audit?action=platform_setting.update&limit=5').set(auth(admin)).expect(200); expect(r.body.length).toBeGreaterThan(0); expect(r.body[0].action).toContain('platform_setting.update'); expect(r.body[0].hash).toHaveLength(64);
    const csv = await http().get('/v1/admin/audit.csv?action=platform_setting.update').set(auth(admin)).expect(200); expect(csv.headers['content-type']).toMatch(/text\/csv/); expect(csv.text.split('\n')[0]).toContain('id,occurred_at,actor_user_id');
  });
  it('settings: read for staff, write for super admin only with a reason → audit row', async () => {
    await http().get('/v1/admin/settings').set(auth(admin)).expect(200);
    await http().put(`/v1/admin/settings/test.${suffix}`).set(auth(ws)).send({ value: 1, reason_ar: 'تجربة' }).expect(403);
    await http().put(`/v1/admin/settings/test.${suffix}`).set(auth(admin)).send({ value: { hours: 48 } }).expect(400);
    const w = await http().put(`/v1/admin/settings/test.${suffix}`).set(auth(admin)).send({ value: { hours: 48 }, reason_ar: 'تقليل مدة التحرير للتجربة' }).expect(200); expect(w.body.value.hours).toBe(48);
    const s = await http().get('/v1/admin/settings').set(auth(admin)).expect(200); expect(s.body.find((x: { key: string }) => x.key === `test.${suffix}`).value.hours).toBe(48);
    const a = await http().get('/v1/admin/audit?action=platform_setting.update&limit=1').set(auth(admin)).expect(200); expect(a.body[0].after.key).toBe(`test.${suffix}`); expect(a.body[0].after.reason).toContain('تقليل');
  });
  it('integrations monitor lists requests/webhooks/dead letters; retry needs a reason and is audited', async () => {
    const r = await http().get('/v1/admin/integrations').set(auth(admin)).expect(200); expect(r.body).toHaveProperty('requests'); expect(r.body).toHaveProperty('webhooks'); expect(r.body).toHaveProperty('dead_letters');
    const key = r.body.requests[0]?.idempotencyKey as string | undefined;
    if (key?.startsWith('outbox:')) { await http().post(`/v1/admin/integrations/retry?key=${encodeURIComponent(key)}`).set(auth(admin)).send({}).expect(400); const rt = await http().post(`/v1/admin/integrations/retry?key=${encodeURIComponent(key)}`).set(auth(admin)).send({ reason_ar: 'إعادة محاولة يدوية' }).expect(200); expect(rt.body.retried).toBe(key); }
    const pay = await http().get('/v1/admin/payments').set(auth(admin)).expect(200); expect(Array.isArray(pay.body)).toBe(true);
    const esc = await http().get('/v1/admin/escrow').set(auth(admin)).expect(200); expect(Array.isArray(esc.body)).toBe(true); if (esc.body.length) expect(esc.body[0]).toHaveProperty('beneficiaryNameAr');
  });
  it('users: search + platform role (super admin, not self, reason)', async () => {
    const u = await http().get('/v1/admin/users?q=500000001').set(auth(admin)).expect(200); expect(u.body[0].phone).toBe('+966500000001');
    const me = await http().get('/v1/me').set(auth(admin)).expect(200);
    await http().put(`/v1/admin/users/${me.body.id}/platform-role`).set(auth(admin)).send({ platform_role: 'ops', reason_ar: 'x y z' }).expect(409);
    await http().put(`/v1/admin/users/${u.body[0].id}/platform-role`).set(auth(ws)).send({ platform_role: 'ops', reason_ar: 'x y z' }).expect(403);
  });
});
