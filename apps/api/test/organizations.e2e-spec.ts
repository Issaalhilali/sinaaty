import { Test } from '@nestjs/testing';
import { type INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/** Step 5 verify: create workshop → upload CR → admin approves (plus members, bank, plan, discovery). */
describe('Organizations (e2e)', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());
  const suffix = String(Date.now()).slice(-7);
  const ownerPhone = `+96655${suffix}`;
  const techPhone = `+96654${suffix}`;
  const adminPhone = '+966500000099'; // seeded super_admin
  let ownerTok: string; let adminTok: string; let strangerTok: string; let orgId: string;

  const login = async (phone: string) => {
    const r = await http().post('/v1/auth/otp/request').send({ phone }).expect(200);
    const v = await http().post('/v1/auth/otp/verify').send({ phone, code: r.body.debug_code }).expect(200);
    return v.body.accessToken as string;
  };
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication(); app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' }); await app.init(); await app.listen(0, '127.0.0.1');
    ownerTok = await login(ownerPhone); adminTok = await login(adminPhone); strangerTok = await login(`+96659${suffix}`);
  });
  afterAll(async () => { await app.close(); });

  it('owner creates a workshop (draft) and becomes owner', async () => {
    const res = await http().post('/v1/organizations').set(auth(ownerTok)).send({ type: 'workshop', legal_name_ar: `ورشة الاختبار ${suffix}`, cr_number: `70${suffix}0`, vat_number: `3${suffix}0000003`, phone: '0112345678' }).expect(201);
    orgId = res.body.id; expect(res.body.status).toBe('draft');
    // token predates membership → refresh a new token so org role is in claims
    ownerTok = await login(ownerPhone);
    const me = await http().get('/v1/me').set(auth(ownerTok)).expect(200);
    expect(me.body.orgs).toEqual([{ org_id: orgId, role: 'owner' }]);
  });
  it('duplicate CR is rejected', async () => {
    const res = await http().post('/v1/organizations').set(auth(ownerTok)).send({ type: 'workshop', legal_name_ar: 'ورشة مكررة', cr_number: `70${suffix}0` }).expect(409);
    expect(res.body.code).toBe('CONFLICT');
  });
  it('submit KYB fails until docs + location exist', async () => {
    const res = await http().post(`/v1/organizations/${orgId}/kyb/submit`).set(auth(ownerTok)).expect(400);
    expect(res.body.details.missing).toEqual(expect.arrayContaining(['commercial_registration', 'owner_id']));
  });
  it('adds a location (PostGIS) and specialties', async () => {
    const loc = await http().post(`/v1/organizations/${orgId}/locations`).set(auth(ownerTok)).send({ city: 'الرياض', industrial_zone: 'الرياض — الصناعية الثانية', lat: 24.63, lng: 46.79 }).expect(201);
    expect(loc.body.isPrimary).toBe(true); expect(loc.body.lat).toBeCloseTo(24.63, 4);
    await http().put(`/v1/organizations/${orgId}/specialties`).set(auth(ownerTok)).send({ items: [{ category_id: 1 }, { make_id: 1 }] }).expect(200);
  });
  it('uploads CR + owner id via presign, attaches as KYB docs, submits → pending_kyb', async () => {
    const attach = async (type: string) => {
      const p = await http().post('/v1/media/presign').set(auth(ownerTok)).send({ kind: 'pdf', mime_type: 'application/pdf', size_bytes: 1234, sha256: 'a'.repeat(64), purpose: 'kyb_document' }).expect(200);
      expect(p.body.upload.url).toContain('/v1/media/mock-upload/');
      await request(app.getHttpServer()).put(new URL(p.body.upload.url).pathname).send('%PDF-1.4').expect(200);
      await http().post(`/v1/organizations/${orgId}/kyb-documents`).set(auth(ownerTok)).send({ type, media_id: p.body.media_id }).expect(201);
    };
    await attach('commercial_registration'); await attach('owner_id');
    const sub = await http().post(`/v1/organizations/${orgId}/kyb/submit`).set(auth(ownerTok)).expect(200);
    expect(sub.body.status).toBe('pending_kyb');
  });
  it('non-admin cannot approve; admin sees it in the KYB queue and approves with a reason → active', async () => {
    await http().post(`/v1/admin/organizations/${orgId}/approve`).set(auth(ownerTok)).send({ reason: 'x' }).expect(403);
    const queue = await http().get('/v1/admin/organizations?status=pending_kyb').set(auth(adminTok)).expect(200);
    expect(queue.body.some((o: { id: string }) => o.id === orgId)).toBe(true);
    await http().post(`/v1/admin/organizations/${orgId}/approve`).set(auth(adminTok)).send({}).expect(400); // reason required
    const ok = await http().post(`/v1/admin/organizations/${orgId}/approve`).set(auth(adminTok)).send({ reason: 'الوثائق مكتملة ومطابقة' }).expect(200);
    expect(ok.body.status).toBe('active');
    const docs = await http().get(`/v1/organizations/${orgId}/kyb-documents`).set(auth(ownerTok)).expect(200);
    expect(docs.body.every((d: { status: string }) => d.status === 'approved')).toBe(true);
  });
  it('illegal transition is rejected (active → active)', async () => {
    const res = await http().post(`/v1/admin/organizations/${orgId}/reactivate`).set(auth(adminTok)).send({ reason: 'إعادة تفعيل' }).expect(409);
    expect(res.body.code).toBe('CONFLICT');
  });
  it('members: add technician by phone, technician cannot manage, only owner cannot be removed', async () => {
    const add = await http().post(`/v1/organizations/${orgId}/members`).set(auth(ownerTok)).send({ phone: techPhone, role: 'technician' }).expect(201);
    expect(add.body.role).toBe('technician');
    const techTok = await login(techPhone);
    await http().patch(`/v1/organizations/${orgId}`).set(auth(techTok)).send({ description_ar: 'x' }).expect(403);
    await http().get(`/v1/organizations/${orgId}`).set(auth(techTok)).expect(200);
    const me = await http().get('/v1/me').set(auth(ownerTok)).expect(200);
    const rm = await http().delete(`/v1/organizations/${orgId}/members/${me.body.id}`).set(auth(ownerTok)).expect(409);
    expect(rm.body.code).toBe('CONFLICT');
    await http().delete(`/v1/organizations/${orgId}/members/${add.body.user_id}`).set(auth(ownerTok)).expect(200);
  });
  it('bank account: IBAN validated, encrypted, only last4 returned', async () => {
    await http().post(`/v1/organizations/${orgId}/bank-accounts`).set(auth(ownerTok)).send({ bank_name: 'الراجحي', iban: 'SA1234', holder_name: 'x' }).expect(400);
    const ok = await http().post(`/v1/organizations/${orgId}/bank-accounts`).set(auth(ownerTok)).send({ bank_name: 'الراجحي', iban: 'SA03 8000 0000 6080 1016 7519', holder_name: 'ورشة الاختبار' }).expect(201);
    expect(ok.body.id).toBeDefined();
    const list = await http().get(`/v1/organizations/${orgId}/bank-accounts`).set(auth(ownerTok)).expect(200);
    expect(list.body[0].ibanLast4).toBe('7519'); expect(JSON.stringify(list.body)).not.toContain('SA0380000000608010167519');
  });
  it('plans: list, subscribe (sets commission), wrong plan type rejected', async () => {
    const plans = await http().get('/v1/organizations/plans?type=workshop').expect(200);
    expect(plans.body.map((p: { code: string }) => p.code)).toContain('workshop_pro');
    const sub = await http().post(`/v1/organizations/${orgId}/subscription`).set(auth(ownerTok)).send({ plan_code: 'workshop_pro' }).expect(200);
    expect(sub.body.commission_rate_bps).toBe(400);
    await http().post(`/v1/organizations/${orgId}/subscription`).set(auth(ownerTok)).send({ plan_code: 'scrapyard_basic' }).expect(400);
  });
  it('public discovery finds the active workshop near its coordinates with distance', async () => {
    const res = await http().get(`/v1/organizations?type=workshop&lat=24.64&lng=46.80&radius_km=10&q=${suffix}`).expect(200);
    const hit = res.body.find((o: { id: string }) => o.id === orgId);
    expect(hit).toBeDefined(); expect(hit.distanceKm).toBeLessThan(5);
    const pub = await http().get(`/v1/organizations/${orgId}/public`).expect(200);
    expect(pub.body.locations).toHaveLength(1);
  });

  it('خدمات الورشة المحفوظة: تُضاف وتُقرأ وتُحذف — والغريب عن المنشأة مردود', async () => {
    const a = await http().post(`/v1/organizations/${orgId}/services`).set(auth(ownerTok)).send({ name_ar: 'غيار زيت وفلتر', unit_price: '280.00', warranty_days: 30 }).expect(201);
    const list = await http().get(`/v1/organizations/${orgId}/services`).set(auth(ownerTok)).expect(200);
    expect(list.body.some((x: { id: string; nameAr: string }) => x.id === a.body.id && x.nameAr === 'غيار زيت وفلتر')).toBe(true);
    await http().get(`/v1/organizations/${orgId}/services`).set(auth(strangerTok)).expect(403);
    await http().delete(`/v1/organizations/${orgId}/services/${a.body.id}`).set(auth(ownerTok)).expect(200);
    const after = await http().get(`/v1/organizations/${orgId}/services`).set(auth(ownerTok)).expect(200);
    expect(after.body.some((x: { id: string }) => x.id === a.body.id)).toBe(false);
  });
});
