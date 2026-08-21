import { Test } from '@nestjs/testing';
import { type INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Media download (security review follow-up): the download URL is signed only after proving the caller
 * may read what the file is attached to. The link grants access, never the id — and in dev the mock
 * storage serves a real PNG so the apps show images instead of broken icons.
 */
describe('Media download (e2e)', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());
  const suffix = String(Date.now()).slice(-7);
  const workshopPhone = '+966500000001';
  const customerPhone = `+96651${suffix}`;
  let wsTok: string; let custTok: string; let orgId: string; let woId: string; let photoId: string; let looseId: string;
  const login = async (phone: string) => { const r = await http().post('/v1/auth/otp/request').send({ phone }).expect(200); const v = await http().post('/v1/auth/otp/verify').send({ phone, code: r.body.debug_code }).expect(200); return v.body.accessToken as string; };
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });
  const upload = async (tag: string) => (await http().post('/v1/media/presign').set(auth(wsTok))
    .send({ kind: 'image', mime_type: 'image/jpeg', size_bytes: 500_000, sha256: tag.repeat(64).slice(0, 64), purpose: 'inspection' }).expect(200)).body.media_id as string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication(); app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' }); await app.init(); await app.listen(0, '127.0.0.1');
    wsTok = await login(workshopPhone); custTok = await login(customerPhone);
    const me = await http().get('/v1/me').set(auth(wsTok)).expect(200); orgId = me.body.orgs[0].org_id;
    const wo = await http().post('/v1/work-orders').set(auth(wsTok)).send({
      org_id: orgId, customer_phone: customerPhone, vin: `SALLSAA146A${suffix.slice(0, 6)}`, title_ar: 'فحص وتصوير', payment_terms: 'on_delivery',
      items: [{ type: 'labor', description_ar: 'فحص', quantity: 1, unit_price: '100' }],
    }).expect(201);
    woId = wo.body.id;
    await http().post(`/v1/work-orders/${woId}/transition`).set(auth(wsTok)).send({ to: 'received' }).expect(200);
    photoId = await upload('a');
    looseId = await upload('b');   // uploaded but never linked to anything
    await http().post(`/v1/work-orders/${woId}/inspections`).set(auth(wsTok))
      .send({ type: 'check_in', odometer_km: 50_000, checklist: {}, damages: [], media_ids: [photoId] }).expect(201);
  });
  afterAll(async () => { await app.close(); });

  it('the workshop and the customer both get a URL for an inspection photo; a stranger gets 403', async () => {
    const ws = await http().get(`/v1/media/${photoId}/download`).set(auth(wsTok)).expect(200);
    expect(ws.body.url).toContain('mock-download');
    expect(ws.body.mime_type).toBe('image/jpeg');
    expect(ws.body.expires_in).toBeLessThanOrEqual(300);

    await http().get(`/v1/media/${photoId}/download`).set(auth(custTok)).expect(200);

    const stranger = await login(`+96652${suffix}`);
    await http().get(`/v1/media/${photoId}/download`).set(auth(stranger)).expect(403);
    await http().get(`/v1/media/${photoId}/download`).expect(401);
  });

  it('an unlinked file belongs to its uploader alone — an id is not a permission', async () => {
    await http().get(`/v1/media/${looseId}/download`).set(auth(wsTok)).expect(200);      // uploader
    await http().get(`/v1/media/${looseId}/download`).set(auth(custTok)).expect(403);    // even the customer
  });

  it('the mock URL serves a real PNG, and the same photo always renders the same', async () => {
    const { url } = (await http().get(`/v1/media/${photoId}/download`).set(auth(wsTok)).expect(200)).body as { url: string };
    const path = new URL(url).pathname;
    const first = await http().get(path).expect(200);
    expect(first.headers['content-type']).toBe('image/png');
    const bytes = first.body as Buffer;
    expect(bytes.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const second = await http().get(path).expect(200);
    expect(Buffer.compare(bytes, second.body as Buffer)).toBe(0);
  });

  it('a missing id is 404, not an oracle', async () => {
    await http().get('/v1/media/00000000-0000-0000-0000-000000000000/download').set(auth(wsTok)).expect(404);
  });
});
