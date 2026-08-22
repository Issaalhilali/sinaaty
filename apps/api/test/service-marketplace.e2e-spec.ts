import { Test } from '@nestjs/testing';
import { type INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma';
import { OutboxProcessor } from '../src/modules/integrations/outbox/outbox.processor';

/**
 * سوق طلبات الإصلاح (owner directive 2026-08-22): the customer posts the problem with THEIR radius,
 * nearby workshops receive it and answer (diagnosis + estimate or a free inspection + availability),
 * the customer compares — price, rating, distance as ready text, honest badges — and acceptance
 * becomes a draft work order on the existing legal chain. Plus: every parts bid says WHERE the part is.
 */
describe('Service marketplace (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService; let outbox: OutboxProcessor;
  const http = () => request(app.getHttpServer());
  const suffix = String(Date.now()).slice(-7);
  const custPhone = `+96654${suffix}`; const nearPhone = `+96655${suffix}`; const otherPhone = `+96656${suffix}`; const farPhone = `+96657${suffix}`; const dealerPhone = `+96658${suffix}`;
  const RIYADH = { lat: 24.7136, lng: 46.6753 };
  let custTok: string; let nearTok: string; let otherTok: string; let farTok: string; let dealerTok: string; let adminTok: string;
  let nearOrg: string; let otherOrg: string; let farOrg: string; let dealerOrg: string; let vehicleId: string; let reqId: string; let nearOfferId: string;
  const login = async (phone: string) => { const r = await http().post('/v1/auth/otp/request').send({ phone }).expect(200); const v = await http().post('/v1/auth/otp/verify').send({ phone, code: r.body.debug_code }).expect(200); return v.body.accessToken as string; };
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });
  const mkOrg = async (tok: string, phone: string, type: string, name: string, cr: string, loc: { lat: number; lng: number; city: string }) => {
    const org = await http().post('/v1/organizations').set(auth(tok)).send({ type, legal_name_ar: name, cr_number: cr }).expect(201);
    await prisma.organization.update({ where: { id: org.body.id }, data: { status: 'active', verifiedAt: new Date() } });
    const fresh = await login(phone);   // membership rides the token
    await http().post(`/v1/organizations/${org.body.id}/locations`).set(auth(fresh)).send({ city: loc.city, lat: loc.lat, lng: loc.lng, is_primary: true }).expect(201);
    return { id: org.body.id as string, tok: fresh };
  };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication(); app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' }); await app.init(); await app.listen(0, '127.0.0.1');
    prisma = app.get(PrismaService); outbox = app.get(OutboxProcessor);
    adminTok = await login('+966500000099'); custTok = await login(custPhone);
    await http().put('/v1/admin/pilot/flags/service_marketplace').set(auth(adminTok)).send({ enabled: true, reason_ar: 'تفعيل سوق الإصلاح للاختبار' }).expect(200);
    ({ id: nearOrg, tok: nearTok } = await mkOrg(await login(nearPhone), nearPhone, 'workshop', `ورشة القريبة ${suffix}`, `61${suffix}1`, { ...RIYADH, lat: RIYADH.lat + 0.02, city: 'الرياض' }));
    ({ id: otherOrg, tok: otherTok } = await mkOrg(await login(otherPhone), otherPhone, 'service_center', `مركز الثانية ${suffix}`, `61${suffix}2`, { lat: RIYADH.lat - 0.05, lng: RIYADH.lng + 0.05, city: 'الرياض' }));
    ({ id: farOrg, tok: farTok } = await mkOrg(await login(farPhone), farPhone, 'workshop', `ورشة الدمام ${suffix}`, `61${suffix}3`, { lat: 26.4207, lng: 50.0888, city: 'الدمام' }));
    ({ id: dealerOrg, tok: dealerTok } = await mkOrg(await login(dealerPhone), dealerPhone, 'parts_dealer', `قطع الموقع ${suffix}`, `61${suffix}4`, { lat: RIYADH.lat + 0.03, lng: RIYADH.lng - 0.02, city: 'الرياض' }));
    const v = await http().post('/v1/vehicles').set(auth(custTok)).send({ vin: `JTDKN3DU9B0${suffix.slice(0, 6)}`, plate: `س و ق ${suffix.slice(0, 4)}` }).expect(201); vehicleId = v.body.id;
  });
  afterAll(async () => { await app.close(); });

  it('the customer posts the problem with their radius → only workshops inside it receive it', async () => {
    const media = await http().post('/v1/media/presign').set(auth(custTok)).send({ kind: 'image', mime_type: 'image/jpeg', size_bytes: 500, sha256: 'a'.repeat(64), purpose: 'other' }).expect(200);
    const r = await http().post('/v1/service-requests').set(auth(custTok)).send({ vehicle_id: vehicleId, title_ar: 'السيارة ترجّ عند التسارع وصوت من الأمام', description_ar: 'يزداد الصوت مع السرعة', ...RIYADH, radius_km: 20, preferred_time: 'today', media_ids: [media.body.media_id] }).expect(201);
    reqId = r.body.id;
    expect(r.body.number).toMatch(/^SR-\d{4}-\d{6}$/); expect(r.body.recipients_notified).toBeGreaterThanOrEqual(2);   // قاعدة dev مزدحمة بورش حزم سابقة — الاحتواء أدناه هو الحكم
    const nearInbox = await http().get(`/v1/service-requests?org_id=${nearOrg}`).set(auth(nearTok)).expect(200);
    expect(nearInbox.body.map((x: { id: string }) => x.id)).toContain(reqId);
    expect(nearInbox.body.find((x: { id: string }) => x.id === reqId).distanceKm).toBeLessThan(20);
    const farInbox = await http().get(`/v1/service-requests?org_id=${farOrg}`).set(auth(farTok)).expect(200);
    expect(farInbox.body.map((x: { id: string }) => x.id)).not.toContain(reqId);
    // the problem photo opens for the workshop the request reached — and stays shut for the far one
    await http().get(`/v1/media/${media.body.media_id}/download`).set(auth(nearTok)).expect(200);
    await http().get(`/v1/media/${media.body.media_id}/download`).set(auth(farTok)).expect(403);
  });

  it('workshops answer — an estimate and a free inspection; one live offer per org (upsert); outsiders 403', async () => {
    const a = await http().put(`/v1/service-requests/${reqId}/offer`).set(auth(nearTok)).send({ org_id: nearOrg, offer_type: 'estimate', diagnosis_ar: 'الأغلب مساعدات أمامية — نؤكد بعد فحص الرافعة', price_min: '450', price_max: '700', availability: 'now', eta_note_ar: 'نستقبلك خلال ساعة' }).expect(200);
    nearOfferId = a.body.id;
    await http().put(`/v1/service-requests/${reqId}/offer`).set(auth(otherTok)).send({ org_id: otherOrg, offer_type: 'free_inspection', diagnosis_ar: 'نفحص مجاناً ونعطيك السعر قبل أي عمل', availability: 'today' }).expect(200);
    // updating replaces, never duplicates
    await http().put(`/v1/service-requests/${reqId}/offer`).set(auth(nearTok)).send({ org_id: nearOrg, offer_type: 'estimate', diagnosis_ar: 'مساعدات أمامية', price_min: '420', price_max: '650', availability: 'now' }).expect(200);
    expect(await prisma.serviceOffer.count({ where: { requestId: reqId } })).toBe(2);
    await http().put(`/v1/service-requests/${reqId}/offer`).set(auth(farTok)).send({ org_id: farOrg, offer_type: 'estimate', price_min: '100', availability: 'now' }).expect(403);
    // a free inspection with a price is refused — the type must mean what it says
    await http().put(`/v1/service-requests/${reqId}/offer`).set(auth(otherTok)).send({ org_id: otherOrg, offer_type: 'free_inspection', price_min: '50', availability: 'today' }).expect(400);
  });

  it('the customer compares: sorted, badged, with the place as ready text; the workshop sees only its own offer', async () => {
    const mine = await http().get(`/v1/service-requests/${reqId}`).set(auth(custTok)).expect(200);
    expect(mine.body.offers).toHaveLength(2); expect(mine.body.offers_count).toBe(2);
    const [first] = mine.body.offers;
    expect(first.orgId).toBe(nearOrg);                                    // الأرخص المسعّر أولاً
    expect(first.badges).toEqual(expect.arrayContaining(['الأرخص']));
    expect(first.where_text).toMatch(/كم/); expect(first.ratingAvg).toBeDefined();
    const free = mine.body.offers.find((o: { orgId: string }) => o.orgId === otherOrg);
    expect(free.badges).toEqual(expect.arrayContaining(['معاينة مجانية'])); expect(free.priceMin).toBeNull();
    const asWorkshop = await http().get(`/v1/service-requests/${reqId}`).set(auth(nearTok)).expect(200);
    expect(asWorkshop.body.offers).toHaveLength(1); expect(asWorkshop.body.offers[0].orgId).toBe(nearOrg);
  });

  it('acceptance becomes a DRAFT work order at the winner; the other offer is lost; notifications flowed', async () => {
    const r = await http().post(`/v1/service-requests/${reqId}/accept`).set(auth(custTok)).send({ offer_id: nearOfferId }).expect(200);
    expect(r.body.work_order.number).toMatch(/^WO-/); expect(r.body.work_order.status).toBe('draft');
    const wo = await prisma.workOrder.findUnique({ where: { id: r.body.work_order.id } });
    expect(wo).toMatchObject({ orgId: nearOrg, customerUserId: expect.any(String), vehicleId });
    expect((await prisma.serviceOffer.findFirst({ where: { requestId: reqId, orgId: otherOrg } }))!.status).toBe('lost');
    expect((await prisma.serviceRequest.findUnique({ where: { id: reqId } }))!.status).toBe('accepted');
    await http().post(`/v1/service-requests/${reqId}/accept`).set(auth(custTok)).send({ offer_id: nearOfferId }).expect(409);
    await outbox.drain(500); await outbox.drain(500);
    const nearInbox = await http().get('/v1/me/notifications?limit=30').set(auth(nearTok)).expect(200);
    const codes = nearInbox.body.map((n: { templateCode: string }) => n.templateCode);
    expect(codes).toContain('service.request.nearby'); expect(codes).toContain('service.offer.accepted');
    const custInbox = await http().get('/v1/me/notifications?limit=30').set(auth(custTok)).expect(200);
    expect(custInbox.body.map((n: { templateCode: string }) => n.templateCode)).toContain('service.offer.received');
  });

  it('«وسّع النطاق»: widening reaches the workshops newly in range — and only them', async () => {
    // نقطة قرب الدمام: بعيدة عن ركام ورش الرياض من الحزم السابقة، وورشتنا الدمامية على ~١٧ كم منها
    const NEAR_DAMMAM = { lat: 26.3, lng: 50.0 };
    const r = await http().post('/v1/service-requests').set(auth(custTok)).send({ vehicle_id: vehicleId, title_ar: 'مكيف السيارة ضعيف التبريد', ...NEAR_DAMMAM, radius_km: 2, preferred_time: 'this_week' }).expect(201);
    const farBefore = await http().get(`/v1/service-requests?org_id=${farOrg}`).set(auth(farTok)).expect(200);
    expect(farBefore.body.map((x: { id: string }) => x.id)).not.toContain(r.body.id);
    await http().post(`/v1/service-requests/${r.body.id}/widen`).set(auth(farTok)).send({ radius_km: 100 }).expect(403);
    await http().post(`/v1/service-requests/${r.body.id}/widen`).set(auth(custTok)).send({ radius_km: 2 }).expect(400);
    const w = await http().post(`/v1/service-requests/${r.body.id}/widen`).set(auth(custTok)).send({ radius_km: 30 }).expect(200);
    expect(w.body.newly_notified).toBeGreaterThanOrEqual(1);
    const farAfter = await http().get(`/v1/service-requests?org_id=${farOrg}`).set(auth(farTok)).expect(200);
    expect(farAfter.body.map((x: { id: string }) => x.id)).toContain(r.body.id);   // الدمام دخلت بالتوسيع
    await http().post(`/v1/service-requests/${r.body.id}/cancel`).set(auth(custTok)).send({ reason_ar: 'انحلّت' }).expect(200);
  });

  it('parts bids now say WHERE the part is: supplier name, place and km from the delivery point', async () => {
    const pr = await http().post('/v1/parts/requests').set(auth(custTok)).send({ part_name_ar: 'مساعد أمامي يمين', accepted_conditions: ['oem_new', 'aftermarket_new'], quantity: 1, ...RIYADH, radius_km: 40, bidding_minutes: 60 }).expect(201);
    await http().post(`/v1/parts/requests/${pr.body.id}/bids`).set(auth(dealerTok)).send({ org_id: dealerOrg, condition: 'aftermarket_new', unit_price: '350', quantity: 1, eta_hours: 4, warranty_days: 90 }).expect(200);
    const view = await http().get(`/v1/parts/requests/${pr.body.id}`).set(auth(custTok)).expect(200);
    const bid = view.body.bids[0];
    expect(bid.supplier_name_ar).toContain('قطع الموقع');
    expect(bid.supplier_city).toBe('الرياض');
    expect(bid.distance_km).toBeLessThan(10);
    expect(bid.where_text).toMatch(/كم/);
  });
});
