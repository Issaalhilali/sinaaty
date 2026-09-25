import { Test } from '@nestjs/testing';
import { type INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { decodeQr, isPhase2, verifySignedInvoice } from '@sinaaty/zatca-ubl';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma';
import { OutboxProcessor } from '../src/modules/integrations/outbox/outbox.processor';

/** Step 20 verify: EGS onboarding (CSR → compliance → production CSID), signed UBL, clearance/reporting, PIH chain. */
describe('ZATCA Phase 2 (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService; let outbox: OutboxProcessor; const http = () => request(app.getHttpServer());
  const login = async (phone: string) => { const r = await http().post('/v1/auth/otp/request').send({ phone }).expect(200); const v = await http().post('/v1/auth/otp/verify').send({ phone, code: r.body.debug_code }).expect(200); return v.body.accessToken as string; };
  const auth = (t: string) => ({ authorization: `Bearer ${t}` }); const suffix = String(Date.now()).slice(-7); const custPhone = `+96650${suffix}`;
  let wsTok: string; let custTok: string; let orgId: string; let deviceId: string; let invoice1: string; let invoice2: string;
  const issueInvoice = async (price: string) => {
    const wo = await http().post('/v1/work-orders').set(auth(wsTok)).send({ org_id: orgId, customer_phone: custPhone, plate: `س ك ا ${suffix.slice(0, 4)}`, title_ar: 'صيانة', payment_terms: 'on_delivery', items: [{ type: 'labor', description_ar: 'صيانة دورية', quantity: 1, unit_price: price }] }).expect(201);
    await http().post(`/v1/work-orders/${wo.body.id}/transition`).set(auth(wsTok)).send({ to: 'received' }).expect(200);
    await http().post(`/v1/work-orders/${wo.body.id}/request-approval`).set(auth(wsTok)).send({}).expect(200);
    const init = await http().post(`/v1/work-orders/${wo.body.id}/approve`).set(auth(custTok)).send({ method: 'otp' }).expect(200);
    await http().post(`/v1/work-orders/${wo.body.id}/approve/complete`).set(auth(custTok)).send({ method: 'otp', code: init.body.debug_code }).expect(200);
    for (const to of ['quality_check', 'ready']) await http().post(`/v1/work-orders/${wo.body.id}/transition`).set(auth(wsTok)).send({ to }).expect(200);
    const inv = await http().post('/v1/invoices').set(auth(wsTok)).send({ work_order_id: wo.body.id }).expect(201);
    return inv.body.id as string;
  };
  /** Submissions reference the device, so they go first. */
  const resetDevices = async () => { const ids = (await prisma.zatcaDevice.findMany({ where: { orgId }, select: { id: true } })).map((d) => d.id); if (ids.length) await prisma.zatcaSubmission.deleteMany({ where: { deviceId: { in: ids } } }); await prisma.zatcaDevice.deleteMany({ where: { orgId } }); };
  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile(); app = mod.createNestApplication({ rawBody: true }); app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' }); await app.init(); await app.listen(0, '127.0.0.1'); prisma = app.get(PrismaService); outbox = app.get(OutboxProcessor);
    wsTok = await login('+966500000001'); custTok = await login(custPhone);
    orgId = (await http().get('/v1/me').set(auth(wsTok)).expect(200)).body.orgs[0].org_id;
    await resetDevices();   // re-runnable
  });
  afterAll(async () => { await app.close(); });

  it('onboards an EGS unit: CSR → compliance CSID → compliance checks → production CSID (private key stored encrypted)', async () => {
    await http().post(`/v1/organizations/${orgId}/zatca/onboard`).set(auth(custTok)).send({ unit_name: 'POS-1', otp: '123456' }).expect(403);
    await http().post(`/v1/organizations/${orgId}/zatca/onboard`).set(auth(wsTok)).send({ unit_name: 'POS-1', otp: 'abc' }).expect(400);
    const r = await http().post(`/v1/organizations/${orgId}/zatca/onboard`).set(auth(wsTok)).send({ unit_name: 'POS-1', otp: '123456' }).expect(201);
    deviceId = r.body.device_id; expect(r.body.is_production).toBe(true); expect(r.body.issuer).toContain('ZATCA Mock Production CA'); expect(r.body.certificate_serial).toBeTruthy();
    const row = await prisma.zatcaDevice.findUnique({ where: { id: deviceId } });
    expect(row!.csidEnc).toBeTruthy();
    expect(Buffer.from(row!.csidEnc!).toString('utf8')).not.toContain('PRIVATE KEY');   // sealed, not clear text
    expect(row!.lastIcv).toBe(0n);
  });
  it('signs and clears an invoice: XAdES verifies, QR is Phase 2, chain starts at ICV 1', async () => {
    invoice1 = await issueInvoice('1000');
    const s = await http().post(`/v1/invoices/${invoice1}/zatca/submit`).set(auth(wsTok)).expect(200);
    expect(s.body.status).toBe('reported');                       // simplified invoice (B2C) → reporting
    const inv = await prisma.invoice.findUnique({ where: { id: invoice1 } });
    expect(inv!.zatcaStatus).toBe('reported'); expect(inv!.zatcaIcv).toBe(1n); expect(inv!.zatcaHash).toBe(s.body.hash);
    expect(verifySignedInvoice(inv!.zatcaXml!).valid).toBe(true);                    // independent crypto check
    expect(verifySignedInvoice(inv!.zatcaXml!).invoiceHashBase64).toBe(inv!.zatcaHash);
    expect(isPhase2(inv!.zatcaQr!)).toBe(true);
    const qr = decodeQr(inv!.zatcaQr!);
    expect(qr[6]).toBe(inv!.zatcaHash); expect(qr.fields.total).toBe('1150.00'); expect(qr.fields.vat).toBe('150.00');
    expect(inv!.zatcaXml).toContain(inv!.zatcaQr!);               // the QR is embedded in the archived document
    const subs = await http().get(`/v1/invoices/${invoice1}/zatca`).set(auth(wsTok)).expect(200);
    expect(subs.body[0].status).toBe('reported'); expect(subs.body[0].mode).toBe('reporting'); expect(subs.body[0].errors).toEqual([]);
  });
  it('the next invoice chains to the previous hash (PIH) and increments the counter', async () => {
    invoice2 = await issueInvoice('500');
    await http().post(`/v1/invoices/${invoice2}/zatca/submit`).set(auth(wsTok)).expect(200);
    const [a, b] = await Promise.all([prisma.invoice.findUnique({ where: { id: invoice1 } }), prisma.invoice.findUnique({ where: { id: invoice2 } })]);
    expect(b!.zatcaIcv).toBe(2n);
    expect(b!.zatcaPih).toBe(a!.zatcaHash);                        // the chain links the two documents
    expect(b!.zatcaXml).toContain(a!.zatcaHash!);                  // and the link is inside the signed bytes
    const device = await prisma.zatcaDevice.findUnique({ where: { id: deviceId } });
    expect(device!.lastIcv).toBe(2n); expect(device!.lastHash).toBe(b!.zatcaHash);
  });
  it('issuing an invoice submits it automatically (outbox), no manual call needed', async () => {
    const inv = await issueInvoice('200');
    expect((await prisma.invoice.findUnique({ where: { id: inv } }))!.zatcaStatus).toBe('not_required');
    await outbox.drain(500); await outbox.drain(500);
    const row = await prisma.invoice.findUnique({ where: { id: inv } });
    // Not toBe(3n): any suite's drain() also submits other suites' pending invoices through this
    // device, so the absolute ICV depends on jest file order — only "the chain advanced" is ours.
    expect(row!.zatcaStatus).toBe('reported'); expect(row!.zatcaIcv! >= 3n).toBe(true); expect(verifySignedInvoice(row!.zatcaXml!).valid).toBe(true);
  });
  it('is idempotent, and a tampered archived document no longer verifies', async () => {
    const again = await http().post(`/v1/invoices/${invoice1}/zatca/submit`).set(auth(wsTok)).expect(200);
    expect(again.body.status).toBe('reported');
    expect((await prisma.zatcaSubmission.count({ where: { invoiceId: invoice1 } }))).toBe(1);   // no second submission
    const inv = await prisma.invoice.findUnique({ where: { id: invoice1 } });
    const tampered = inv!.zatcaXml!.replace(/<cbc:PayableAmount currencyID="SAR">[\d.]+<\/cbc:PayableAmount>/, '<cbc:PayableAmount currencyID="SAR">1.00</cbc:PayableAmount>');
    expect(verifySignedInvoice(tampered).valid).toBe(false);
  });
  it('an org without a production CSID is told so instead of silently skipping compliance', async () => {
    const other = await prisma.organization.findFirst({ where: { crNumber: '1010000002' } });
    const owner = await login('+966500000002');
    const wo = await http().get('/v1/invoices').set(auth(owner)).expect(200);
    void wo; void other;
    await resetDevices();
    const inv3 = await issueInvoice('300');
    const r = await http().post(`/v1/invoices/${inv3}/zatca/submit`).set(auth(wsTok)).expect(409);
    expect(r.body.message_ar).toContain('لم تُفعَّل الفوترة الإلكترونية');
    expect((await prisma.invoice.findUnique({ where: { id: inv3 } }))!.zatcaStatus).toBe('not_required');
  });
});
