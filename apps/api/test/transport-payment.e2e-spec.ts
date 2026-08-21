import { Test } from '@nestjs/testing';
import { type INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma';
import { OutboxProcessor } from '../src/modules/integrations/outbox/outbox.processor';

/**
 * P1 scope doc §2 verify: tow delivered with proof → invoice issues itself → paid through the ordinary
 * payment line → escrow releases IN THE SAME breath (the receiver's OTP was the receipt confirmation)
 * split by the margin frozen on the job — and the ledger stays balanced to the halala.
 */
describe('Transport payment (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService; let outbox: OutboxProcessor; const http = () => request(app.getHttpServer());
  const login = async (phone: string) => { const r = await http().post('/v1/auth/otp/request').send({ phone }).expect(200); const v = await http().post('/v1/auth/otp/verify').send({ phone, code: r.body.debug_code }).expect(200); return v.body.accessToken as string; };
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });
  const suffix = String(Date.now()).slice(-7);
  const custPhone = `+96654${suffix}`; const driverPhone = `+96657${suffix}`;
  const PICKUP = { lat: 24.7136, lng: 46.6753 }; const DROPOFF = { lat: 24.6300, lng: 46.7900 };
  let custTok: string; let driverTok: string; let adminTok: string;
  let providerOrgId: string; let jobId: string; let invoiceId: string; let invoiceTotal: string; let margin: string;
  const imbalance = async () => { const r: Array<{ imbalance: string }> = await prisma.$queryRaw`SELECT COALESCE(ABS(SUM(debit - credit)), 0)::text AS imbalance FROM ledger_lines`; return Number(r[0]!.imbalance).toFixed(2); };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication({ rawBody: true }); app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' }); await app.init(); await app.listen(0, '127.0.0.1');
    prisma = app.get(PrismaService); outbox = app.get(OutboxProcessor);
    custTok = await login(custPhone); driverTok = await login(driverPhone); adminTok = await login('+966500000099');
    // The tow provider: a logistics org, active, VAT-registered (a tax invoice needs a seller VAT number).
    const org = await http().post('/v1/organizations').set(auth(driverTok)).send({ type: 'logistics', legal_name_ar: `سطحات النخبة ${suffix}`, cr_number: `47${suffix}2` }).expect(201);
    providerOrgId = org.body.id;
    await prisma.organization.update({ where: { id: providerOrgId }, data: { status: 'active', verifiedAt: new Date(), vatNumber: `3${suffix}0000003` } });
    driverTok = await login(driverPhone);   // the pre-org token does not carry the new membership
    await http().put('/v1/transport/driver/profile').set(auth(driverTok)).send({ org_id: providerOrgId, truck_plate: `س ط ح ${suffix.slice(0, 3)}`, truck_type: 'flatbed_tow' }).expect(200);
    await http().put('/v1/transport/driver/online').set(auth(driverTok)).send({ online: true, lat: 24.7100, lng: 46.6800 }).expect(200);
  });
  afterAll(async () => { await app.close(); });

  it('delivered with proof → the invoice issues itself: price as the single line + 15% VAT, transport_job_id set', async () => {
    const r = await http().post('/v1/transport/jobs').set(auth(custTok)).send({ type: 'flatbed_tow', pickup: PICKUP, pickup_address: 'طريق الملك فهد', dropoff: DROPOFF, dropoff_address: 'الصناعية الثانية' }).expect(201);
    jobId = r.body.id; margin = r.body.platformMargin;
    await http().post(`/v1/transport/jobs/${jobId}/accept`).set(auth(driverTok)).send({ org_id: providerOrgId }).expect(200);
    for (const to of ['en_route_pickup', 'picked_up', 'en_route_dropoff']) await http().post(`/v1/transport/jobs/${jobId}/transition`).set(auth(driverTok)).send({ to }).expect(200);
    const p = await http().post('/v1/media/presign').set(auth(driverTok)).send({ kind: 'image', mime_type: 'image/jpeg', size_bytes: 700, sha256: 'f'.repeat(64), purpose: 'proof_of_delivery' }).expect(200);
    const otp = await http().post(`/v1/transport/jobs/${jobId}/proof/otp`).set(auth(driverTok)).expect(200);
    const done = await http().post(`/v1/transport/jobs/${jobId}/complete`).set(auth(driverTok)).send({ media_id: p.body.media_id, code: otp.body.debug_code }).expect(200);
    expect(done.body.status).toBe('delivered');
    await outbox.drain(500); await outbox.drain(500);
    const j = await http().get(`/v1/transport/jobs/${jobId}`).set(auth(custTok)).expect(200);
    expect(j.body.invoice).toBeTruthy(); expect(j.body.invoice.number).toMatch(/^INV-\d{4}-\d{6}$/); expect(j.body.invoice.status).toBe('issued');
    invoiceId = j.body.invoice.id; invoiceTotal = j.body.invoice.total;
    const inv = await http().get(`/v1/invoices/${invoiceId}`).set(auth(custTok)).expect(200);
    expect(inv.body.transportJobId).toBe(jobId); expect(inv.body.lines).toHaveLength(1);
    expect(inv.body.lines[0].descriptionAr).toContain('نقل مركبة'); expect(inv.body.lines[0].unitPrice).toBe(done.body.finalPrice);
    expect(Number(inv.body.vatTotal)).toBeCloseTo(Number(done.body.finalPrice) * 0.15, 1);
    expect(inv.body.sellerSnapshot.vat_number).toBe(`3${suffix}0000003`);
    // Replaying the event issues nothing new — one job, one invoice.
    await outbox.drain(500);
    const again = await http().get(`/v1/transport/jobs/${jobId}`).set(auth(custTok)).expect(200);
    expect(again.body.invoice.id).toBe(invoiceId);
    expect(await prisma.invoice.count({ where: { transportJobId: jobId } })).toBe(1);
  });

  it('the customer is told «فاتورة سطحتك جاهزة», deep-linked to the job — not the generic invoice copy', async () => {
    const inbox = await http().get('/v1/me/notifications?limit=30').set(auth(custTok)).expect(200);
    const n = inbox.body.find((x: { templateCode: string }) => x.templateCode === 'transport.invoice.issued');
    expect(n).toBeTruthy(); expect(n.titleAr).toContain('سطحت'); expect(n.bodyAr).toContain('وصلت سيارتك'); expect(n.data.deep_link).toBe(`sinaaty://transport/${jobId}`);
  });

  it('paying after proven delivery releases the escrow in the same transaction, split by the job margin', async () => {
    const intent = await http().post('/v1/payments').set(auth(custTok)).send({ invoice_id: invoiceId, method: 'mada' }).expect(201);
    await http().post(`/v1/payments/${intent.body.payment_id}/mock-pay`).set(auth(custTok)).expect(200);
    const inv = await http().get(`/v1/invoices/${invoiceId}`).set(auth(custTok)).expect(200);
    expect(inv.body.status).toBe('paid');
    // The OTP at the door was the receipt confirmation — no held window, no confirm-receipt step.
    const hold = await prisma.escrowHold.findFirst({ where: { payment: { invoiceId } } });
    expect(hold!.status).toBe('released'); expect(hold!.releaseReason).toBe('customer_confirmed');
    const vatOnMargin = Math.round(Number(margin) * 0.15 * 100) / 100;
    expect(Number(hold!.platformFee)).toBeCloseTo(Number(margin) + vatOnMargin, 2);
    expect(Number(hold!.releasedAmount)).toBeCloseTo(Number(invoiceTotal) - Number(margin) - vatOnMargin, 2);
    // The margin landed in its own revenue stream, not in commission.
    const lines: Array<{ code: string; credit: string }> = await prisma.$queryRaw`
      SELECT a.code, l.credit::text FROM ledger_lines l JOIN ledger_accounts a ON a.id = l.account_id
      JOIN ledger_entries e ON e.id = l.entry_id WHERE e.idempotency_key = ${'escrow_release:' + hold!.id}`;
    const byCode = Object.fromEntries(lines.map((l) => [l.code, l.credit]));
    expect(Number(byCode['platform_revenue:transport_margin'])).toBeCloseTo(Number(margin), 2);
    expect(byCode['platform_revenue:commission']).toBeUndefined();
    expect(await imbalance()).toBe('0.00');
  });

  it('the provider wallet shows the released net, and admin ledger health stays clean', async () => {
    const wallet = await http().get(`/v1/organizations/${providerOrgId}/wallet`).set(auth(driverTok)).expect(200);
    expect(Number(wallet.body.available)).toBeGreaterThan(0);
    const health = await http().get('/v1/admin/ledger/health').set(auth(adminTok)).expect(200);
    expect(Number(health.body.imbalance)).toBe(0);
  });
});
