import { INestApplication, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/** ثلاثية إغلاق الحلقات: التقييم بعد التسليم، رحلة القطعة داخل أمر العميل، وحذف الحساب بحارسه. */
describe('Closing loops (e2e)', () => {
  let app: INestApplication; const suffix = `${Date.now()}`.slice(-7);
  const custPhone = `+96653${suffix}`;
  let custTok: string; let wsTok: string; let wsOrg: string; let woId: string;

  const http = () => request(app.getHttpServer());
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });
  const login = async (phone: string) => {
    const r = await http().post('/v1/auth/otp/request').send({ phone }).expect(200);
    const v = await http().post('/v1/auth/otp/verify').send({ phone, code: r.body.debug_code }).expect(200);
    return v.body.accessToken as string;
  };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication(); app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    await app.init(); await app.listen(0, '127.0.0.1');
    custTok = await login(custPhone); wsTok = await login('+966500000001');
    const me = await http().get('/v1/organizations/mine').set(auth(wsTok)).expect(200); wsOrg = me.body[0].id;
    const wo = await http().post('/v1/work-orders').set(auth(wsTok)).send({ org_id: wsOrg, customer_phone: custPhone, plate: `ر س م ${suffix.slice(0, 4)}`, title_ar: 'فحص إغلاق الحلقات', items: [{ type: 'labor', description_ar: 'فحص', qty: 1, unit_price: '100.00' }] }).expect(201);
    woId = wo.body.id;
  });
  afterAll(async () => { await app.close(); });

  it('أمر العميل يحمل رحلة قطعه — حقلٌ حاضر ولو فارغاً، وبلا أسعار أبداً', async () => {
    const r = await http().get(`/v1/work-orders/${woId}`).set(auth(custTok)).expect(200);
    expect(Array.isArray(r.body.part_orders)).toBe(true);
    for (const p of r.body.part_orders) { expect(p).not.toHaveProperty('total'); expect(p).not.toHaveProperty('subtotal'); }
  });

  it('التقييم يُرفض قبل التسليم برسالة تسمّي السبب — ولا «تقييمي» قبل أن أقيّم', async () => {
    const mine = await http().get(`/v1/reviews/mine?work_order_id=${woId}`).set(auth(custTok)).expect(200);
    expect(mine.body).toEqual({});
    const r = await http().post('/v1/reviews').set(auth(custTok)).send({ work_order_id: woId, rating: 5 }).expect(409);
    expect(r.body.message_ar).toContain('بعد تسليم');
  });

  it('حذف الحساب يُرفض على أمرٍ جارٍ — الرسالة تسمّي العائق', async () => {
    const r = await http().delete('/v1/me').set(auth(custTok)).expect(409);
    expect(r.body.message_ar).toContain('أمر إصلاح');
  });

  it('بلا التزامات: الحذف يمحو الهوية ويقطع الجلسات — والرقم يستقبل حساباً جديداً نظيفاً', async () => {
    await http().post(`/v1/work-orders/${woId}/cancel`).set(auth(custTok)).send({ reason_ar: 'اختبار' }).expect(200);
    await http().delete('/v1/me').set(auth(custTok)).expect(200);
    // الرمز الجاري لا يجد صاحبه (deletedAt)، والتجديد مقطوع — ذيلُ الدقائق قرارٌ موثّق في الحالة
    await http().get('/v1/me').set(auth(custTok)).expect(404);
    // نفس الرقم يبدأ من جديد — حسابٌ نظيف بلا اسمٍ قديم (الهوية مُحيت لا أُعيدت)
    const again = await login(custPhone);
    const me = await http().get('/v1/me').set(auth(again)).expect(200);
    expect(me.body.full_name_ar ?? null).toBeNull();
  });
});
