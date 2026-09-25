import { Test } from '@nestjs/testing';
import { type INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma';
import { OutboxProcessor } from '../src/modules/integrations/outbox/outbox.processor';
import { PilotService } from '../src/modules/pilot/application/pilot.service';

/**
 * Step 25 verify: a workshop's location lands in a pilot zone by itself, the apps are told exactly which
 * features they may show, ops can turn one on for one zone (with a reason, in the audit log), and real
 * work shows up in the funnel — counted once, even when the outbox replays.
 */
describe('Pilot config (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService; let outbox: OutboxProcessor; let pilot: PilotService;
  const http = () => request(app.getHttpServer());
  const suffix = String(Date.now()).slice(-7);
  const workshopPhone = '+966500000001';
  const adminPhone = '+966500000099';
  const customerPhone = `+96655${suffix}`;
  let wsTok: string; let adminTok: string; let orgId: string; let woId: string;
  const login = async (phone: string) => { const r = await http().post('/v1/auth/otp/request').send({ phone }).expect(200); const v = await http().post('/v1/auth/otp/verify').send({ phone, code: r.body.debug_code }).expect(200); return v.body.accessToken as string; };
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication(); app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' }); await app.init(); await app.listen(0, '127.0.0.1');
    prisma = app.get(PrismaService); outbox = app.get(OutboxProcessor); pilot = app.get(PilotService);
    wsTok = await login(workshopPhone); adminTok = await login(adminPhone);
    const me = await http().get('/v1/me').set(auth(wsTok)).expect(200); orgId = me.body.orgs[0].org_id;
  });
  afterAll(async () => { await app.close(); });

  it('a new location is tagged with the industrial zone it falls inside — nobody types the zone name', async () => {
    // Its own organization: adding branches to the shared seeded workshop moves what other suites match
    // against (a Dammam branch once broke PostGIS supplier matching in the parts suite).
    const owner = await login(`+96656${suffix}`);
    const own = await http().post('/v1/organizations').set(auth(owner))
      .send({ type: 'workshop', legal_name_ar: `ورشة مناطق ${suffix}`, cr_number: `2${suffix}09` }).expect(201);
    const ownOrg = own.body.id as string;
    const ownerTok = await login(`+96656${suffix}`);   // the membership is minted into the token

    // A point inside «الصناعية الثانية» in Riyadh.
    const r = await http().post(`/v1/organizations/${ownOrg}/locations`).set(auth(ownerTok))
      .send({ name_ar: `فرع الاختبار ${suffix}`, is_primary: true, city: 'الرياض', lat: 24.5745, lng: 46.8352, service_radius_km: 20 })
      .expect(201);
    const row = await prisma.$queryRaw<Array<{ industrial_zone: string | null }>>`SELECT industrial_zone FROM organization_locations WHERE id = ${r.body.id}::uuid`;
    expect(row[0]!.industrial_zone).toBe('RUH-IND-2');

    // A workshop outside the pilot zones is simply untagged, not rejected.
    const far = await http().post(`/v1/organizations/${ownOrg}/locations`).set(auth(ownerTok))
      .send({ name_ar: `فرع الدمام ${suffix}`, is_primary: false, city: 'الدمام', lat: 26.4207, lng: 50.0888 })
      .expect(201);
    const farRow = await prisma.$queryRaw<Array<{ industrial_zone: string | null }>>`SELECT industrial_zone FROM organization_locations WHERE id = ${far.body.id}::uuid`;
    expect(farRow[0]!.industrial_zone).toBeNull();
  });

  it('/v1/config tells the app exactly what it may show, including a definite "off"', async () => {
    const r = await http().get('/v1/config').set(auth(wsTok)).expect(200);
    expect(r.body.features.parts_marketplace).toBe(true);
    expect(r.body.features.tow).toBe(true);
    expect(r.body.features.voice_to_invoice).toBe(false);   // Step 27, not built — never "undefined"
    expect(r.body.features.ai_inspection).toBe(false);
    expect(Array.isArray(r.body.zones)).toBe(true);
    expect(r.body.zones.some((z: { code: string }) => z.code === 'RUH-IND-2')).toBe(true);
  });

  it('a flag that is off is refused by the API, not merely hidden in the app', async () => {
    const cat = await prisma.partsCatalog.findFirst();
    if (!cat) return;                                            // catalogue seeded by the parts suite
    const r = await http().post('/v1/parts/group-buys').set(auth(wsTok))
      .send({ org_id: orgId, catalog_id: cat.id, unit_price: '250', min_quantity: 10, closes_in_hours: 48, industrial_zone: 'RUH-SULAY' });
    expect(r.status).toBe(403);
    expect(r.body.message_ar).toContain('غير مفعّلة');
  });

  it('ops turns a feature on for one zone, with a written reason recorded in the audit log', async () => {
    await http().put('/v1/admin/pilot/flags/group_buys').set(auth(wsTok))
      .send({ enabled: false, zones: ['RUH-SULAY'], reason_ar: 'محاولة غير مصرّح بها' }).expect(403);

    const noReason = await http().put('/v1/admin/pilot/flags/group_buys').set(auth(adminTok)).send({ enabled: true });
    expect(noReason.status).toBe(400);

    await http().put('/v1/admin/pilot/flags/group_buys').set(auth(adminTok))
      .send({ enabled: false, zones: ['RUH-IND-2', 'RUH-SULAY'], reason_ar: 'كثافة كافية في السلي — تفعيل تجريبي' }).expect(200);

    const audit = await prisma.auditLog.findMany({ where: { action: 'pilot.flag.set' }, orderBy: { id: 'desc' }, take: 1 });
    expect(JSON.stringify(audit[0]!.after)).toContain('السلي');

    const cat = await prisma.partsCatalog.findFirst();
    if (cat) {
      const r = await http().post('/v1/parts/group-buys').set(auth(wsTok))
        .send({ org_id: orgId, catalog_id: cat.id, unit_price: '250', min_quantity: 10, closes_in_hours: 48, industrial_zone: 'RUH-SULAY' });
      expect(r.status).toBe(201);
    }
    // Put it back the way the seed leaves it, so suite order does not matter.
    await http().put('/v1/admin/pilot/flags/group_buys').set(auth(adminTok))
      .send({ enabled: false, zones: ['RUH-IND-2'], reason_ar: 'إعادة الضبط بعد الاختبار' }).expect(200);
  });

  it('real work reaches the funnel, counted once even when the outbox replays', async () => {
    const wo = await http().post('/v1/work-orders').set(auth(wsTok)).send({
      org_id: orgId, customer_phone: customerPhone, vin: `JN1AZ4EH0FM${suffix.slice(0, 6)}`, title_ar: 'تغيير زيت', payment_terms: 'on_delivery',
      items: [{ type: 'labor', description_ar: 'تغيير زيت', quantity: 1, unit_price: '300' }],
    }).expect(201);
    woId = wo.body.id;

    await outbox.drain(100);
    const rows = await prisma.analyticsEvent.findMany({ where: { entityId: woId, event: 'work_order.created' } });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.orgId).toBe(orgId);
    // The zone is denormalised onto the row so a pilot cohort survives later edits to the organization,
    // and it is the *code* — grouping by however someone typed «الصناعية الثانية» does not survive a pilot.
    expect(rows[0]!.industrialZone).toMatch(/^[A-Z]{3}-/);
    // No personal data ever enters the stream.
    const blob = JSON.stringify(rows[0]!.props);
    expect(blob).not.toContain(customerPhone);

    // A replay must not double-count a funnel step.
    await prisma.outbox.updateMany({ where: { aggregateId: woId }, data: { publishedAt: null, lockedUntil: null } });
    await outbox.drain(100);
    expect(await prisma.analyticsEvent.count({ where: { entityId: woId, event: 'work_order.created' } })).toBe(1);
  });

  it('the funnel and the zone breakdown answer ops, and refuse everyone else', async () => {
    const funnel = await http().get('/v1/admin/pilot/funnel').set(auth(adminTok)).expect(200);
    expect(funnel.body.work_orders.created).toBeGreaterThan(0);
    expect(funnel.body.work_orders.approval_rate).toMatch(/^\d+\.\d$/);

    const zones = await http().get('/v1/admin/pilot/by-zone').set(auth(adminTok)).expect(200);
    const ind2 = zones.body.find((z: { zone: string }) => z.zone === 'RUH-IND-2');
    expect(ind2?.name_ar).toContain('الصناعية الثانية');

    const activation = await http().get('/v1/admin/pilot/activation').set(auth(adminTok)).expect(200);
    expect(activation.body.organizations).toBeGreaterThan(0);
    expect(activation.body.activation_rate).toMatch(/^\d+\.\d$/);

    // A workshop sees its own numbers, never the platform's.
    await http().get('/v1/admin/pilot/funnel').set(auth(wsTok)).expect(403);
    const mine = await http().get(`/v1/pilot/funnel?org_id=${orgId}`).set(auth(wsTok)).expect(200);
    expect(mine.body.work_orders.created).toBeGreaterThan(0);
  });

  it('backfill tags locations that predate a zone being added', async () => {
    // Only this suite's own organizations — never the shared seeded workshop.
    await prisma.$executeRaw`UPDATE organization_locations SET industrial_zone = NULL WHERE org_id IN (SELECT id FROM organizations WHERE cr_number = ${`2${suffix}09`})`;
    pilot.invalidate();
    const r = await http().post('/v1/admin/pilot/zones/backfill').set(auth(adminTok)).send({}).expect(200);
    expect(r.body.tagged).toBeGreaterThan(0);
    const tagged = await prisma.$queryRaw<Array<{ n: bigint }>>`SELECT count(*) AS n FROM organization_locations WHERE industrial_zone IS NOT NULL`;
    expect(Number(tagged[0]!.n)).toBeGreaterThan(0);
  });
});
