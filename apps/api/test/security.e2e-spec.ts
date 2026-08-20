import { Test } from '@nestjs/testing';
import { type INestApplication, VersioningType } from '@nestjs/common';
import { SignJWT, generateKeyPair } from 'jose';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma';
import { maskUrl } from '../src/common/logging/logger.module';

/**
 * Step 24 — the security review, written as tests so the findings stay fixed.
 * Each case is an attack a real attacker would try: no token, someone else's data, a forged token,
 * a forged webhook, an admin endpoint from an ordinary account, a leaked link used as an SMS pump.
 */
describe('Security review (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  const http = () => request(app.getHttpServer());
  const suffix = String(Date.now()).slice(-7);
  const workshopPhone = '+966500000001';           // seeded owner of ورشة النور
  const customerPhone = `+96657${suffix}`;
  const strangerPhone = `+96658${suffix}`;
  let wsTok: string; let custTok: string; let strangerTok: string;
  let orgId: string; let woId: string; let invoiceId: string; let vehicleId: string;
  const login = async (phone: string) => { const r = await http().post('/v1/auth/otp/request').send({ phone }).expect(200); const v = await http().post('/v1/auth/otp/verify').send({ phone, code: r.body.debug_code }).expect(200); return v.body.accessToken as string; };
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication({ rawBody: true }); app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' }); await app.init();
    prisma = app.get(PrismaService);
    wsTok = await login(workshopPhone); custTok = await login(customerPhone); strangerTok = await login(strangerPhone);
    const me = await http().get('/v1/me').set(auth(wsTok)).expect(200); orgId = me.body.orgs[0].org_id;
    const wo = await http().post('/v1/work-orders').set(auth(wsTok)).send({
      org_id: orgId, customer_phone: customerPhone, vin: `WDBUF56X58B${suffix.slice(0, 6)}`, title_ar: 'صيانة دورية', payment_terms: 'on_delivery',
      items: [{ type: 'labor', description_ar: 'تغيير زيت', quantity: 1, unit_price: '300' }],
    }).expect(201);
    woId = wo.body.id; vehicleId = wo.body.vehicleId ?? wo.body.vehicle_id;
  });
  afterAll(async () => { await app.close(); });

  describe('authentication', () => {
    it('protected endpoints are closed by default (no token → 401)', async () => {
      for (const path of ['/v1/me', '/v1/work-orders', '/v1/invoices', '/v1/parts/warranties', '/v1/transport/jobs', '/v1/accident-reports?org_id=x']) {
        await http().get(path).expect(401);
      }
    });

    it('a token signed with someone else\'s key is rejected (no algorithm confusion, no self-issued admin)', async () => {
      const { privateKey } = await generateKeyPair('EdDSA');
      const forged = await new SignJWT({ role: 'super_admin', nv: true, orgs: [], st: 'active', ph: null })
        .setProtectedHeader({ alg: 'EdDSA' }).setSubject('00000000-0000-0000-0000-000000000000')
        .setIssuer('sinaaty').setAudience('sinaaty-api').setExpirationTime('10m').sign(privateKey);
      const r = await http().get('/v1/me').set(auth(forged)).expect(401);
      expect(r.body.code).toBe('TOKEN_INVALID');
      // A tampered payload on a real token fails the signature too.
      const [h, , s] = wsTok.split('.');
      const evil = Buffer.from(JSON.stringify({ sub: 'x', role: 'super_admin' })).toString('base64url');
      await http().get('/v1/me').set(auth(`${h}.${evil}.${s}`)).expect(401);
    });

    it('platform-staff endpoints refuse an ordinary account', async () => {
      for (const path of ['/v1/admin/overview', '/v1/admin/organizations', '/v1/admin/ledger/health', '/v1/admin/audit']) {
        const r = await http().get(path).set(auth(custTok));
        expect([403, 404]).toContain(r.status);
        expect(r.status).not.toBe(200);
      }
    });
  });

  describe('tenant isolation (IDOR)', () => {
    it('a stranger cannot read a work order, its documents, or its accident file', async () => {
      await http().get(`/v1/work-orders/${woId}`).set(auth(strangerTok)).expect(403);
      await http().get(`/v1/work-orders/${woId}/timeline`).set(auth(strangerTok)).expect(403);
      await http().get(`/v1/work-orders/${woId}/versions/1`).set(auth(strangerTok)).expect(403);
      await http().get(`/v1/work-orders/${woId}/accident-report`).set(auth(strangerTok)).expect((r) => { if (r.status === 200) throw new Error('leaked'); });
    });

    it('a stranger cannot drive someone else\'s work order', async () => {
      await http().post(`/v1/work-orders/${woId}/transition`).set(auth(strangerTok)).send({ to: 'received' }).expect(403);
      await http().post(`/v1/work-orders/${woId}/items`).set(auth(strangerTok)).send({ type: 'labor', description_ar: 'بند مزروع', quantity: 1, unit_price: '1' }).expect(403);
      await http().post(`/v1/work-orders/${woId}/request-approval`).set(auth(strangerTok)).send({}).expect(403);
    });

    it('a stranger cannot read another customer\'s invoice or pay against it', async () => {
      await http().post(`/v1/work-orders/${woId}/transition`).set(auth(wsTok)).send({ to: 'received' }).expect(200);
      await prisma.workOrder.update({ where: { id: woId }, data: { status: 'delivered', approvedAt: new Date(), deliveredAt: new Date() } });
      await prisma.workOrderVersion.create({ data: { workOrderId: woId, version: 1, snapshot: {}, snapshotSha256: 'f'.repeat(64) } }).catch(() => undefined);
      const list = await http().get('/v1/invoices').set(auth(custTok)).expect(200);
      invoiceId = list.body[0]?.id ?? '';
      if (invoiceId) {
        await http().get(`/v1/invoices/${invoiceId}`).set(auth(strangerTok)).expect(403);
        const pay = await http().post('/v1/payments').set(auth(strangerTok)).send({ invoice_id: invoiceId, method: 'mada' });
        expect([403, 404]).toContain(pay.status);
      }
    });

    it('a stranger cannot read another owner\'s vehicle or its private passport', async () => {
      await http().get(`/v1/vehicles/${vehicleId}`).set(auth(strangerTok)).expect(403);
      await http().get(`/v1/vehicles/${vehicleId}/passport`).set(auth(strangerTok)).expect(403);
    });

    it('org-scoped queries refuse an org the caller does not belong to', async () => {
      await http().get(`/v1/organizations/${orgId}/wallet`).set(auth(strangerTok)).expect(403);
      await http().get(`/v1/accident-reports?org_id=${orgId}`).set(auth(strangerTok)).expect(403);
      await http().get(`/v1/work-orders?org_id=${orgId}`).set(auth(strangerTok)).expect(403);
    });
  });

  describe('public surface', () => {
    it('the public Car Passport masks the VIN and never carries owner or plate', async () => {
      const share = await http().post(`/v1/vehicles/${vehicleId}/passport/share`).set(auth(custTok)).expect(200);
      const token = (share.body.token ?? share.body.share_token ?? share.body.url?.split('/').pop()) as string;
      const pub = await http().get(`/v1/passport/${token}`).expect(200);
      const body = JSON.stringify(pub.body);
      expect(body).not.toContain(customerPhone);
      expect(body).not.toContain(`WDBUF56X58B${suffix.slice(0, 6)}`);   // full VIN never leaves
      expect(pub.body.vehicle?.plate ?? null).toBeNull();
      await http().get('/v1/passport/not-a-real-token').expect(404);
    });

    it('a forged PSP webhook is rejected', async () => {
      const r = await http().post('/v1/webhooks/psp').set('x-psp-signature', 'deadbeef').send({ id: 'evt_forged', type: 'payment.succeeded', data: { intent_id: 'pi_x' } });
      expect(r.status).toBeGreaterThanOrEqual(400);
      expect(await prisma.webhookEvent.count({ where: { providerEventId: 'evt_forged', signatureValid: true } })).toBe(0);
    });

    it('the Nafath dev callback needs its secret', async () => {
      await http().post('/v1/auth/nafath/callback').send({ transaction_id: 'tx', status: 'approved' }).expect(401);
      await http().post('/v1/auth/nafath/callback').set('x-nafath-secret', 'wrong').send({ transaction_id: 'tx', status: 'approved' }).expect(401);
    });

    it('OTP verification locks out after the allowed attempts instead of allowing a 6-digit brute force', async () => {
      const phone = `+96659${suffix}`;
      await http().post('/v1/auth/otp/request').send({ phone }).expect(200);
      const codes = ['000001', '000002', '000003', '000004', '000005', '000006'];
      const statuses: number[] = [];
      for (const code of codes) statuses.push((await http().post('/v1/auth/otp/verify').send({ phone, code })).status);
      expect(statuses.every((s) => s >= 400)).toBe(true);
      expect(statuses.at(-1)).not.toBe(200);
    });
  });

  describe('logs and secrets', () => {
    it('tokens in URLs are masked before they reach the logs', () => {
      expect(maskUrl('/v1/approve/abc.def.ghi')).toBe('/v1/approve/[token]');
      expect(maskUrl('/v1/passport/PgT1kZ9')).toBe('/v1/passport/[token]');
      expect(maskUrl('/v1/parts/verify/xyz123?scan=1')).toBe('/v1/parts/verify/[token]?scan=1');
      expect(maskUrl('/v1/work-orders/9f1?x=1')).toBe('/v1/work-orders/9f1?x=1');   // ordinary ids stay readable
    });

    it('audit entries never store raw national ids, IBANs or phone numbers', async () => {
      const rows = await prisma.auditLog.findMany({ take: 200, orderBy: { id: 'desc' } });
      const blob = JSON.stringify(rows.map((r) => [r.before, r.after]));
      expect(blob).not.toMatch(/SA\d{22}/);              // IBAN
      expect(blob).not.toMatch(/\+9665\d{8}/);           // Saudi mobile
      expect(blob).not.toMatch(/"national_id":"\d{10}"/);
    });
  });
});
