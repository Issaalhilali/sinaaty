import { Test } from '@nestjs/testing';
import { type INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma';
import { OutboxProcessor } from '../src/modules/integrations/outbox/outbox.processor';

/**
 * «أرسلها بتوصيل المنصة»: the supplier hands a paid part order to platform logistics; the ORDER then
 * follows the DRIVER — pickup moves it to shipped (stock decremented once), proof-of-delivery moves it
 * to delivered and starts the auto-confirm clock — and the buyer confirms into escrow release as ever.
 */
describe('Parts delivery rides logistics (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService; let outbox: OutboxProcessor;
  const http = () => request(app.getHttpServer());
  const suffix = String(Date.now()).slice(-7);
  const buyerPhone = `+96654${suffix}`; const supplierPhone = `+96655${suffix}`; const driverPhone = `+96656${suffix}`;
  const STAGE = { lat: 25.4000, lng: 45.9000 };   // بعيداً عن ركام القاعدة
  let buyerTok: string; let supplierTok: string; let driverTok: string; let supplierOrg: string;
  let orderId: string; let jobId: string;
  const login = async (phone: string) => { const r = await http().post('/v1/auth/otp/request').send({ phone }).expect(200); const v = await http().post('/v1/auth/otp/verify').send({ phone, code: r.body.debug_code }).expect(200); return v.body.accessToken as string; };
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication({ rawBody: true }); app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' }); await app.init(); await app.listen(0, '127.0.0.1');
    prisma = app.get(PrismaService); outbox = app.get(OutboxProcessor);
    buyerTok = await login(buyerPhone); driverTok = await login(driverPhone);
    // supplier org with a primary location (the pickup doorstep)
    const t = await login(supplierPhone);
    const org = await http().post('/v1/organizations').set(auth(t)).send({ type: 'parts_dealer', legal_name_ar: `توصيل القطع ${suffix}`, cr_number: `71${suffix}4` }).expect(201);
    supplierOrg = org.body.id;
    await prisma.organization.update({ where: { id: supplierOrg }, data: { status: 'active', verifiedAt: new Date(), vatNumber: `3${suffix}0000003` } });
    supplierTok = await login(supplierPhone);
    await http().post(`/v1/organizations/${supplierOrg}/locations`).set(auth(supplierTok)).send({ city: 'الرياض', district: 'الصناعية', lat: STAGE.lat, lng: STAGE.lng, is_primary: true }).expect(201);
    // a paid auction order with a delivery point ~6km away
    const pr = await http().post('/v1/parts/requests').set(auth(buyerTok)).send({ part_name_ar: 'رديتر كامل', accepted_conditions: ['aftermarket_new'], quantity: 1, lat: STAGE.lat + 0.05, lng: STAGE.lng + 0.02, radius_km: 40, bidding_minutes: 60 }).expect(201);
    const bid = await http().post(`/v1/parts/requests/${pr.body.id}/bids`).set(auth(supplierTok)).send({ org_id: supplierOrg, condition: 'aftermarket_new', unit_price: '600', quantity: 1, eta_hours: 6, warranty_days: 120 }).expect(200);
    const accept = await http().post(`/v1/parts/requests/${pr.body.id}/accept`).set(auth(buyerTok)).send({ bid_id: bid.body.id, payment_terms: 'prepaid' }).expect(200);
    orderId = accept.body.order.id;
    await outbox.drain(300);
    const invId = (await prisma.invoice.findFirst({ where: { partOrderId: orderId } }))!.id;
    const pay = await http().post('/v1/payments').set(auth(buyerTok)).send({ invoice_id: invId, method: 'mada' }).expect(201);
    await http().post(`/v1/payments/${pay.body.payment_id}/mock-pay`).set(auth(buyerTok)).expect(200);
    await outbox.drain(300);
  });
  afterAll(async () => { await app.close(); });

  it('the supplier requests a platform delivery: a parts_delivery job from their doorstep to the order point', async () => {
    expect((await http().get(`/v1/parts/orders/${orderId}`).set(auth(supplierTok))).body.status).toBe('paid');
    // the buyer cannot request the supplier's delivery
    await http().post(`/v1/parts/orders/${orderId}/delivery`).set(auth(buyerTok)).send({}).expect(403);
    const r = await http().post(`/v1/parts/orders/${orderId}/delivery`).set(auth(supplierTok)).send({}).expect(201);
    jobId = r.body.transport_job.id;
    expect(r.body.transport_job.number).toMatch(/^TJ-/); expect(Number(r.body.transport_job.quoted_price)).toBeGreaterThan(0);
    const job = await prisma.transportJob.findUnique({ where: { id: jobId } });
    expect(job).toMatchObject({ type: 'parts_delivery', partOrderId: orderId, requesterOrgId: supplierOrg });
    // one live delivery per order; and the order view carries it
    await http().post(`/v1/parts/orders/${orderId}/delivery`).set(auth(supplierTok)).send({}).expect(409);
    const view = await http().get(`/v1/parts/orders/${orderId}`).set(auth(buyerTok)).expect(200);
    expect(view.body.delivery).toMatchObject({ id: jobId, status: 'requested' });
  });

  it('the DRIVER moves the order: pickup → shipped (stock once), proof-of-delivery → delivered → confirm releases escrow', async () => {
    // التوصيل خدمة تُفوتَر باسم منشأة النقل كالسطحة تماماً، فالسائق يعمل باسم منشأة لا كفرد.
    const dOrg = await http().post('/v1/organizations').set(auth(driverTok)).send({ type: 'logistics', legal_name_ar: `توصيل القطع ${suffix}`, cr_number: `46${suffix}3` }).expect(201);
    await prisma.organization.update({ where: { id: dOrg.body.id }, data: { status: 'active', verifiedAt: new Date(), vatNumber: `3${suffix}0000023` } });
    driverTok = await login(driverPhone);
    await http().put('/v1/transport/driver/profile').set(auth(driverTok)).send({ org_id: dOrg.body.id, truck_plate: `و ص ل ${suffix.slice(0, 2)}`, truck_type: 'parts_delivery' }).expect(200);
    await http().put('/v1/transport/driver/online').set(auth(driverTok)).send({ online: true, lat: STAGE.lat, lng: STAGE.lng }).expect(200);
    await http().post(`/v1/transport/jobs/${jobId}/accept`).set(auth(driverTok)).send({ org_id: dOrg.body.id }).expect(200);
    await http().post(`/v1/transport/jobs/${jobId}/transition`).set(auth(driverTok)).send({ to: 'en_route_pickup' }).expect(200);
    await http().post(`/v1/transport/jobs/${jobId}/transition`).set(auth(driverTok)).send({ to: 'picked_up' }).expect(200);
    await outbox.drain(300);
    expect((await http().get(`/v1/parts/orders/${orderId}`).set(auth(buyerTok))).body.status).toBe('shipped');   // السائق حمل القطعة = شُحنت
    await http().post(`/v1/transport/jobs/${jobId}/transition`).set(auth(driverTok)).send({ to: 'en_route_dropoff' }).expect(200);
    const media = await http().post('/v1/media/presign').set(auth(driverTok)).send({ kind: 'image', mime_type: 'image/jpeg', size_bytes: 700, sha256: 'c'.repeat(64), purpose: 'proof_of_delivery' }).expect(200);
    const otp = await http().post(`/v1/transport/jobs/${jobId}/proof/otp`).set(auth(driverTok)).expect(200);
    await http().post(`/v1/transport/jobs/${jobId}/complete`).set(auth(driverTok)).send({ media_id: media.body.media_id, code: otp.body.debug_code }).expect(200);
    await outbox.drain(300); await outbox.drain(300);
    const o = await http().get(`/v1/parts/orders/${orderId}`).set(auth(buyerTok)).expect(200);
    expect(o.body.status).toBe('delivered'); expect(o.body.autoConfirmAt).toBeTruthy();   // ساعة التأكيد التلقائي انطلقت
    expect(o.body.delivery.status).toBe('delivered');
    await http().post(`/v1/parts/orders/${orderId}/confirm`).set(auth(buyerTok)).expect(200);
    const holds = await prisma.escrowHold.findMany({ where: { partOrderId: orderId } });
    expect(holds.every((h) => h.status === 'released')).toBe(true);
    const imb: Array<{ i: string }> = await prisma.$queryRaw`SELECT COALESCE(ABS(SUM(debit - credit)), 0)::text AS i FROM ledger_lines`;
    expect(Number(imb[0]!.i).toFixed(2)).toBe('0.00');
  });
});
