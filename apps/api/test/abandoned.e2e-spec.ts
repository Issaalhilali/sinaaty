import { Test } from '@nestjs/testing';
import { type INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma';
import { OutboxProcessor } from '../src/modules/integrations/outbox/outbox.processor';

/**
 * Step 29 verify: a car nobody collects. Notices on a schedule, storage that starts after the grace
 * period, a declaration that is refused until the paper trail is complete — and an enforcement case that
 * carries the frozen claim.
 */
describe('Abandoned vehicle (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService; let outbox: OutboxProcessor;
  const http = () => request(app.getHttpServer());
  const suffix = String(Date.now()).slice(-7);
  const workshopPhone = '+966500000001';
  const customerPhone = `+96653${suffix}`;
  let wsTok: string; let custTok: string; let orgId: string; let woId: string;
  const login = async (phone: string) => { const r = await http().post('/v1/auth/otp/request').send({ phone }).expect(200); const v = await http().post('/v1/auth/otp/verify').send({ phone, code: r.body.debug_code }).expect(200); return v.body.accessToken as string; };
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });
  /** Moves the car's "ready" date back, which is the only way to age a work order in a test. */
  const readySince = (days: number) => prisma.workOrder.update({ where: { id: woId }, data: { status: 'ready', readyAt: new Date(Date.now() - days * 86_400_000), approvedAt: new Date(Date.now() - (days + 2) * 86_400_000) } });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication(); app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' }); await app.init(); await app.listen(0, '127.0.0.1');
    prisma = app.get(PrismaService); outbox = app.get(OutboxProcessor);
    wsTok = await login(workshopPhone); custTok = await login(customerPhone);
    const me = await http().get('/v1/me').set(auth(wsTok)).expect(200); orgId = me.body.orgs[0].org_id;
    const wo = await http().post('/v1/work-orders').set(auth(wsTok)).send({
      org_id: orgId, customer_phone: customerPhone, vin: `JH4KA7561PC${suffix.slice(0, 6)}`, title_ar: 'إصلاح ناقل الحركة', payment_terms: 'on_delivery',
      items: [{ type: 'labor', description_ar: 'إصلاح ناقل حركة', quantity: 1, unit_price: '4000' }],
    }).expect(201);
    woId = wo.body.id;
    // The workshop charges 50 SAR a day of storage once the grace period is over.
    await prisma.workOrder.update({ where: { id: woId }, data: { storageFeePerDay: '50' } });
  });
  afterAll(async () => { await app.close(); });

  it('a car that is still being repaired has no notices and no storage', async () => {
    const r = await http().get(`/v1/work-orders/${woId}/abandoned`).set(auth(wsTok)).expect(200);
    expect(r.body.can_declare).toBe(false);
    expect(r.body.reason_ar).toContain('بعد جهوز السيارة');
    expect(r.body.storage.amount).toBe('0.00');
    await http().post(`/v1/work-orders/${woId}/abandoned/notice`).set(auth(wsTok)).send({}).expect(409);
  });

  it('storage stays free during the grace period, then starts counting', async () => {
    await readySince(3);
    const early = await http().get(`/v1/work-orders/${woId}/abandoned`).set(auth(wsTok)).expect(200);
    expect(early.body.storage.chargeable_days).toBe(0);
    expect(early.body.claim.total).toBe(early.body.claim.repair);      // nothing added yet

    await readySince(12);
    const later = await http().get(`/v1/work-orders/${woId}/abandoned`).set(auth(wsTok)).expect(200);
    expect(later.body.storage.chargeable_days).toBe(7);                 // 12 days ready − 5 free
    expect(later.body.storage.amount).toBe('350.00');
    expect(later.body.claim.total).toBe('4950.00');                     // 4600 repair + 350 storage
  });

  it('notices go out in order, once each — a second click sends nothing', async () => {
    const first = await http().post(`/v1/work-orders/${woId}/abandoned/notice`).set(auth(wsTok)).send({}).expect(200);
    expect(first.body.step).toBe(1);
    expect(first.body.formal).toBe(false);
    const second = await http().post(`/v1/work-orders/${woId}/abandoned/notice`).set(auth(wsTok)).send({}).expect(200);
    expect(second.body.step).toBe(2);
    // Step 3 is not due until day 15; the car has been ready 12.
    const early = await http().post(`/v1/work-orders/${woId}/abandoned/notice`).set(auth(wsTok)).send({});
    expect(early.status).toBe(409);
    expect(early.body.message_ar).toContain('لا يوجد إنذار مستحق');

    const wo = await prisma.workOrder.findUniqueOrThrow({ where: { id: woId } });
    expect(wo.abandonedNoticeAt).toBeTruthy();                          // the clock is stamped on the order
  });

  it('the customer is told in plain Arabic, and the formal notice is an SMS', async () => {
    await outbox.drain(100);
    const inbox = await http().get('/v1/me/notifications').set(auth(custTok)).expect(200);
    const items = (inbox.body.items ?? inbox.body) as Array<Record<string, string>>;
    const notice = items.find((n) => (n['template_code'] ?? n['templateCode']) === 'wo.abandoned.notice');
    expect(notice).toBeDefined();
    const body = notice!['body_ar'] ?? notice!['bodyAr']!;
    expect(body).toContain('جاهزة');
    expect(body).toContain('رسوم حفظ');
    expect(body).not.toMatch(/escrow|outbox|metadata/i);                 // §5.0: no jargon on screen
  });

  it('a declaration is refused while the paper trail is incomplete', async () => {
    await readySince(20);                                               // period is over…
    const r = await http().post(`/v1/work-orders/${woId}/abandoned/declare`).set(auth(wsTok)).send({ reason_ar: 'العميل لا يرد' }).expect(409);
    expect(r.body.message_ar).toContain('لم تُرسل كل الإنذارات');       // …but the formal notice was never sent
  });

  it('once the formal notice is sent the car may be declared, and the claim is frozen at that moment', async () => {
    const formal = await http().post(`/v1/work-orders/${woId}/abandoned/notice`).set(auth(wsTok)).send({}).expect(200);
    expect(formal.body.step).toBe(3);
    expect(formal.body.formal).toBe(true);

    const status = await http().get(`/v1/work-orders/${woId}/abandoned`).set(auth(wsTok)).expect(200);
    expect(status.body.can_declare).toBe(true);

    const r = await http().post(`/v1/work-orders/${woId}/abandoned/declare`).set(auth(wsTok)).send({ reason_ar: 'انقطع التواصل مع العميل' }).expect(200);
    expect(r.body.declared).toBe(true);
    expect(r.body.notices).toBe(3);
    expect(Number(r.body.claim.storage)).toBe(750);                     // 20 days − 5 free, at 50/day
    expect(r.body.claim.total).toBe('5350.00');

    const wo = await prisma.workOrder.findUniqueOrThrow({ where: { id: woId } });
    expect(wo.status).toBe('abandoned');
    const history = await prisma.workOrderStatusHistory.findMany({ where: { workOrderId: woId, toStatus: 'abandoned' } });
    expect(history).toHaveLength(1);                                     // it went through the state machine

    // The claim does not keep growing after the declaration: what is claimed is what was declared.
    await readySince(60);
    await prisma.workOrder.update({ where: { id: woId }, data: { status: 'abandoned' } });
    const frozen = await prisma.$queryRaw<Array<{ claim: { total: string } }>>`SELECT (metadata->'abandoned_claim') AS claim FROM work_orders WHERE id = ${woId}::uuid`;
    expect(frozen[0]!.claim.total).toBe('5350.00');
  });

  it('a declared car cannot be declared twice, and only the workshop may drive any of this', async () => {
    await http().post(`/v1/work-orders/${woId}/abandoned/declare`).set(auth(wsTok)).send({}).expect(409);
    await http().post(`/v1/work-orders/${woId}/abandoned/notice`).set(auth(custTok)).send({}).expect(403);
    await http().get(`/v1/work-orders/${woId}/abandoned`).set(auth(custTok)).expect(403);
  });

  it('the audit log carries every notice and the declaration, with the figures', async () => {
    const rows = await prisma.auditLog.findMany({ where: { entityId: woId }, orderBy: { id: 'asc' } });
    const actions = rows.map((r) => r.action);
    expect(actions.filter((a) => a === 'wo.abandoned.notice')).toHaveLength(3);
    expect(actions).toContain('wo.abandoned.declare');
    const declare = rows.find((r) => r.action === 'wo.abandoned.declare')!;
    expect(JSON.stringify(declare.after)).toContain('5350.00');
  });
});
