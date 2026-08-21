import { Test } from '@nestjs/testing';
import { type INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma';
import { OutboxProcessor } from '../src/modules/integrations/outbox/outbox.processor';

/** Step 19 verify: quote → tow request → nearby driver accepts → tracking → proof of delivery (photo + receiver OTP) → passport event. */
describe('Logistics — tow request (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService; let outbox: OutboxProcessor; const http = () => request(app.getHttpServer());
  const login = async (phone: string) => { const r = await http().post('/v1/auth/otp/request').send({ phone }).expect(200); const v = await http().post('/v1/auth/otp/verify').send({ phone, code: r.body.debug_code }).expect(200); return v.body.accessToken as string; };
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });
  const suffix = String(Date.now()).slice(-7); const custPhone = `+96652${suffix}`; const driverPhone = `+96656${suffix}`; const otherDriverPhone = `+96655${suffix}`;
  const PICKUP = { lat: 24.7136, lng: 46.6753 };   // وسط الرياض
  const DROPOFF = { lat: 24.6300, lng: 46.7900 };  // ورشة النور — الصناعية الثانية
  let custTok: string; let driverTok: string; let otherTok: string; let adminTok: string; let jobId: string; let mediaId: string; let vehicleId: string;
  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile(); app = mod.createNestApplication({ rawBody: true }); app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' }); await app.init(); await app.listen(0, '127.0.0.1');
    prisma = app.get(PrismaService); outbox = app.get(OutboxProcessor);
    custTok = await login(custPhone); driverTok = await login(driverPhone); otherTok = await login(otherDriverPhone); adminTok = await login('+966500000099');
    const v = await http().post('/v1/vehicles').set(auth(custTok)).send({ vin: `JTDKN3DU9A0${suffix.slice(0, 6)}`, plate: `س ط ح ${suffix.slice(0, 4)}` }).expect(201); vehicleId = v.body.id;
  });
  afterAll(async () => { await app.close(); });

  it('quotes by route distance: price scales with distance and truck type, never below the minimum', async () => {
    const q = await http().post('/v1/transport/quote').set(auth(custTok)).send({ type: 'flatbed_tow', pickup: PICKUP, dropoff: DROPOFF }).expect(200);
    expect(Number(q.body.distance_km)).toBeGreaterThan(15);         // haversine × road factor
    expect(Number(q.body.price)).toBeGreaterThan(120); expect(q.body.currency).toBe('SAR'); expect(q.body.eta_minutes).toBeGreaterThan(5);
    const heavy = await http().post('/v1/transport/quote').set(auth(custTok)).send({ type: 'heavy_tow', pickup: PICKUP, dropoff: DROPOFF }).expect(200);
    expect(Number(heavy.body.price)).toBeGreaterThan(Number(q.body.price));
    const short = await http().post('/v1/transport/quote').set(auth(custTok)).send({ type: 'flatbed_tow', pickup: PICKUP, dropoff: { lat: PICKUP.lat + 0.001, lng: PICKUP.lng } }).expect(200);
    expect(short.body.price).toBe('90.00');
    await http().post('/v1/transport/quote').set(auth(custTok)).send({ type: 'flatbed_tow', pickup: { lat: 999, lng: 0 }, dropoff: DROPOFF }).expect(400);
  });
  it('customer requests a tow for their car; the quoted price and margin are frozen on the job', async () => {
    const r = await http().post('/v1/transport/jobs').set(auth(custTok)).send({ type: 'flatbed_tow', vehicle_id: vehicleId, pickup: PICKUP, pickup_address: 'طريق الملك فهد', dropoff: DROPOFF, dropoff_address: 'ورشة النور', notes_ar: 'السيارة لا تدور' }).expect(201);
    jobId = r.body.id; expect(r.body.number).toMatch(/^TJ-\d{4}-\d{6}$/); expect(r.body.status).toBe('requested'); expect(Number(r.body.quotedPrice)).toBeGreaterThan(0);
    expect(Number(r.body.platformMargin)).toBeCloseTo(Number(r.body.quotedPrice) * 0.15, 1);
    const stranger = await login(`+96651${suffix}`); await http().get(`/v1/transport/jobs/${jobId}`).set(auth(stranger)).expect(403);
  });
  it('driver profile + going online is required before seeing nearby offers', async () => {
    await http().get('/v1/transport/driver/offers').set(auth(driverTok)).expect(403);           // no profile yet
    await http().put('/v1/transport/driver/profile').set(auth(driverTok)).send({ truck_plate: `ن ق ل ${suffix.slice(0, 3)}`, truck_type: 'flatbed_tow' }).expect(200);
    await http().get('/v1/transport/driver/offers').set(auth(driverTok)).expect(409);           // no location yet
    await http().put('/v1/transport/driver/online').set(auth(driverTok)).send({ online: true, lat: 24.7100, lng: 46.6800 }).expect(200);
    const offers = await http().get('/v1/transport/driver/offers?radius_km=30').set(auth(driverTok)).expect(200);
    expect(offers.body.map((j: { id: string }) => j.id)).toContain(jobId);
    // a driver 200 km away sees nothing
    await http().put('/v1/transport/driver/profile').set(auth(otherTok)).send({ truck_type: 'flatbed_tow' }).expect(200);
    await http().put('/v1/transport/driver/online').set(auth(otherTok)).send({ online: true, lat: 26.4207, lng: 50.0888 }).expect(200); // الدمام
    const far = await http().get('/v1/transport/driver/offers?radius_km=30').set(auth(otherTok)).expect(200);
    expect(far.body.map((j: { id: string }) => j.id)).not.toContain(jobId);
    const near = await http().get(`/v1/admin/transport/drivers/near?lat=${PICKUP.lat}&lng=${PICKUP.lng}&radius_km=30`).set(auth(adminTok)).expect(200);
    expect(near.body[0].distanceKm).toBeLessThan(30);
  });
  it('first driver to accept wins; the second gets a conflict', async () => {
    const a = await http().post(`/v1/transport/jobs/${jobId}/accept`).set(auth(driverTok)).send({}).expect(200);
    expect(a.body.status).toBe('assigned'); expect(a.body.driverUserId).toBeTruthy(); expect(a.body.assignedAt).toBeTruthy();
    await http().post(`/v1/transport/jobs/${jobId}/accept`).set(auth(otherTok)).send({}).expect(409);
    const view = await http().get(`/v1/transport/jobs/${jobId}`).set(auth(custTok)).expect(200);
    expect(view.body.driver.truck_plate).toContain('ن ق ل'); expect(view.body.driver.phone).toBe(driverPhone);
    await outbox.drain(500); await outbox.drain(500);
  });
  it('driver drives the state machine; illegal jumps and foreign drivers are refused; tracking is rate-limited', async () => {
    await http().post(`/v1/transport/jobs/${jobId}/transition`).set(auth(otherTok)).send({ to: 'picked_up' }).expect(403);
    await http().post(`/v1/transport/jobs/${jobId}/transition`).set(auth(driverTok)).send({ to: 'picked_up' }).expect(409);   // must go en_route_pickup first
    await http().post(`/v1/transport/jobs/${jobId}/transition`).set(auth(driverTok)).send({ to: 'en_route_pickup' }).expect(200);
    await http().post(`/v1/transport/jobs/${jobId}/track`).set(auth(driverTok)).send({ lat: 24.7120, lng: 46.6790, speed_kmh: 42, heading: 180 }).expect(200);
    await http().post(`/v1/transport/jobs/${jobId}/track`).set(auth(driverTok)).send({ lat: 24.7110, lng: 46.6800 }).expect(429); // < TRANSPORT_TRACK_MIN_SECONDS
    await http().post(`/v1/transport/jobs/${jobId}/track`).set(auth(custTok)).send({ lat: 24.7, lng: 46.7 }).expect(403);
    await http().post(`/v1/transport/jobs/${jobId}/transition`).set(auth(driverTok)).send({ to: 'picked_up' }).expect(200);
    await http().post(`/v1/transport/jobs/${jobId}/cancel`).set(auth(custTok)).send({ reason_ar: 'غيّرت رأيي بعد التحميل' }).expect(409); // car already on the truck
    await http().post(`/v1/transport/jobs/${jobId}/transition`).set(auth(driverTok)).send({ to: 'en_route_dropoff' }).expect(200);
    const j = await http().get(`/v1/transport/jobs/${jobId}`).set(auth(custTok)).expect(200);
    expect(j.body.status).toBe('en_route_dropoff'); expect(j.body.pickedUpAt).toBeTruthy(); expect(j.body.tracking).toHaveLength(1); expect(j.body.tracking[0].geo.lat).toBeCloseTo(24.712, 2);
  });
  it('delivery needs both proofs: the receiver code and a photo — a wrong code does not deliver', async () => {
    const p = await http().post('/v1/media/presign').set(auth(driverTok)).send({ kind: 'image', mime_type: 'image/jpeg', size_bytes: 800, sha256: 'e'.repeat(64), purpose: 'other' }).expect(200); mediaId = p.body.media_id;
    const otp = await http().post(`/v1/transport/jobs/${jobId}/proof/otp`).set(auth(driverTok)).expect(200);
    expect(otp.body.sent_to).toMatch(/\*\*\*\*\*/);
    await http().post(`/v1/transport/jobs/${jobId}/complete`).set(auth(driverTok)).send({ media_id: mediaId, code: '000000' }).expect(400);
    expect((await prisma.transportJob.findUnique({ where: { id: jobId } }))!.status).toBe('en_route_dropoff');
    const done = await http().post(`/v1/transport/jobs/${jobId}/complete`).set(auth(driverTok)).send({ media_id: mediaId, code: otp.body.debug_code }).expect(200);
    expect(done.body.status).toBe('delivered'); expect(done.body.proofOtpVerified).toBe(true); expect(done.body.proofMediaId).toBe(mediaId); expect(done.body.finalPrice).toBe(done.body.quotedPrice);
    await http().post(`/v1/transport/jobs/${jobId}/track`).set(auth(driverTok)).send({ lat: 24.63, lng: 46.79 }).expect(409); // job closed
  });
  it('the requester is notified at each step: assigned (SMS), status, delivery code (SMS), delivered', async () => {
    await outbox.drain(500); await outbox.drain(500);
    const inbox = await http().get('/v1/me/notifications?limit=50').set(auth(custTok)).expect(200);
    const codes = inbox.body.map((n: { templateCode: string }) => n.templateCode);
    for (const c of ['transport.assigned', 'transport.status', 'transport.proof', 'transport.delivered']) expect(codes).toContain(c);
    const assigned = inbox.body.find((n: { templateCode: string }) => n.templateCode === 'transport.assigned');
    expect(assigned.bodyAr).toContain('ن ق ل'); expect(assigned.data.deep_link).toBe(`sinaaty://transport/${jobId}`);
    const proof = inbox.body.find((n: { templateCode: string }) => n.templateCode === 'transport.proof');
    expect(proof.bodyAr).toMatch(/\d{6}/);
  });
  it('the tow lands in the Car Passport and the audit trail', async () => {
    const pp = await http().get(`/v1/vehicles/${vehicleId}/passport`).set(auth(custTok)).expect(200);
    expect(pp.body.events.some((e: { summaryAr: string }) => e.summaryAr.includes('نقل بالسطحة'))).toBe(true);
    const audit = await http().get('/v1/admin/audit?action=transport.delivered&limit=1').set(auth(adminTok)).expect(200);
    expect(audit.body[0].after.otp_verified).toBe(true); expect(Number(audit.body[0].after.margin)).toBeGreaterThan(0);
  });
});
