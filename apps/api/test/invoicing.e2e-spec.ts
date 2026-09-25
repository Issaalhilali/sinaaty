import { Test } from '@nestjs/testing';
import { type INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { decodeQr } from '@sinaaty/zatca-ubl';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma';

/** Step 8 verify: invoice from WO (totals = snapshot), sequential numbering, QR decodes, void, credit note. */
describe('Invoicing (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService; const http = () => request(app.getHttpServer());
  const suffix = String(Date.now()).slice(-7);
  const wsPhone = '+966500000009'; const custPhone = `+96659${suffix}`;
  let wsTok: string; let custTok: string; let orgId: string; let woId: string; let invId: string; let snapshotTotal: string; let snapshotVat: string;
  const login = async (phone: string) => { const r = await http().post('/v1/auth/otp/request').send({ phone }).expect(200); const v = await http().post('/v1/auth/otp/verify').send({ phone, code: r.body.debug_code }).expect(200); return v.body.accessToken as string; };
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });
  const approve = async (id: string) => { const init = await http().post(`/v1/work-orders/${id}/approve`).set(auth(custTok)).send({ method: 'otp' }).expect(200); await http().post(`/v1/work-orders/${id}/approve/complete`).set(auth(custTok)).send({ method: 'otp', code: init.body.debug_code }).expect(200); };
  const makeReadyWo = async (items: unknown[]) => {
    const wo = await http().post('/v1/work-orders').set(auth(wsTok)).send({ org_id: orgId, customer_phone: custPhone, plate: 'ب ح د 1122', items }).expect(201);
    const ra = await http().post(`/v1/work-orders/${wo.body.id}/request-approval`).set(auth(wsTok)).send({}).expect(200);
    await approve(wo.body.id);
    const st = (await http().get(`/v1/work-orders/${wo.body.id}`).set(auth(wsTok))).body.status;
    if (st === 'awaiting_parts') await http().post(`/v1/work-orders/${wo.body.id}/transition`).set(auth(wsTok)).send({ to: 'in_progress' }).expect(200);
    await http().post(`/v1/work-orders/${wo.body.id}/transition`).set(auth(wsTok)).send({ to: 'ready' }).expect(200);
    return { id: wo.body.id as string, total: ra.body.work_order.total as string, vat: ra.body.work_order.vatAmount as string };
  };
  beforeAll(async () => { const mod = await Test.createTestingModule({ imports: [AppModule] }).compile(); app = mod.createNestApplication(); app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' }); await app.init(); await app.listen(0, '127.0.0.1'); prisma = app.get(PrismaService); wsTok = await login(wsPhone); custTok = await login(custPhone); orgId = (await http().get('/v1/me').set(auth(wsTok))).body.orgs[0].org_id; });
  afterAll(async () => { await app.close(); });

  it('a missing or malformed seller VAT is stopped twice: by the database, then in Arabic — never a silent 500', async () => {
    // ورشة برقم ضريبي مكسور: كان مولّد رمز الاستجابة السريعة يرمي RangeError فيصير 500 بلا سبب مفهوم
    const badPhone = `+96657${suffix}`; let badTok = await login(badPhone);
    const org = await http().post('/v1/organizations').set(auth(badTok)).send({ type: 'workshop', legal_name_ar: `ورشة الرقم المكسور ${suffix}`, cr_number: `72${suffix}5` }).expect(201);
    // الحائط الأخير: القاعدة نفسها ترفض الشكل الباطل مهما كتب من كتب (قيد org_vat_format)
    await expect(prisma.organization.update({ where: { id: org.body.id }, data: { vatNumber: '123456789012345' } })).rejects.toThrow(/org_vat_format|check constraint/);
    // ومنشأة بلا رقم ضريبي إطلاقاً هي الحالة الواقعية الباقية: يجب أن تُخبَر بالعربية لا أن تُصدم بـ500
    await prisma.organization.update({ where: { id: org.body.id }, data: { status: 'active', verifiedAt: new Date() } });
    badTok = await login(badPhone);
    const wo = await http().post('/v1/work-orders').set(auth(badTok)).send({ org_id: org.body.id, customer_phone: custPhone, plate: 'ر ق م 9090', items: [{ type: 'labor', description_ar: 'فحص', quantity: 1, unit_price: '100' }] }).expect(201);
    await http().post(`/v1/work-orders/${wo.body.id}/request-approval`).set(auth(badTok)).send({}).expect(200);
    const init = await http().post(`/v1/work-orders/${wo.body.id}/approve`).set(auth(custTok)).send({ method: 'otp' }).expect(200);
    await http().post(`/v1/work-orders/${wo.body.id}/approve/complete`).set(auth(custTok)).send({ method: 'otp', code: init.body.debug_code }).expect(200);
    const st = (await http().get(`/v1/work-orders/${wo.body.id}`).set(auth(badTok))).body.status;
    if (st === 'awaiting_parts') await http().post(`/v1/work-orders/${wo.body.id}/transition`).set(auth(badTok)).send({ to: 'in_progress' }).expect(200);
    await http().post(`/v1/work-orders/${wo.body.id}/transition`).set(auth(badTok)).send({ to: 'ready' }).expect(200);
    const r = await http().post('/v1/invoices').set(auth(badTok)).send({ work_order_id: wo.body.id }).expect(400);
    expect(r.body.code).toBe('VALIDATION');
    expect(r.body.message_ar).toContain('الرقم الضريبي');
    expect(r.body.message_ar).toContain('أضف');              // تقول لها ماذا تفعل، لا «خطأ غير متوقع»
  });
  it('cannot invoice a work order that is not approved/ready', async () => {
    const wo = await http().post('/v1/work-orders').set(auth(wsTok)).send({ org_id: orgId, customer_phone: custPhone, plate: 'ب ح د 1122', items: [{ type: 'labor', description_ar: 'فحص', quantity: 1, unit_price: '100' }] }).expect(201);
    const r = await http().post('/v1/invoices').set(auth(wsTok)).send({ work_order_id: wo.body.id }).expect(409);
    expect(r.body.code).toBe('INV_WO_NOT_INVOICEABLE');
  });
  it('issues a simplified tax invoice whose totals equal the signed snapshot; QR decodes to seller/VAT/total', async () => {
    const wo = await makeReadyWo([{ type: 'labor', description_ar: 'سمكرة ودهان', quantity: 1, unit_price: '650' }, { type: 'part', description_ar: 'دسكات', quantity: 2, unit_price: '210', discount: '20' }, { type: 'labor', description_ar: 'أجور', quantity: 1, unit_price: '120' }]);
    woId = wo.id; snapshotTotal = wo.total; snapshotVat = wo.vat;
    const inv = await http().post('/v1/invoices').set(auth(wsTok)).send({ work_order_id: woId, notes_ar: 'شكراً لتعاملكم' }).expect(201);
    invId = inv.body.id;
    expect(inv.body.type).toBe('simplified_tax'); expect(inv.body.status).toBe('issued'); expect(inv.body.total).toBe(snapshotTotal); expect(inv.body.vatTotal).toBe(snapshotVat); expect(inv.body.lines).toHaveLength(3);
    expect(inv.body.number).toMatch(/^INV-\d{4}-\d{6}$/); expect(inv.body.sellerSnapshot.vat_number).toBe('300000000000093');
    const qr = decodeQr(inv.body.zatcaQr).fields;
    expect(qr.vatNumber).toBe('300000000000093'); expect(qr.total).toBe(snapshotTotal); expect(qr.vat).toBe(snapshotVat); expect(qr.sellerName).toBe(inv.body.sellerSnapshot.name_ar);
  });
  it('per-line VAT: 2 × 210 − 20 = 400 → VAT 60.00; totals sum lines', async () => {
    const inv = await http().get(`/v1/invoices/${invId}`).set(auth(custTok)).expect(200);
    const part = inv.body.lines.find((l: { descriptionAr: string }) => l.descriptionAr === 'دسكات');
    expect(part.lineTotal).toBe('400.00'); expect(part.vatAmount).toBe('60.00');
    expect(inv.body.subtotal).toBe('1170.00'); expect(inv.body.vatTotal).toBe('175.50'); expect(inv.body.total).toBe('1345.50');
  });
  it('second invoice for the same WO is rejected; numbering is sequential per org', async () => {
    const dup = await http().post('/v1/invoices').set(auth(wsTok)).send({ work_order_id: woId }).expect(409); expect(dup.body.code).toBe('INV_ALREADY_ISSUED');
    const wo2 = await makeReadyWo([{ type: 'labor', description_ar: 'زيت وفلتر', quantity: 1, unit_price: '150' }]);
    const inv2 = await http().post('/v1/invoices').set(auth(wsTok)).send({ work_order_id: wo2.id }).expect(201);
    const n1 = Number((await http().get(`/v1/invoices/${invId}`).set(auth(wsTok))).body.number.slice(-6)); const n2 = Number(inv2.body.number.slice(-6));
    expect(n2).toBe(n1 + 1);
  });
  it('permissions: customer reads, stranger 403, technician cannot issue/void', async () => {
    await http().get(`/v1/invoices/${invId}`).set(auth(custTok)).expect(200);
    await http().get(`/v1/invoices/${invId}`).set(auth(await login(`+96656${suffix}`))).expect(403);
    const mine = await http().get('/v1/invoices').set(auth(custTok)).expect(200); expect(mine.body.map((i: { id: string }) => i.id)).toContain(invId);
    await http().post(`/v1/invoices/${invId}/void`).set(auth(custTok)).send({ reason_ar: 'خطأ' }).expect(403);
  });
  it('document (RTL HTML) and UBL XML are served', async () => {
    const doc = await http().get(`/v1/invoices/${invId}/document`).set(auth(custTok)).expect(200);
    expect(doc.text).toContain('dir="rtl"'); expect(doc.text).toContain('فاتورة ضريبية مبسطة'); expect(doc.text).toContain('1,345.50');
    const xml = await http().get(`/v1/invoices/${invId}/xml`).set(auth(custTok)).expect(200);
    expect(xml.headers['content-type']).toContain('application/xml'); expect(xml.text).toContain('<cbc:InvoiceTypeCode name="0200000">388</cbc:InvoiceTypeCode>'); expect(xml.text).toContain('<cbc:PayableAmount currencyID="SAR">1345.50</cbc:PayableAmount>');
  });
  it('partial credit note references the parent; full credit note voids an unpaid parent; void endpoint works', async () => {
    const inv = await http().get(`/v1/invoices/${invId}`).set(auth(wsTok)).expect(200);
    const part = inv.body.lines.find((l: { descriptionAr: string }) => l.descriptionAr === 'دسكات');
    const cn = await http().post(`/v1/invoices/${invId}/credit-notes`).set(auth(wsTok)).send({ reason_ar: 'إرجاع قطعة واحدة', lines: [{ invoice_line_id: part.id, quantity: 1 }] }).expect(201);
    expect(cn.body.type).toBe('credit_note'); expect(cn.body.number).toMatch(/^CN-/); expect(cn.body.parentInvoiceId).toBe(invId); expect(cn.body.total).toBe('241.50'); // 210 + 15%
    expect(decodeQr(cn.body.zatcaQr).fields.total).toBe('241.50');
    // BR-KSA-56: the note's BillingReference carries the ORIGINAL invoice number, never its own CN- number.
    const cnXml = await http().get(`/v1/invoices/${cn.body.id}/xml`).set(auth(wsTok)).expect(200);
    expect(cnXml.text).toContain(`<cac:BillingReference><cac:InvoiceDocumentReference><cbc:ID>${inv.body.number}</cbc:ID>`);
    expect(cnXml.text).not.toContain(`<cac:BillingReference><cac:InvoiceDocumentReference><cbc:ID>${cn.body.number}</cbc:ID>`);
    const tooBig = await http().post(`/v1/invoices/${invId}/credit-notes`).set(auth(wsTok)).send({ reason_ar: 'x'.repeat(5), lines: [{ invoice_line_id: part.id, quantity: 100 }] }).expect(400);
    expect(tooBig.body.code).toBe('VALIDATION');
    const still = await http().get(`/v1/invoices/${invId}`).set(auth(wsTok)).expect(200); expect(still.body.status).toBe('issued');
    const v = await http().post(`/v1/invoices/${invId}/void`).set(auth(wsTok)).send({ reason_ar: 'أُصدرت بالخطأ' }).expect(200);
    expect(v.body.status).toBe('void'); expect(v.body.voidReason).toBe('أُصدرت بالخطأ');
    await http().post(`/v1/invoices/${invId}/void`).set(auth(wsTok)).send({ reason_ar: 'مرة أخرى' }).expect(409);
    // WO can now be re-invoiced (previous is void)
    const again = await http().post('/v1/invoices').set(auth(wsTok)).send({ work_order_id: woId }).expect(201); expect(again.body.number).not.toBe(inv.body.number);
  });
});
