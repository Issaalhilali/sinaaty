import { Test } from '@nestjs/testing';
import { type INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma';

/**
 * Step 28 verify: the model reads the intake photos and *suggests*; the inspector decides; and the
 * check-in/check-out comparison answers «هل تضررت سيارتي عند الورشة؟» with photos instead of memory.
 */
describe('AI inspection (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  const http = () => request(app.getHttpServer());
  const suffix = String(Date.now()).slice(-7);
  const workshopPhone = '+966500000001';
  const adminPhone = '+966500000099';
  const customerPhone = `+96655${suffix}`;
  let wsTok: string; let custTok: string; let adminTok: string; let orgId: string; let woId: string; let checkInId: string;
  const login = async (phone: string) => { const r = await http().post('/v1/auth/otp/request').send({ phone }).expect(200); const v = await http().post('/v1/auth/otp/verify').send({ phone, code: r.body.debug_code }).expect(200); return v.body.accessToken as string; };
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });

  const photo = async (tag: string) => (await http().post('/v1/media/presign').set(auth(wsTok))
    .send({ kind: 'image', mime_type: 'image/jpeg', size_bytes: 900_000, sha256: tag.padEnd(64, '0').slice(0, 64), purpose: 'inspection' }).expect(200)).body.media_id as string;

  const inspect = async (type: 'check_in' | 'check_out', mediaIds: string[], damages: unknown[]) =>
    (await http().post(`/v1/work-orders/${woId}/inspections`).set(auth(wsTok))
      .send({ type, odometer_km: type === 'check_in' ? 90_000 : 90_010, fuel_level_pct: 50, checklist: {}, damages, media_ids: mediaIds }).expect(201)).body.id as string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication(); app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' }); await app.init();
    prisma = app.get(PrismaService);
    wsTok = await login(workshopPhone); custTok = await login(customerPhone); adminTok = await login(adminPhone);
    const me = await http().get('/v1/me').set(auth(wsTok)).expect(200); orgId = me.body.orgs[0].org_id;
    const wo = await http().post('/v1/work-orders').set(auth(wsTok)).send({
      org_id: orgId, customer_phone: customerPhone, vin: `KMHD35LE9EU${suffix.slice(0, 6)}`, title_ar: 'صيانة وفحص', payment_terms: 'on_delivery',
      items: [{ type: 'labor', description_ar: 'فحص', quantity: 1, unit_price: '150' }],
    }).expect(201);
    woId = wo.body.id;
    await http().post(`/v1/work-orders/${woId}/transition`).set(auth(wsTok)).send({ to: 'received' }).expect(200);
  });
  afterAll(async () => { await app.close(); });

  it('analysis is off until ops enables it — an advanced surface stays hidden by default', async () => {
    checkInId = await inspect('check_in', [await photo('a1'), await photo('a2')], [{ zone: 'front_bumper', severity: 'minor', note_ar: 'خدش سطحي' }]);
    const r = await http().post(`/v1/inspections/${checkInId}/analyze`).set(auth(wsTok)).send({});
    expect(r.status).toBe(403);
    expect(r.body.message_ar).toContain('غير مفعّلة');

    await http().put('/v1/admin/pilot/flags/ai_inspection').set(auth(adminTok))
      .send({ enabled: true, reason_ar: 'تجربة الفحص بالذكاء الاصطناعي في الطيار' }).expect(200);
  });

  it('the model suggests, the inspector’s own entries are untouched', async () => {
    const r = await http().post(`/v1/inspections/${checkInId}/analyze`).set(auth(wsTok)).send({}).expect(200);
    expect(r.body.provider).toBe('mock');
    expect(r.body.summary_ar).toBeTruthy();

    const human = r.body.damages.filter((d: { source: string }) => d.source === 'inspector');
    expect(human).toHaveLength(1);
    expect(human[0]).toMatchObject({ zone: 'front_bumper', severity: 'minor' });
    expect(human[0].zone_ar).toBe('الصدام الأمامي');

    // Anything the model added is marked as its own and carries a confidence.
    for (const s of r.body.damages.filter((d: { source: string }) => d.source === 'ai')) {
      expect(s.ai_confidence).toBeGreaterThanOrEqual(0.6);
      expect(s.media_ids.length).toBeGreaterThan(0);
    }
    expect(r.body.suggested).toBe(r.body.damages.length - 1);

    const audit = await prisma.auditLog.findMany({ where: { entityId: checkInId, action: 'inspection.ai_analyzed' } });
    expect(audit).toHaveLength(1);
  });

  it('the inspector accepts what they agree with and the rest disappears', async () => {
    const before = (await http().post(`/v1/inspections/${checkInId}/analyze`).set(auth(wsTok)).send({}).expect(200)).body;
    const suggestion = before.damages.find((d: { source: string }) => d.source === 'ai') as { zone: string } | undefined;

    const r = await http().post(`/v1/inspections/${checkInId}/confirm-damages`).set(auth(wsTok))
      .send({ accept_zones: suggestion ? [suggestion.zone] : [] }).expect(200);

    // Everything that survives is the inspector's record now — no half-owned rows.
    expect(r.body.damages.every((d: { source: string }) => d.source === 'inspector')).toBe(true);
    expect(r.body.damages.some((d: { zone: string }) => d.zone === 'front_bumper')).toBe(true);
    if (suggestion) expect(r.body.damages.some((d: { zone: string }) => d.zone === suggestion.zone)).toBe(true);
  });

  it('before the check-out there is nothing to compare — and the API says so instead of implying "all clear"', async () => {
    const r = await http().get(`/v1/work-orders/${woId}/inspection-diff`).set(auth(wsTok)).expect(200);
    expect(r.body.comparable).toBe(false);
    expect(r.body.check_out).toBeNull();
    expect(r.body.summary_ar).toContain('بانتظار فحص التسليم');
  });

  it('the comparison names what appeared while the car was in the workshop', async () => {
    const inDamages = (await http().get(`/v1/work-orders/${woId}/inspection-diff`).set(auth(wsTok)).expect(200)).body.check_in.damages as Array<{ zone: string; severity: string }>;
    // A check-out belongs at the end of the repair; the approval flow itself is Step 7's business.
    await prisma.workOrder.update({ where: { id: woId }, data: { status: 'quality_check', approvedAt: new Date() } });
    await inspect('check_out', [await photo('b1')], [
      ...inDamages.map((d) => ({ zone: d.zone, severity: d.severity })),          // everything that was already there
      { zone: 'rear_left_door', severity: 'severe', note_ar: 'انبعاج جديد' },      // and one that was not
    ]);

    const r = await http().get(`/v1/work-orders/${woId}/inspection-diff`).set(auth(wsTok)).expect(200);
    expect(r.body.comparable).toBe(true);
    expect(r.body.appeared).toHaveLength(1);
    expect(r.body.appeared[0]).toMatchObject({ zone: 'rear_left_door', zone_ar: 'الباب الخلفي الأيسر' });
    expect(r.body.summary_ar).toContain('الباب الخلفي الأيسر');
    expect(r.body.summary_ar).toContain('راجع الصور');
    expect(r.body.check_out.photos.length).toBeGreaterThan(0);
  });

  it('the customer sees the same comparison — it is the evidence handed over at delivery', async () => {
    const r = await http().get(`/v1/work-orders/${woId}/inspection-diff`).set(auth(custTok)).expect(200);
    expect(r.body.appeared).toHaveLength(1);
    const stranger = await login(`+96654${suffix}`);
    await http().get(`/v1/work-orders/${woId}/inspection-diff`).set(auth(stranger)).expect(403);
    await http().post(`/v1/inspections/${checkInId}/analyze`).set(auth(custTok)).send({}).expect(403);
  });

  it('an inspection with no photos is refused before any provider is called', async () => {
    const empty = await inspect('progress' as 'check_in', [], []);
    const r = await http().post(`/v1/inspections/${empty}/analyze`).set(auth(wsTok)).send({}).expect(409);
    expect(r.body.message_ar).toContain('لا توجد صور');
    // Leave the flag as the seed has it, so suite order does not matter.
    await http().put('/v1/admin/pilot/flags/ai_inspection').set(auth(adminTok)).send({ enabled: false, reason_ar: 'إعادة الضبط بعد الاختبار' }).expect(200);
  });
});
