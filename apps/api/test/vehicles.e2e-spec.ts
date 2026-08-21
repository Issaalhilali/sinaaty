import { Test } from '@nestjs/testing';
import { type INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Vehicles (e2e)', () => {
  let app: INestApplication; const http = () => request(app.getHttpServer());
  const suffix = String(Date.now()).slice(-7);
  const vin = `4T1B11HK5KU${suffix.slice(0, 6)}`;
  let tokA: string; let tokB: string; let vehicleId: string; let shareToken: string;
  const login = async (phone: string) => { const r = await http().post('/v1/auth/otp/request').send({ phone }).expect(200); const v = await http().post('/v1/auth/otp/verify').send({ phone, code: r.body.debug_code }).expect(200); return v.body.accessToken as string; };
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });
  beforeAll(async () => { const mod = await Test.createTestingModule({ imports: [AppModule] }).compile(); app = mod.createNestApplication(); app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' }); await app.init(); await app.listen(0, '127.0.0.1'); tokA = await login(`+96653${suffix}`); tokB = await login(`+96652${suffix}`); });
  afterAll(async () => { await app.close(); });

  it('decodes a VIN (mock: Toyota Camry 2019)', async () => {
    const r = await http().get(`/v1/vin/${vin}/decode`).set(auth(tokA)).expect(200);
    expect(r.body).toMatchObject({ makeEn: 'Toyota', modelEn: 'Camry', modelYear: 2019, source: 'mock' });
    await http().get('/v1/vin/BADVIN/decode').set(auth(tokA)).expect(400);
  });
  it('adds a vehicle by VIN with odometer → make/model resolved, odometer event written', async () => {
    const r = await http().post('/v1/vehicles').set(auth(tokA)).send({ vin, plate: 'أ ب ج 4821', odometer_km: 84250 }).expect(201);
    vehicleId = r.body.id; expect(r.body.makeNameEn).toBe('Toyota'); expect(r.body.modelYear).toBe(2019); expect(r.body.plateNumberEn).toBe('ABJ 4821');
    const v = await http().get(`/v1/vehicles/${vehicleId}`).set(auth(tokA)).expect(200);
    expect(v.body.events).toHaveLength(1); expect(v.body.events[0].type).toBe('odometer');
  });
  it('same owner re-adding same VIN returns the existing one; another user gets 409', async () => {
    const again = await http().post('/v1/vehicles').set(auth(tokA)).send({ vin }).expect(201);
    expect(again.body.already_exists).toBe(true);
    const other = await http().post('/v1/vehicles').set(auth(tokB)).send({ vin }).expect(409);
    expect(other.body.code).toBe('CONFLICT');
  });
  it('adds a vehicle by plate only; invalid plate rejected', async () => {
    await http().post('/v1/vehicles').set(auth(tokA)).send({ plate: 'د هـ و 1190', make_id: 1, model_year: 2021 }).expect(201);
    await http().post('/v1/vehicles').set(auth(tokA)).send({ plate: '1234' }).expect(400);
    const list = await http().get('/v1/vehicles').set(auth(tokA)).expect(200);
    expect(list.body).toHaveLength(2);
  });
  it('ownership: other user cannot read/update; odometer cannot go backwards', async () => {
    await http().get(`/v1/vehicles/${vehicleId}`).set(auth(tokB)).expect(403);
    await http().put(`/v1/vehicles/${vehicleId}/odometer`).set(auth(tokA)).send({ odometer_km: 80000 }).expect(400);
    await http().put(`/v1/vehicles/${vehicleId}/odometer`).set(auth(tokA)).send({ odometer_km: 85000 }).expect(200);
  });
  it('passport: owner sees full timeline; share link exposes a masked public passport; revoke → 404', async () => {
    const p = await http().get(`/v1/vehicles/${vehicleId}/passport`).set(auth(tokA)).expect(200);
    expect(p.body.events.length).toBeGreaterThanOrEqual(2);
    const s = await http().post(`/v1/vehicles/${vehicleId}/passport/share`).set(auth(tokA)).expect(200);
    shareToken = s.body.token;
    const pub = await http().get(`/v1/passport/${shareToken}`).expect(200);
    expect(pub.body.vehicle.vin_masked).toMatch(/\*{5}/); expect(JSON.stringify(pub.body)).not.toContain('4821'); expect(pub.body.events.length).toBeGreaterThanOrEqual(2);
    await http().delete(`/v1/vehicles/${vehicleId}/passport/share`).set(auth(tokA)).expect(200);
    await http().get(`/v1/passport/${shareToken}`).expect(404);
  });
});
