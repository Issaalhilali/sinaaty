import { Test } from '@nestjs/testing';
import { type INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma';

/**
 * Step 26 verify: a fleet sets its own spending rules, imports its cars in one go, and nothing gets signed
 * against the company's money until the policy is satisfied — then the month arrives as one statement.
 */
describe('Fleet Hub (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  const http = () => request(app.getHttpServer());
  const suffix = String(Date.now()).slice(-7);
  const workshopPhone = '+966500000001';                 // seeded owner of ورشة النور
  const fleetOwnerPhone = `+96650${suffix}`;
  const fleetApproverPhone = `+96651${suffix}`;
  const fleetViewerPhone = `+96652${suffix}`;
  let wsTok: string; let ownerTok: string; let approverTok: string; let viewerTok: string;
  let wsOrg: string; let fleetOrg: string; let policyId: string; let woId: string; let smallWoId: string;
  const login = async (phone: string) => { const r = await http().post('/v1/auth/otp/request').send({ phone }).expect(200); const v = await http().post('/v1/auth/otp/verify').send({ phone, code: r.body.debug_code }).expect(200); return v.body.accessToken as string; };
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });
  const relogin = async (phone: string) => login(phone);   // memberships live in the token; re-login after a role change

  const createWo = async (total: string, title = 'صيانة أسطول') => {
    const r = await http().post('/v1/work-orders').set(auth(wsTok)).send({
      // 17 characters, no I/O/Q — the VIN rules the vehicles module enforces.
      org_id: wsOrg, customer_org_id: fleetOrg, vin: `1FTFW1ET${suffix.slice(0, 4)}${Math.floor(Math.random() * 900 + 100)}FA`,
      title_ar: title, payment_terms: 'fleet_monthly',
      items: [{ type: 'labor', description_ar: title, quantity: 1, unit_price: (Number(total) / 1.15).toFixed(2) }],
    }).expect(201);
    await http().post(`/v1/work-orders/${r.body.id}/transition`).set(auth(wsTok)).send({ to: 'received' }).expect(200);
    await http().post(`/v1/work-orders/${r.body.id}/request-approval`).set(auth(wsTok)).send({}).expect(200);
    return r.body.id as string;
  };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication(); app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' }); await app.init();
    prisma = app.get(PrismaService);
    wsTok = await login(workshopPhone); ownerTok = await login(fleetOwnerPhone);
    const me = await http().get('/v1/me').set(auth(wsTok)).expect(200); wsOrg = me.body.orgs[0].org_id;

    const org = await http().post('/v1/organizations').set(auth(ownerTok))
      .send({ type: 'fleet_company', legal_name_ar: `شركة النقل السريع ${suffix}`, trade_name_ar: 'النقل السريع', cr_number: `1${suffix}07` }).expect(201);   // exactly ten digits
    fleetOrg = org.body.id;
    await prisma.organization.update({ where: { id: fleetOrg }, data: { status: 'active', verifiedAt: new Date() } });
    ownerTok = await relogin(fleetOwnerPhone);   // memberships live in the token; the org did not exist when it was minted

    await http().post(`/v1/organizations/${fleetOrg}/members`).set(auth(ownerTok)).send({ phone: fleetApproverPhone, role: 'fleet_approver', full_name_ar: 'مسؤول الاعتماد' }).expect(201);
    await http().post(`/v1/organizations/${fleetOrg}/members`).set(auth(ownerTok)).send({ phone: fleetViewerPhone, role: 'fleet_viewer', full_name_ar: 'محاسب الأسطول' }).expect(201);
    approverTok = await relogin(fleetApproverPhone); viewerTok = await relogin(fleetViewerPhone); ownerTok = await relogin(fleetOwnerPhone);
  });
  afterAll(async () => { await app.close(); });

  it('the fleet writes its spending rules; a viewer may read them but not write', async () => {
    const r = await http().post(`/v1/fleet/${fleetOrg}/policies`).set(auth(ownerTok)).send({
      name_ar: 'سياسة صيانة 2026', auto_approve_below: '500.00', requires_two_approvers_above: '5000.00',
      allowed_org_ids: [wsOrg], monthly_budget: '50000.00',
    }).expect(201);
    policyId = r.body.id;
    expect(r.body.autoApproveBelow).toBe('500.00');

    await http().post(`/v1/fleet/${fleetOrg}/policies`).set(auth(viewerTok)).send({ name_ar: 'محاولة' }).expect(403);
    const list = await http().get(`/v1/fleet/${fleetOrg}/policies`).set(auth(viewerTok)).expect(200);
    expect(list.body).toHaveLength(1);

    // A workshop that is not this fleet cannot read its rules at all.
    await http().get(`/v1/fleet/${fleetOrg}/policies`).set(auth(wsTok)).expect(403);
  });

  it('the whole fleet is imported in one call, and one bad row does not lose the good ones', async () => {
    const r = await http().post(`/v1/fleet/${fleetOrg}/vehicles/import`).set(auth(ownerTok)).send({
      vehicles: [
        { vin: `JTDKN3DU1A0${suffix.slice(0, 6)}`, asset_code: 'TRK-001', year: 2021 },
        { plate: `ن ق ل ${suffix.slice(0, 4)}`, asset_code: 'TRK-002' },
        { asset_code: 'TRK-003' },                                   // neither VIN nor plate
        { vin: 'NOT-A-VALID-VIN', asset_code: 'TRK-004' },
      ],
    }).expect(200);
    expect(r.body.submitted).toBe(4);
    expect(r.body.created).toBe(2);
    expect(r.body.failed).toBe(2);
    expect(r.body.results[2].error_ar).toContain('رقم هيكل');
    expect(r.body.results.filter((x: { status: string }) => x.status === 'created').map((x: { row: number }) => x.row)).toEqual([1, 2]);

    const owned = await prisma.vehicle.count({ where: { ownerOrgId: fleetOrg } });
    expect(owned).toBe(2);
  });

  it('a small repair passes on the policy alone — nobody is asked', async () => {
    smallWoId = await createWo('300.00', 'تغيير زيت');
    const pending = await http().get(`/v1/fleet/${fleetOrg}/approvals`).set(auth(ownerTok)).expect(200);
    const row = pending.body.find((p: { id: string }) => p.id === smallWoId);
    expect(row.policy.outcome).toBe('auto');
    expect(row.policy.approvals_required).toBe(0);
    expect(row.ready_to_sign).toBe(true);
  });

  it('a large repair cannot be signed until two approvers agree', async () => {
    woId = await createWo('8000.00', 'عمرة محرك');

    const pending = await http().get(`/v1/fleet/${fleetOrg}/approvals`).set(auth(ownerTok)).expect(200);
    const row = pending.body.find((p: { id: string }) => p.id === woId);
    expect(row.policy.outcome).toBe('two_approvers');
    expect(row.ready_to_sign).toBe(false);

    // Signing first is refused — the fleet is not bound by a repair its own rules have not cleared.
    const early = await http().post(`/v1/work-orders/${woId}/approve`).set(auth(ownerTok)).send({ method: 'otp' });
    expect(early.status).toBe(409);
    expect(early.body.message_ar).toContain('اعتماد داخلي');

    const first = await http().post(`/v1/fleet/approvals/${woId}`).set(auth(ownerTok)).send({ decision: 'approved', note_ar: 'ضروري لاستمرار الشاحنة' }).expect(200);
    expect(first.body.approvals).toBe(1);
    expect(first.body.ready_to_sign).toBe(false);

    // The same person cannot be the second approver.
    await http().post(`/v1/fleet/approvals/${woId}`).set(auth(ownerTok)).send({ decision: 'approved' }).expect(409);
    // A viewer is not an approver.
    await http().post(`/v1/fleet/approvals/${woId}`).set(auth(viewerTok)).send({ decision: 'approved' }).expect(403);

    const second = await http().post(`/v1/fleet/approvals/${woId}`).set(auth(approverTok)).send({ decision: 'approved' }).expect(200);
    expect(second.body.approvals).toBe(2);
    expect(second.body.ready_to_sign).toBe(true);

    // Now the signature is accepted (the legal act is still a signature by a person).
    const init = await http().post(`/v1/work-orders/${woId}/approve`).set(auth(ownerTok)).send({ method: 'otp' }).expect(200);
    const done = await http().post(`/v1/work-orders/${woId}/approve/complete`).set(auth(ownerTok)).send({ method: 'otp', code: init.body.debug_code }).expect(200);
    expect(done.body.approved).toBe(true);

    const sig = await prisma.workOrderSignature.findFirst({ where: { workOrderId: woId } });
    expect(sig!.signerRole).toBe('fleet_approver');
  });

  it('a workshop outside the approved list is refused before anyone is asked', async () => {
    await http().put(`/v1/fleet/policies/${policyId}`).set(auth(ownerTok)).send({ allowed_org_ids: ['00000000-0000-0000-0000-000000000000'] }).expect(200);
    const blockedWo = await createWo('600.00', 'كهرباء');
    const pending = await http().get(`/v1/fleet/${fleetOrg}/approvals`).set(auth(ownerTok)).expect(200);
    const row = pending.body.find((p: { id: string }) => p.id === blockedWo);
    expect(row.policy.outcome).toBe('workshop_not_allowed');
    expect(row.policy.blocked).toBe(true);

    const r = await http().post(`/v1/fleet/approvals/${blockedWo}`).set(auth(ownerTok)).send({ decision: 'approved' }).expect(409);
    expect(r.body.message_ar).toContain('خارج قائمة الورش');
    await http().put(`/v1/fleet/policies/${policyId}`).set(auth(ownerTok)).send({ allowed_org_ids: [wsOrg] }).expect(200);
  });

  it('the fleet home shows what is open and how much of the budget is left', async () => {
    const r = await http().get(`/v1/fleet/${fleetOrg}/overview`).set(auth(viewerTok)).expect(200);
    expect(r.body.vehicles).toBeGreaterThanOrEqual(2);   // the imported two, plus any car the workshop registered for this fleet
    expect(r.body.awaitingApproval).toBeGreaterThan(0);
    expect(Number(r.body.monthSpend)).toBeGreaterThan(0);
    expect(r.body.policy.monthly_budget).toBe('50000.00');
    expect(Number(r.body.budget_remaining)).toBeLessThan(50000);
    expect(r.body.budget_used_pct).toMatch(/^\d+\.\d$/);
  });

  it('the month arrives as one statement, with a CSV the accountant can open', async () => {
    // Give the fleet an invoice to be billed for: finish the approved repair and issue it.
    await prisma.workOrder.update({ where: { id: woId }, data: { status: 'ready', readyAt: new Date() } });
    const inv = await http().post('/v1/invoices').set(auth(wsTok)).send({ work_order_id: woId }).expect(201);
    expect(inv.body.number).toMatch(/^INV-/);

    const month = new Date().toISOString().slice(0, 7);
    const s = await http().post(`/v1/fleet/${fleetOrg}/statements`).set(auth(viewerTok)).send({ month }).expect(200);
    expect(s.body.lines.length).toBeGreaterThan(0);
    expect(Number(s.body.total)).toBeGreaterThan(0);
    expect(s.body.lines[0].plate !== undefined).toBe(true);

    // Regenerating the same month updates the statement instead of creating a second one.
    const again = await http().post(`/v1/fleet/${fleetOrg}/statements`).set(auth(viewerTok)).send({ month }).expect(200);
    expect(again.body.id).toBe(s.body.id);
    expect((await http().get(`/v1/fleet/${fleetOrg}/statements`).set(auth(viewerTok)).expect(200)).body).toHaveLength(1);

    const csv = await http().get(`/v1/fleet/statements/${s.body.id}/export.csv`).set(auth(viewerTok)).expect(200);
    expect(csv.headers['content-type']).toContain('text/csv');
    expect(csv.text).toContain('رقم الفاتورة');
    expect(csv.text).toContain(inv.body.number);
    expect(csv.text.startsWith('\uFEFF')).toBe(true);      // Excel opens it as UTF-8

    const report = await http().get(`/v1/fleet/${fleetOrg}/reports/vehicles/export.csv?month=${month}`).set(auth(viewerTok)).expect(200);
    expect(report.text).toContain('رقم الأصل');
    expect(report.text).toContain('TRK-001');
  });

  it('another fleet cannot read this one’s statements or reports', async () => {
    const stranger = await login(`+96653${suffix}`);
    await http().get(`/v1/fleet/${fleetOrg}/statements`).set(auth(stranger)).expect(403);
    await http().get(`/v1/fleet/${fleetOrg}/overview`).set(auth(stranger)).expect(403);
    await http().post(`/v1/fleet/${fleetOrg}/vehicles/import`).set(auth(stranger)).send({ vehicles: [{ vin: 'JTDKN3DU1A0999999' }] }).expect(403);
  });
});
