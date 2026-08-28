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
    app = mod.createNestApplication(); app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' }); await app.init(); await app.listen(0, '127.0.0.1'); prisma = app.get(PrismaService);
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
    it('the OTP user writes his own name — a phone is not a person', async () => {
      const me = await http().patch('/v1/me').set('authorization', `Bearer ${tokens.accessToken}`).send({ full_name_ar: '  مشعل العتيبي  ' }).expect(200);
      expect(me.body.full_name_ar).toBe('مشعل العتيبي');   // trimmed
      const again = await http().get('/v1/me').set('authorization', `Bearer ${tokens.accessToken}`).expect(200);
      expect(again.body.full_name_ar).toBe('مشعل العتيبي');
      await http().patch('/v1/me').set('authorization', `Bearer ${tokens.accessToken}`).send({ full_name_ar: 'م' }).expect(400);
    });
    it('الاسم يوقّع الاعتمادات: أول كتابةٍ بداية، وتغييره بعدها مقفول 90 يوماً بموعدٍ مسمّى', async () => {
      // مستخدم جديد كلياً كي لا يرث اسم اختبارٍ سابق
      const ph = '+966533000333';
      const q = await http().post('/v1/auth/otp/request').send({ phone: ph }).expect(200);
      const t = (await http().post('/v1/auth/otp/verify').send({ phone: ph, code: q.body.debug_code }).expect(200)).body.accessToken as string;
      // أول كتابة تمرّ — بدايةٌ لا تقلّب
      const first = await http().patch('/v1/me').set('authorization', `Bearer ${t}`).send({ full_name_ar: 'بدر القحطاني' }).expect(200);
      expect(first.body.name_locked_until).toBeTruthy();                                 // القفل بدأ
      // التغيير الفوري يُرفض برسالةٍ تحمل الموعد
      const refused = await http().patch('/v1/me').set('authorization', `Bearer ${t}`).send({ full_name_ar: 'بدر آخر' }).expect(400);
      expect(refused.body.message_ar).toContain('يمكنك تغييره بعد');
      // نفس الاسم حرفياً ليس تغييراً — يمرّ بلا اعتراض
      await http().patch('/v1/me').set('authorization', `Bearer ${t}`).send({ full_name_ar: 'بدر القحطاني' }).expect(200);
      // والبريد حرٌّ رغم قفل الاسم — القفل على ما يوقّع، لا على وسيلة التواصل
      const em = await http().patch('/v1/me').set('authorization', `Bearer ${t}`).send({ email: `badr.${Date.now()}@x.sa` }).expect(200);
      expect(em.body.email).toContain('badr.');
    });
    it('البريد للفواتير: يُخزَّن صغيراً، يُمسح بـnull، والمكرر يُرفض بلسانٍ مفهوم', async () => {
      const em = `Meshal.${Date.now()}@Example.COM`;
      const me = await http().patch('/v1/me').set('authorization', `Bearer ${tokens.accessToken}`).send({ email: em }).expect(200);
      expect(me.body.email).toBe(em.toLowerCase());                                  // lowercase دائماً
      await http().patch('/v1/me').set('authorization', `Bearer ${tokens.accessToken}`).send({ email: 'ليس-بريداً' }).expect(400);
      // حسابٌ آخر يحاول نفس البريد (بأحرفٍ كبيرة — citext يمسكها) → تعارضٌ برسالةٍ عربية واضحة
      const other = await http().post('/v1/auth/otp/request').send({ phone: '+966533000222' }).expect(200);
      const ot = await http().post('/v1/auth/otp/verify').send({ phone: '+966533000222', code: other.body.debug_code }).expect(200);
      const dup = await http().patch('/v1/me').set('authorization', `Bearer ${ot.body.accessToken}`).send({ email: em.toUpperCase() }).expect(409);
      expect(dup.body.message_ar).toContain('مستخدم في حساب آخر');
      // والمسح بـnull يعمل — من أراد سحب بريده يسحبه
      const cleared = await http().patch('/v1/me').set('authorization', `Bearer ${tokens.accessToken}`).send({ email: null }).expect(200);
      expect(cleared.body.email).toBeNull();
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
      // الاسم الموثّق قانوني: لا يُستبدل بما يُكتب باليد في التطبيق.
      const refused = await http().patch('/v1/me').set('authorization', `Bearer ${st.body.accessToken}`).send({ full_name_ar: 'اسم آخر' }).expect(400);
      expect(refused.body.code).toBe('VALIDATION');
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
