import { Test } from '@nestjs/testing';
import { type INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma';
import { OutboxProcessor } from '../src/modules/integrations/outbox/outbox.processor';

/**
 * Step 21 verify: an insured repair end to end —
 * lookup by reference → link to the work order (draft items + Car Passport event) → the customer sees
 * what they actually pay → repair finished → the report is registered back with منجز/تقدير (FR-WO-10).
 */
describe('Accident reports (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService; let outbox: OutboxProcessor;
  const http = () => request(app.getHttpServer());
  const suffix = String(Date.now()).slice(-7);
  const workshopPhone = '+966500000001';          // seeded owner of ورشة النور (active)
  const customerPhone = `+96653${suffix}`;
  const REF = `ACC-2026-${suffix}`;               // priced file
  const PENDING_REF = `ACC-2026-PEND-${suffix}`;  // assessor has not finished
  let wsTok: string; let custTok: string; let orgId: string; let woId: string; let vehicleId: string; let reportId: string;
  const login = async (phone: string) => { const r = await http().post('/v1/auth/otp/request').send({ phone }).expect(200); const v = await http().post('/v1/auth/otp/verify').send({ phone, code: r.body.debug_code }).expect(200); return v.body.accessToken as string; };
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication(); app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' }); await app.init();
    prisma = app.get(PrismaService); outbox = app.get(OutboxProcessor);
    wsTok = await login(workshopPhone); custTok = await login(customerPhone);
    const me = await http().get('/v1/me').set(auth(wsTok)).expect(200); orgId = me.body.orgs[0].org_id;
    const wo = await http().post('/v1/work-orders').set(auth(wsTok)).send({
      org_id: orgId, customer_phone: customerPhone, vin: `1HGCM82633A${suffix.slice(0, 6)}`, plate: `ح ا د ${suffix.slice(0, 4)}`,
      title_ar: 'إصلاح أضرار حادث', payment_terms: 'on_delivery',
      items: [{ type: 'labor', description_ar: 'سمكرة ودهان', quantity: 1, unit_price: '2000' }],
    }).expect(201);
    woId = wo.body.id; vehicleId = wo.body.vehicleId ?? wo.body.vehicle_id;
  });
  afterAll(async () => { await app.close(); });

  it('lookup returns the assessor damages as draft items — nothing is stored yet', async () => {
    const r = await http().post('/v1/accident-reports/lookup').set(auth(wsTok)).send({ ref: REF }).expect(200);
    expect(r.body.provider).toBe('monjez');
    expect(r.body.actionable).toBe(true);
    expect(r.body.damages.length).toBeGreaterThan(0);
    expect(r.body.suggested_items[0].description_ar ?? r.body.suggested_items[0].descriptionAr).toBeDefined();
    expect(Number(r.body.approved_amount)).toBeGreaterThan(0);
    expect(await prisma.accidentReport.count({ where: { externalRef: REF } })).toBe(0);
    // A reference the provider does not know is a plain not-found, not a 500.
    await http().post('/v1/accident-reports/lookup').set(auth(wsTok)).send({ ref: 'not-a-ref' }).expect(404);
  });

  it('linking to the work order marks it an insurance claim and records the accident in the Car Passport', async () => {
    const r = await http().post('/v1/accident-reports').set(auth(wsTok)).send({ ref: REF, work_order_id: woId, org_id: orgId }).expect(201);
    reportId = r.body.id;
    expect(r.body.ref).toBe(REF.toUpperCase());
    expect(r.body.work_order_id).toBe(woId);
    // What the customer actually pays = deductible + their share of the fault, capped at the repair total.
    expect(r.body.customer_estimate.estimated_customer_total).toMatch(/^\d+\.\d{2}$/);

    const wo = await prisma.workOrder.findUniqueOrThrow({ where: { id: woId } });
    expect(wo.source).toBe('accident_claim');
    expect(wo.accidentReportRef).toBe(REF.toUpperCase());

    const events = await prisma.vehicleEvent.findMany({ where: { vehicleId, type: 'accident_report' } });
    expect(events).toHaveLength(1);
    expect(events[0]!.summaryAr).toContain(REF.toUpperCase());
    expect(await prisma.outbox.count({ where: { aggregateId: reportId, eventType: 'AccidentReportLinked' } })).toBe(1);
  });

  it('the customer is told in plain Arabic what the insurer covers and what they pay', async () => {
    await outbox.drain(50);
    const inbox = await http().get('/v1/me/notifications').set(auth(custTok)).expect(200);
    const n = (inbox.body.items ?? inbox.body).find((x: { template_code?: string; templateCode?: string }) => (x.template_code ?? x.templateCode) === 'accident.linked');
    expect(n).toBeDefined();
    const body = n.body_ar ?? n.bodyAr;
    expect(body).toContain(REF.toUpperCase());
    expect(body).toMatch(/المتوقع عليك [\d,.]+ ر\.س/);
    expect(body).not.toMatch(/escrow|snapshot|outbox/i);   // §5.0 rule 5: no jargon on screen
  });

  it('re-linking the same reference updates it instead of creating a second file', async () => {
    await http().post('/v1/accident-reports').set(auth(wsTok)).send({ ref: REF, work_order_id: woId, org_id: orgId }).expect(201);
    expect(await prisma.accidentReport.count({ where: { externalRef: REF.toUpperCase() } })).toBe(1);
  });

  it('the same accident file cannot be pulled into a second repair by mistake', async () => {
    const other = await http().post('/v1/work-orders').set(auth(wsTok)).send({ org_id: orgId, customer_phone: customerPhone, vin: `1HGCM82634A${suffix.slice(0, 6)}`, title_ar: 'أخرى', payment_terms: 'on_delivery', items: [{ type: 'labor', description_ar: 'فحص', quantity: 1, unit_price: '100' }] }).expect(201);
    const r = await http().post('/v1/accident-reports').set(auth(wsTok)).send({ ref: REF, work_order_id: other.body.id, org_id: orgId }).expect(409);
    expect(r.body.code).toBe('CONFLICT');
  });

  it('the customer can read the file behind their own repair; a stranger cannot', async () => {
    const mine = await http().get(`/v1/work-orders/${woId}/accident-report`).set(auth(custTok)).expect(200);
    expect(mine.body.id).toBe(reportId);
    expect(mine.body.insurer_name_ar).toBeTruthy();
    const stranger = await login(`+96654${suffix}`);
    await http().get(`/v1/accident-reports/${reportId}`).set(auth(stranger)).expect(403);
  });

  it('a repair report is refused while the file is unpriced, and before the car is finished', async () => {
    const pending = await http().post('/v1/accident-reports').set(auth(wsTok)).send({ ref: PENDING_REF, org_id: orgId }).expect(201);
    expect(pending.body.status).toBe('under_assessment');
    expect(pending.body.actionable).toBe(false);
    // Not linked to a work order yet → nothing to report.
    const noWo = await http().post(`/v1/accident-reports/${pending.body.id}/submit-repair`).set(auth(wsTok)).send({}).expect(409);
    expect(noWo.body.code).toBe('CONFLICT');
    // Priced file, but the car is still in the workshop.
    const tooEarly = await http().post(`/v1/accident-reports/${reportId}/submit-repair`).set(auth(wsTok)).send({}).expect(409);
    expect(tooEarly.body.message_ar).toContain('أكمل الإصلاح');
  });

  it('once the car is ready the repair is registered back, and a second call is idempotent (FR-WO-10)', async () => {
    // The repair itself is Step 7's flow (approval → execution → ready); this suite only cares that a
    // finished car unlocks the provider submission, so the end state is set directly.
    await prisma.workOrder.update({ where: { id: woId }, data: { status: 'ready', readyAt: new Date() } });

    const r = await http().post(`/v1/accident-reports/${reportId}/submit-repair`).set(auth(wsTok)).send({ note_ar: 'تم الإصلاح حسب تقرير المقيّم' }).expect(200);
    expect(r.body.submission_ref).toMatch(/^RPT-[0-9A-F]{10}$/);
    expect(r.body.repair_submitted_at).toBeTruthy();

    const again = await http().post(`/v1/accident-reports/${reportId}/submit-repair`).set(auth(wsTok)).send({}).expect(200);
    expect(again.body.already_submitted).toBe(true);
    expect(again.body.repair_submission_ref).toBe(r.body.submission_ref);

    expect(await prisma.outbox.count({ where: { aggregateId: reportId, eventType: 'AccidentRepairReported' } })).toBe(1);
    const audit = await prisma.auditLog.findMany({ where: { entityId: reportId }, orderBy: { id: 'asc' } });
    expect(audit.map((a) => a.action)).toEqual(expect.arrayContaining(['accident_report.link', 'accident_report.submit_repair']));
  });

  it('refresh re-reads the provider and reports whether anything moved', async () => {
    const r = await http().post(`/v1/accident-reports/${reportId}/refresh`).set(auth(wsTok)).send({}).expect(200);
    expect(r.body.changed).toBe(false);   // the mock is deterministic, so nothing changed
    expect(r.body.ref).toBe(REF.toUpperCase());
    // A workshop lists only its own files.
    const list = await http().get(`/v1/accident-reports?org_id=${orgId}`).set(auth(wsTok)).expect(200);
    expect(list.body.map((x: { id: string }) => x.id)).toContain(reportId);
    await http().get('/v1/accident-reports').set(auth(custTok)).expect(400);
  });
});
