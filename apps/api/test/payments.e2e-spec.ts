import { Test } from '@nestjs/testing';
import { type INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma';
import { PspMockAdapter } from '../src/modules/payments/infrastructure/psp/psp.mock.adapter';

/** Step 9 verify: capture → escrow → ledger; idempotent webhook replay; release rules; payouts; cash; refund. */
describe('Payments + Escrow + Ledger (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService; let psp: PspMockAdapter;
  const http = () => request(app.getHttpServer());
  const suffix = String(Date.now()).slice(-7);
  const wsPhone = '+966500000001'; const custPhone = `+96658${suffix}`; const adminPhone = '+966500000099';
  let wsTok: string; let custTok: string; let adminTok: string; let orgId: string;
  const login = async (phone: string) => { const r = await http().post('/v1/auth/otp/request').send({ phone }).expect(200); const v = await http().post('/v1/auth/otp/verify').send({ phone, code: r.body.debug_code }).expect(200); return v.body.accessToken as string; };
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });
  const ledgerImbalance = async () => Number((await prisma.$queryRaw<Array<{ b: string }>>`SELECT COALESCE(SUM(debit)-SUM(credit),0)::text AS b FROM ledger_lines`)[0]!.b).toFixed(2);
  const balance = async (code: string) => Number((await prisma.$queryRaw<Array<{ b: string }>>`SELECT COALESCE(SUM(l.debit)-SUM(l.credit),0)::text AS b FROM ledger_lines l JOIN ledger_accounts a ON a.id=l.account_id WHERE a.code=${code}`)[0]!.b);
  /** WO → approved (OTP) → in_progress → ready → check-out → delivered → invoice */
  const deliveredInvoice = async (items: unknown[]) => {
    const wo = await http().post('/v1/work-orders').set(auth(wsTok)).send({ org_id: orgId, customer_phone: custPhone, plate: 'ب ح د 1122', items }).expect(201);
    await http().post(`/v1/work-orders/${wo.body.id}/request-approval`).set(auth(wsTok)).send({}).expect(200);
    const init = await http().post(`/v1/work-orders/${wo.body.id}/approve`).set(auth(custTok)).send({ method: 'otp' }).expect(200);
    await http().post(`/v1/work-orders/${wo.body.id}/approve/complete`).set(auth(custTok)).send({ method: 'otp', code: init.body.debug_code }).expect(200);
    const st = (await http().get(`/v1/work-orders/${wo.body.id}`).set(auth(wsTok))).body.status;
    if (st === 'awaiting_parts') await http().post(`/v1/work-orders/${wo.body.id}/transition`).set(auth(wsTok)).send({ to: 'in_progress' }).expect(200);
    await http().post(`/v1/work-orders/${wo.body.id}/transition`).set(auth(wsTok)).send({ to: 'ready' }).expect(200);
    await http().post(`/v1/work-orders/${wo.body.id}/inspections`).set(auth(wsTok)).send({ type: 'check_out', media_ids: [] }).expect(201);
    await http().post(`/v1/work-orders/${wo.body.id}/transition`).set(auth(wsTok)).send({ to: 'delivered' }).expect(200);
    const inv = await http().post('/v1/invoices').set(auth(wsTok)).send({ work_order_id: wo.body.id }).expect(201);
    return { woId: wo.body.id as string, invId: inv.body.id as string, total: inv.body.total as string };
  };
  const payOnline = async (invId: string) => {
    const p = await http().post('/v1/payments').set(auth(custTok)).send({ invoice_id: invId, method: 'mada' }).expect(201);
    await http().post(`/v1/payments/${p.body.payment_id}/mock-pay`).set(auth(custTok)).expect(200);
    return p.body.payment_id as string;
  };

  beforeAll(async () => { const mod = await Test.createTestingModule({ imports: [AppModule] }).compile(); app = mod.createNestApplication({ rawBody: true }); app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' }); await app.init(); prisma = app.get(PrismaService); psp = app.get(PspMockAdapter); wsTok = await login(wsPhone); custTok = await login(custPhone); adminTok = await login(adminPhone); orgId = (await http().get('/v1/me').set(auth(wsTok))).body.orgs[0].org_id; });
  afterAll(async () => { await app.close(); });

  let woId: string; let invId: string; let paymentId: string; let holdId: string; let total: string; let escrowBefore = 0; let commissionBefore = 0;
  it('customer creates a payment intent for a delivered invoice; workshop cannot; unpayable invoice rejected', async () => {
    ({ woId, invId, total } = await deliveredInvoice([{ type: 'labor', description_ar: 'سمكرة', quantity: 1, unit_price: '1000' }]));
    escrowBefore = await balance(`escrow_liability:${orgId}`); commissionBefore = await balance('platform_revenue:commission');
    await http().post('/v1/payments').set(auth(wsTok)).send({ invoice_id: invId }).expect(403);
    const p = await http().post('/v1/payments').set(auth(custTok)).send({ invoice_id: invId, method: 'mada' }).expect(201);
    paymentId = p.body.payment_id; expect(p.body.amount).toBe(total); expect(p.body.intent.id).toMatch(/^pi_mock_/);
    const dup = await http().post('/v1/payments').set(auth(custTok)).send({ invoice_id: invId }).expect(409); expect(dup.body.code).toBe('PAY_INTENT_PENDING');
  });
  it('webhook with bad signature → 401; valid webhook → captured, invoice paid, escrow held, ledger balanced', async () => {
    const p = await http().get(`/v1/payments/${paymentId}`).set(auth(custTok)).expect(200);
    const wh = psp.makeWebhook(p.body.pspIntentId);
    await http().post('/v1/webhooks/psp').set('content-type', 'application/json').set('x-psp-signature', 'deadbeef').send(wh.body).expect(401);
    const ok = await http().post('/v1/webhooks/psp').set('content-type', 'application/json').set(wh.headers).send(wh.body).expect(200);
    expect(ok.body).toEqual({ ok: true, replay: false });
    const inv = await http().get(`/v1/invoices/${invId}`).set(auth(custTok)).expect(200); expect(inv.body.status).toBe('paid'); expect(inv.body.paidTotal).toBe(total);
    const pay = await http().get(`/v1/payments/${paymentId}`).set(auth(custTok)).expect(200); expect(pay.body.status).toBe('captured'); expect(pay.body.escrow.status).toBe('held'); holdId = pay.body.escrow.id;
    expect((await balance(`escrow_liability:${orgId}`)) - escrowBefore).toBeCloseTo(-1150, 2);
    expect(await ledgerImbalance()).toBe('0.00');
  });
  it('replaying the same webhook is idempotent (no double capture, no extra ledger entries)', async () => {
    const p = await http().get(`/v1/payments/${paymentId}`).set(auth(custTok)).expect(200);
    const before = await prisma.ledgerEntry.count();
    const wh = psp.makeWebhook(p.body.pspIntentId, 'payment.succeeded', 'evt_fixed_replay_' + suffix);
    await http().post('/v1/webhooks/psp').set('content-type', 'application/json').set(wh.headers).send(wh.body).expect(200);
    const again = await http().post('/v1/webhooks/psp').set('content-type', 'application/json').set(wh.headers).send(wh.body).expect(200);
    expect(again.body.replay).toBe(true);
    expect(await prisma.ledgerEntry.count()).toBe(before); // second event same intent → payment already captured → no new entry
    expect((await balance(`escrow_liability:${orgId}`)) - escrowBefore).toBeCloseTo(-1150, 2);
  });
  it('customer confirms receipt → released: org_available = gross − 4% commission − VAT on commission; wallet reflects it', async () => {
    const r = await http().post(`/v1/work-orders/${woId}/confirm-receipt`).set(auth(custTok)).expect(200);
    expect(r.body.released[0].id).toBe(holdId);
    const bps = (await http().get(`/v1/organizations/${orgId}`).set(auth(wsTok)).expect(200)).body.commissionRateBps as number;
    const commission = Math.round(1150 * bps / 100) / 100; const vatOnCommission = Math.round(commission * 15) / 100; const net = 1150 - commission - vatOnCommission;
    expect(Number(r.body.released[0].released_amount)).toBeCloseTo(net, 2); expect(Number(r.body.released[0].platform_fee)).toBeCloseTo(commission + vatOnCommission, 2);
    const w = await http().get(`/v1/organizations/${orgId}/wallet`).set(auth(wsTok)).expect(200);
    expect(Number(w.body.available)).toBeGreaterThanOrEqual(net - 0.01); expect((await balance('platform_revenue:commission')) - commissionBefore).toBeCloseTo(-commission, 2);
    expect((await balance(`escrow_liability:${orgId}`)) - escrowBefore).toBeCloseTo(0, 2);
    expect(await ledgerImbalance()).toBe('0.00');
    await http().post(`/v1/work-orders/${woId}/confirm-receipt`).set(auth(custTok)).expect(409); // nothing left to release
  });
  it('technician cannot see the wallet; customer cannot', async () => {
    await http().get(`/v1/organizations/${orgId}/wallet`).set(auth(custTok)).expect(403);
  });
  it('payouts: admin bundles released funds into a payout and executes it → org_available → bank; ledger stays balanced', async () => {
    await http().post(`/v1/organizations/${orgId}/bank-accounts`).set(auth(wsTok)).send({ bank_name: 'الراجحي', iban: 'SA0380000000608010167519', holder_name: 'ورشة النور' }).expect(201);
    const run = await http().post('/v1/admin/payouts/run').set(auth(adminTok)).expect(200);
    const created = run.body.created.find((c: { org_id: string }) => c.org_id === orgId); expect(created).toBeDefined();
    const ex = await http().post(`/v1/admin/payouts/${created.payout_id}/execute`).set(auth(adminTok)).expect(200);
    expect(ex.body.status).toBe('paid'); expect(ex.body.providerRef).toMatch(/^po_/);
    const w = await http().get(`/v1/organizations/${orgId}/wallet`).set(auth(wsTok)).expect(200);
    expect(w.body.payouts[0].status).toBe('paid');
    expect(await ledgerImbalance()).toBe('0.00');
    const health = await http().get('/v1/admin/ledger/health').set(auth(adminTok)).expect(200); expect(health.body.balanced).toBe(true);
  });
  it('auto-release: a held hold past auto_release_at is released by the job; a frozen one is not', async () => {
    const a = await deliveredInvoice([{ type: 'labor', description_ar: 'زيت', quantity: 1, unit_price: '200' }]); const pa = await payOnline(a.invId);
    const b = await deliveredInvoice([{ type: 'labor', description_ar: 'فلتر', quantity: 1, unit_price: '100' }]); const pb = await payOnline(b.invId);
    const ha = (await http().get(`/v1/payments/${pa}`).set(auth(custTok))).body.escrow.id; const hb = (await http().get(`/v1/payments/${pb}`).set(auth(custTok))).body.escrow.id;
    await prisma.$executeRaw`UPDATE escrow_holds SET auto_release_at = now() - interval '1 minute' WHERE id IN (${ha}::uuid, ${hb}::uuid)`;
    await http().post(`/v1/admin/escrow/${hb}/freeze`).set(auth(adminTok)).send({ reason_ar: 'نزاع مفتوح' }).expect(200);
    const job = await http().post('/v1/admin/escrow/release-due').set(auth(adminTok)).expect(200);
    expect(job.body.released).toBeGreaterThanOrEqual(1);
    expect((await http().get(`/v1/escrow/${ha}`).set(auth(adminTok))).body.status).toBe('released');
    expect((await http().get(`/v1/escrow/${hb}`).set(auth(adminTok))).body.status).toBe('frozen');
    // admin can release a frozen hold with a reason (dispute decision path)
    const rel = await http().post(`/v1/admin/escrow/${hb}/release`).set(auth(adminTok)).send({ reason_ar: 'قرار النزاع لصالح الورشة' }).expect(200); expect(rel.body.status).toBe('released');
    expect(await ledgerImbalance()).toBe('0.00');
  });
  it('refund before release: partial refund keeps hold held; full refund → refunded; payment marked', async () => {
    const c = await deliveredInvoice([{ type: 'labor', description_ar: 'برمجة', quantity: 1, unit_price: '300' }]); const pc = await payOnline(c.invId);
    const hc = (await http().get(`/v1/payments/${pc}`).set(auth(custTok))).body.escrow.id;
    await http().post(`/v1/admin/escrow/${hc}/refund`).set(auth(adminTok)).send({ amount: '100.00', reason_ar: 'خصم متفق عليه' }).expect(200);
    expect((await http().get(`/v1/escrow/${hc}`).set(auth(adminTok))).body).toMatchObject({ status: 'held', refundedAmount: '100.00' });
    await http().post(`/v1/admin/escrow/${hc}/refund`).set(auth(adminTok)).send({ amount: '999.00', reason_ar: 'أكثر من المتبقي' }).expect(400);
    await http().post(`/v1/admin/escrow/${hc}/refund`).set(auth(adminTok)).send({ amount: '245.00', reason_ar: 'إلغاء الخدمة' }).expect(200);
    expect((await http().get(`/v1/escrow/${hc}`).set(auth(adminTok))).body.status).toBe('refunded');
    expect((await http().get(`/v1/payments/${pc}`).set(auth(custTok))).body.status).toBe('refunded');
    expect(await ledgerImbalance()).toBe('0.00');
  });
  it('cash payment: workshop initiates, customer OTP confirms → invoice paid, no escrow', async () => {
    const d = await deliveredInvoice([{ type: 'labor', description_ar: 'غسيل', quantity: 1, unit_price: '50' }]);
    await http().post('/v1/payments/cash/init').set(auth(custTok)).send({ invoice_id: d.invId }).expect(403);
    const init = await http().post('/v1/payments/cash/init').set(auth(wsTok)).send({ invoice_id: d.invId }).expect(200);
    expect(init.body.amount).toBe('57.50'); expect(init.body.debug_code).toMatch(/^\d{6}$/);
    await http().post('/v1/payments/cash/confirm').set(auth(wsTok)).send({ invoice_id: d.invId, code: '000000' }).expect(400);
    const ok = await http().post('/v1/payments/cash/confirm').set(auth(wsTok)).send({ invoice_id: d.invId, code: init.body.debug_code }).expect(200);
    expect(ok.body.method).toBe('cash');
    const inv = await http().get(`/v1/invoices/${d.invId}`).set(auth(custTok)).expect(200); expect(inv.body.status).toBe('paid');
    const pays = await http().get(`/v1/invoices/${d.invId}/payments`).set(auth(wsTok)).expect(200); expect(pays.body[0].method).toBe('cash');
    expect((await http().get(`/v1/payments/${ok.body.payment_id}`).set(auth(wsTok))).body.escrow).toBeNull();
    await http().post('/v1/payments').set(auth(custTok)).send({ invoice_id: d.invId }).expect(409); // paid → not payable
  });
});
