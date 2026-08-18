import { Test } from '@nestjs/testing';
import { type INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma';

describe('Identity (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  const phone = `+96659${String(Date.now()).slice(-7)}`;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication(); app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' }); await app.init(); prisma = app.get(PrismaService);
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());

  it('protected routes deny without token (bilingual envelope)', async () => {
    const res = await http().get('/v1/me').expect(401);
    expect(res.body).toMatchObject({ code: 'UNAUTHORIZED', message_ar: expect.any(String) });
  });

  describe('OTP login', () => {
    let debugCode: string; let tokens: { accessToken: string; refreshToken: string };
    it('requests an OTP (mock returns debug_code)', async () => {
      const res = await http().post('/v1/auth/otp/request').send({ phone }).expect(200);
      expect(res.body.phone).toBe(phone); expect(res.body.debug_code).toMatch(/^\d{6}$/); debugCode = res.body.debug_code;
    });
    it('rejects a wrong code, then accepts the right one and creates the user', async () => {
      const bad = await http().post('/v1/auth/otp/verify').send({ phone, code: '000000' }).expect(400);
      expect(bad.body.code).toBe('OTP_INVALID');
      const ok = await http().post('/v1/auth/otp/verify').send({ phone, code: debugCode, device: { platform: 'ios', app_flavor: 'partner' } }).expect(200);
      expect(ok.body.is_new).toBe(true); expect(ok.body.accessToken).toBeDefined(); tokens = ok.body;
    });
    it('code cannot be reused', async () => {
      await http().post('/v1/auth/otp/verify').send({ phone, code: debugCode }).expect(400);
    });
    it('GET /me works with the access token and shows the device', async () => {
      const me = await http().get('/v1/me').set('authorization', `Bearer ${tokens.accessToken}`).expect(200);
      expect(me.body.phone).toBe(phone); expect(me.body.nafath_verified).toBe(false);
      const dev = await http().get('/v1/me/devices').set('authorization', `Bearer ${tokens.accessToken}`).expect(200);
      expect(dev.body).toHaveLength(1);
    });
    it('refresh rotates; reusing the old token revokes the family', async () => {
      const r1 = await http().post('/v1/auth/refresh').send({ refresh_token: tokens.refreshToken }).expect(200);
      expect(r1.body.refreshToken).not.toBe(tokens.refreshToken);
      const reuse = await http().post('/v1/auth/refresh').send({ refresh_token: tokens.refreshToken }).expect(401);
      expect(reuse.body.code).toBe('TOKEN_REUSED');
      // the rotated token was in the same family → now revoked too
      const dead = await http().post('/v1/auth/refresh').send({ refresh_token: r1.body.refreshToken }).expect(401);
      expect(['TOKEN_REUSED', 'TOKEN_INVALID']).toContain(dead.body.code);
    });
    it('rate-limits OTP requests per phone (OTP_MAX_REQUESTS_PER_10MIN)', async () => {
      const limit = Number(process.env['OTP_MAX_REQUESTS_PER_10MIN']);
      const fresh = `+96658${String(Date.now()).slice(-7)}`;
      // seed `limit` recent challenges directly (fast) then the next request must be refused
      await prisma.otpChallenge.createMany({ data: Array.from({ length: limit }, (_, i) => ({ phoneE164: fresh, purpose: 'login', codeHash: `seed-${i}`, expiresAt: new Date(Date.now() + 60_000) })) });
      const res = await http().post('/v1/auth/otp/request').send({ phone: fresh }).expect(429);
      expect(res.body.code).toBe('OTP_TOO_MANY');
    });
  });

  describe('Nafath login (mock)', () => {
    const nationalId = `1${String(Date.now()).slice(-9)}`;
    it('initiate → status approved → tokens with nafath_verified=true', async () => {
      const init = await http().post('/v1/auth/nafath/initiate').send({ national_id: nationalId }).expect(200);
      expect(init.body.random).toMatch(/^\d{2}$/);
      const st = await http().get(`/v1/auth/nafath/status/${init.body.transaction_id}?platform=android`).expect(200);
      expect(st.body.status).toBe('approved'); expect(st.body.is_new).toBe(true);
      const me = await http().get('/v1/me').set('authorization', `Bearer ${st.body.accessToken}`).expect(200);
      expect(me.body.nafath_verified).toBe(true);
    });
    it('callback with secret can force rejection', async () => {
      const init = await http().post('/v1/auth/nafath/initiate').send({ national_id: nationalId }).expect(200);
      await http().post('/v1/auth/nafath/callback').set('x-nafath-secret', 'dev-nafath-callback-secret').send({ transaction_id: init.body.transaction_id, status: 'rejected' }).expect(200);
      const st = await http().get(`/v1/auth/nafath/status/${init.body.transaction_id}`).expect(400);
      expect(st.body.code).toBe('NAFATH_REJECTED');
      await http().post('/v1/auth/nafath/callback').send({ transaction_id: 'x', status: 'approved' }).expect(401);
    });
    it('rejects malformed national id with VALIDATION details', async () => {
      const res = await http().post('/v1/auth/nafath/initiate').send({ national_id: '999' }).expect(400);
      expect(res.body.code).toBe('VALIDATION'); expect(res.body.details[0].path).toBe('national_id');
    });
  });
});
