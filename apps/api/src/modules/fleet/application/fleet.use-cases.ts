import { Inject, Injectable } from '@nestjs/common';
import { AuditLogWriter } from '../../../common/audit';
import { AppError } from '../../../common/errors';
import { OutboxWriter } from '../../../common/outbox';
import { UNIT_OF_WORK, type UnitOfWork } from '../../../common/ports/unit-of-work.port';
import type { AuthUser } from '../../identity/domain/auth-user';
import { isPlatformStaff, membership } from '../../identity/domain/auth-user';
import { ORGANIZATION_REPOSITORY, type OrganizationRepository } from '../../organizations/domain/repositories';
import { VehiclesUseCases } from '../../vehicles/application/use-cases/vehicles.use-cases';
import { WORK_ORDER_REPOSITORY, type WorkOrderRepository } from '../../work-orders/domain/repositories';
import { decide, FLEET_APPROVER_ROLES, FLEET_READ_ROLES, type PolicyDecision } from '../domain/policy';
import { FLEET_REPOSITORY, type FleetRepository } from '../domain/repositories';
import type { DecideDto, ImportVehiclesDto, PolicyDto, StatementDto } from './dto/fleet.dto';

const monthStartOf = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));

/**
 * Fleet Hub — what a fleet manager needs that a single customer does not: rules about who may commit the
 * company's money, one screen of what is waiting for a decision, the whole fleet imported in one go, and
 * a monthly statement they can hand to their accountant.
 *
 * The policy is an *internal control layered on top of* the legal signature, never a replacement: a repair
 * is still signed by a person against the snapshot hash (CLAUDE.md §5.2).
 */
@Injectable()
export class FleetUseCases {
  constructor(
    @Inject(FLEET_REPOSITORY) private readonly repo: FleetRepository,
    @Inject(ORGANIZATION_REPOSITORY) private readonly orgs: OrganizationRepository,
    private readonly vehiclesUseCases: VehiclesUseCases,
    @Inject(WORK_ORDER_REPOSITORY) private readonly workOrders: WorkOrderRepository,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    private readonly audit: AuditLogWriter,
    private readonly outbox: OutboxWriter,
  ) {}

  private mustRead(u: AuthUser, orgId: string) {
    const m = membership(u, orgId);
    if (!m || !FLEET_READ_ROLES.includes(m.role)) { if (!isPlatformStaff(u)) throw new AppError('FORBIDDEN'); }
  }
  private mustApprove(u: AuthUser, orgId: string) {
    const m = membership(u, orgId);
    if (!m || !FLEET_APPROVER_ROLES.includes(m.role)) throw new AppError('FORBIDDEN', { messageAr: 'صلاحية اعتماد مصروفات الأسطول غير متاحة لك.', messageEn: 'You may not approve fleet spending.' });
  }
  private async mustFleet(orgId: string) {
    const org = await this.orgs.findById(orgId);
    if (!org) throw new AppError('NOT_FOUND');
    if (org.type !== 'fleet_company') throw new AppError('VALIDATION', { messageAr: 'هذه المنشأة ليست أسطولاً.', messageEn: 'This organization is not a fleet.' });
    return org;
  }

  // ---- policies ------------------------------------------------------------
  async listPolicies(u: AuthUser, orgId: string) { this.mustRead(u, orgId); return this.repo.listPolicies(orgId); }

  async createPolicy(u: AuthUser, orgId: string, dto: PolicyDto) {
    this.mustApprove(u, orgId); await this.mustFleet(orgId);
    const policy = await this.uow.run(async (tx) => {
      const p = await this.repo.createPolicy({
        orgId, nameAr: dto.name_ar, autoApproveBelow: dto.auto_approve_below ?? '0',
        requiresTwoApproversAbove: dto.requires_two_approvers_above ?? null,
        allowedOrgIds: dto.allowed_org_ids ?? null, monthlyBudget: dto.monthly_budget ?? null,
      }, tx);
      await this.audit.write(tx, { action: 'fleet.policy.create', entityType: 'fleet_policy', entityId: p.id, orgId, actorUserId: u.id, after: { name_ar: p.nameAr, auto_approve_below: p.autoApproveBelow, two_above: p.requiresTwoApproversAbove, budget: p.monthlyBudget } });
      return p;
    });
    return policy;
  }

  async updatePolicy(u: AuthUser, id: string, dto: Partial<PolicyDto> & { is_active?: boolean }) {
    const p = await this.repo.findPolicy(id);
    if (!p) throw new AppError('NOT_FOUND');
    this.mustApprove(u, p.orgId);
    await this.uow.run(async (tx) => {
      await this.repo.updatePolicy(id, {
        ...(dto.name_ar ? { nameAr: dto.name_ar } : {}),
        ...(dto.auto_approve_below ? { autoApproveBelow: dto.auto_approve_below } : {}),
        ...('requires_two_approvers_above' in dto ? { requiresTwoApproversAbove: dto.requires_two_approvers_above ?? null } : {}),
        ...('allowed_org_ids' in dto ? { allowedOrgIds: dto.allowed_org_ids ?? null } : {}),
        ...('monthly_budget' in dto ? { monthlyBudget: dto.monthly_budget ?? null } : {}),
        ...(dto.is_active != null ? { isActive: dto.is_active } : {}),
      }, tx);
      await this.audit.write(tx, { action: 'fleet.policy.update', entityType: 'fleet_policy', entityId: id, orgId: p.orgId, actorUserId: u.id, before: p, after: dto });
    });
    return this.repo.findPolicy(id);
  }

  // ---- approvals -----------------------------------------------------------
  /** What the policy says about one work order, plus who has already decided. */
  async decisionFor(orgId: string, wo: { id: string; total: string; orgId: string; currentVersion: number }): Promise<PolicyDecision & { approvals: number; rejected: boolean }> {
    const [policy, spend, version] = await Promise.all([
      this.repo.activePolicy(orgId),
      this.repo.monthToDateSpend(orgId, monthStartOf(new Date())),
      this.workOrders.getVersion(wo.id, wo.currentVersion),
    ]);
    const d = decide(policy, { total: wo.total, workshopOrgId: wo.orgId, monthToDateSpend: spend });
    const rows = await this.repo.listApprovals(wo.id, version?.id ?? null);
    return { ...d, approvals: rows.filter((r) => r.decision === 'approved').length, rejected: rows.some((r) => r.decision === 'rejected') };
  }

  async pending(u: AuthUser, orgId: string) {
    this.mustRead(u, orgId);
    const rows = await this.repo.pendingWorkOrders(orgId, 100);
    const policy = await this.repo.activePolicy(orgId);
    const spend = await this.repo.monthToDateSpend(orgId, monthStartOf(new Date()));
    return Promise.all(rows.map(async (r) => {
      const d = decide(policy, { total: r.total, workshopOrgId: r.workshopOrgId, monthToDateSpend: spend });
      const approvals = await this.repo.listApprovals(r.id, r.versionId);
      return {
        ...r,
        policy: { outcome: d.outcome, approvals_required: d.approvalsRequired, blocked: d.blocked, reason_ar: d.reasonAr },
        approvals: approvals.map((a) => ({ by: a.approverNameAr, decision: a.decision, note_ar: a.noteAr, at: a.decidedAt })),
        ready_to_sign: !d.blocked && approvals.filter((a) => a.decision === 'approved').length >= d.approvalsRequired,
      };
    }));
  }

  /**
   * One approver's decision. Recorded per *version*: a change order re-opens the decision, exactly as it
   * re-opens the customer signature.
   */
  async decideOn(u: AuthUser, workOrderId: string, dto: DecideDto) {
    const wo = await this.workOrders.findById(workOrderId);
    if (!wo || !wo.customerOrgId) throw new AppError('NOT_FOUND');
    this.mustApprove(u, wo.customerOrgId);
    if (wo.status !== 'awaiting_approval') throw new AppError('CONFLICT', { messageAr: 'أمر العمل ليس بانتظار الاعتماد.', messageEn: 'Not awaiting approval.' });

    const version = await this.workOrders.getVersion(wo.id, wo.currentVersion);
    const existing = await this.repo.listApprovals(wo.id, version?.id ?? null);
    if (existing.some((a) => a.approverUserId === u.id)) throw new AppError('CONFLICT', { messageAr: 'سجّلت قرارك على هذه النسخة مسبقاً.', messageEn: 'You already decided on this version.' });

    const decision = await this.decisionFor(wo.customerOrgId, wo);
    if (dto.decision === 'approved' && decision.blocked) throw new AppError('CONFLICT', { messageAr: decision.reasonAr, messageEn: 'The fleet policy blocks this repair.' });

    const saved = await this.uow.run(async (tx) => {
      const a = await this.repo.addApproval({ orgId: wo.customerOrgId!, workOrderId: wo.id, versionId: version?.id ?? null, approverUserId: u.id, decision: dto.decision, noteAr: dto.note_ar ?? null }, tx);
      await this.audit.write(tx, { action: `fleet.approval.${dto.decision}`, entityType: 'work_order', entityId: wo.id, orgId: wo.customerOrgId, actorUserId: u.id, after: { number: wo.number, total: wo.total, version: wo.currentVersion, note_ar: dto.note_ar ?? null, policy: decision.outcome } });
      await this.outbox.publish(tx, { eventType: dto.decision === 'approved' ? 'FleetApprovalGranted' : 'FleetApprovalRejected', aggregateType: 'work_order', aggregateId: wo.id, payload: { number: wo.number, orgId: wo.customerOrgId, workshopOrgId: wo.orgId, approverUserId: u.id, total: wo.total, version: wo.currentVersion } });
      return a;
    });

    const after = await this.decisionFor(wo.customerOrgId, wo);
    return {
      decision: saved.decision, approvals: after.approvals, approvals_required: after.approvalsRequired,
      ready_to_sign: !after.rejected && after.approvals >= after.approvalsRequired,
      policy_reason_ar: after.reasonAr,
    };
  }

  /**
   * Called by the work-orders module before it accepts a signature on a fleet-owned repair.
   * Throws when the fleet's own rules are not satisfied yet.
   */
  async assertMaySign(orgId: string, wo: { id: string; total: string; orgId: string; currentVersion: number }) {
    const d = await this.decisionFor(orgId, wo);
    if (d.blocked) throw new AppError('CONFLICT', { messageAr: d.reasonAr, messageEn: 'Fleet policy blocks this repair.' });
    if (d.rejected) throw new AppError('CONFLICT', { messageAr: 'رفض أحد المعتمدين هذه النسخة.', messageEn: 'An approver rejected this version.' });
    if (d.approvals < d.approvalsRequired) {
      throw new AppError('CONFLICT', {
        messageAr: `تحتاج ${d.approvalsRequired} اعتماد داخلي قبل التوقيع (المسجَّل ${d.approvals}) — ${d.reasonAr}`,
        messageEn: `${d.approvalsRequired} internal approval(s) required before signing; ${d.approvals} recorded.`,
      });
    }
  }

  // ---- bulk vehicle import -------------------------------------------------
  /**
   * A fleet arrives with a spreadsheet, not with one car. Rows are independent: a bad VIN on row 12 must
   * not lose rows 1–11, so every row reports its own outcome and nothing is rolled back wholesale.
   */
  async importVehicles(u: AuthUser, orgId: string, dto: ImportVehiclesDto) {
    this.mustApprove(u, orgId); await this.mustFleet(orgId);
    const results: Array<{ row: number; status: 'created' | 'exists' | 'failed'; vehicle_id?: string; vin?: string | null; plate?: string | null; error_ar?: string }> = [];

    for (const [i, row] of dto.vehicles.entries()) {
      try {
        if (!row.vin && !row.plate) throw new AppError('VALIDATION', { messageAr: 'كل مركبة تحتاج رقم هيكل أو لوحة.' });
        // Through the vehicles module's own use case: VIN decoding, plate normalisation, ownership rules
        // and the Car Passport entry are its business, not the fleet module's (CLAUDE.md §5.5).
        const v = await this.vehiclesUseCases.add(u, {
          vin: row.vin, plate: row.plate, owner_org_id: orgId,
          model_year: row.year, color_ar: row.color_ar, fleet_asset_code: row.asset_code,
        }) as { id: string; vin: string | null; plateNumber: string | null; already_exists?: boolean };
        results.push({ row: i + 1, status: v.already_exists ? 'exists' : 'created', vehicle_id: v.id, vin: v.vin, plate: v.plateNumber });
      } catch (e) {
        results.push({ row: i + 1, status: 'failed', vin: row.vin ?? null, plate: row.plate ?? null, error_ar: e instanceof AppError ? e.messageAr : 'تعذّر الاستيراد' });
      }
    }

    const created = results.filter((r) => r.status === 'created').length;
    const exists = results.filter((r) => r.status === 'exists').length;
    const failed = results.filter((r) => r.status === 'failed').length;
    await this.uow.run((tx) => this.audit.write(tx, { action: 'fleet.vehicles.import', entityType: 'organization', entityId: orgId, orgId, actorUserId: u.id, after: { submitted: dto.vehicles.length, created, exists, failed } }));
    return { submitted: dto.vehicles.length, created, already_registered: exists, failed, results };
  }

  // ---- statements & reports ------------------------------------------------
  private period(dto: StatementDto) {
    const [y, m] = dto.month.split('-').map(Number);
    if (!y || !m || m < 1 || m > 12) throw new AppError('VALIDATION', { messageAr: 'الشهر بصيغة YYYY-MM.', messageEn: 'month must be YYYY-MM' });
    const from = new Date(Date.UTC(y, m - 1, 1));
    const to = new Date(Date.UTC(y, m, 1));
    return { from, to };
  }

  async generateStatement(u: AuthUser, orgId: string, dto: StatementDto) {
    this.mustRead(u, orgId); await this.mustFleet(orgId);
    const { from, to } = this.period(dto);
    const lines = await this.repo.statementLines(orgId, from, to);
    const total = lines.reduce((a, l) => a + Number(l.total), 0).toFixed(2);
    const statement = await this.uow.run(async (tx) => {
      const s = await this.repo.upsertStatement({ orgId, periodStart: from, periodEnd: new Date(to.getTime() - 86_400_000), total, invoiceIds: lines.map((l) => l.invoiceId) }, tx);
      await this.audit.write(tx, { action: 'fleet.statement.generate', entityType: 'fleet_statement', entityId: s.id, orgId, actorUserId: u.id, after: { month: dto.month, invoices: lines.length, total } });
      return s;
    });
    return { ...statement, lines };
  }

  async listStatements(u: AuthUser, orgId: string) { this.mustRead(u, orgId); return this.repo.listStatements(orgId, 24); }

  async getStatement(u: AuthUser, id: string) {
    const s = await this.repo.findStatement(id);
    if (!s) throw new AppError('NOT_FOUND');
    this.mustRead(u, s.orgId);
    const lines = await this.repo.statementLines(s.orgId, s.periodStart, new Date(s.periodEnd.getTime() + 86_400_000));
    return { ...s, lines };
  }

  async overview(u: AuthUser, orgId: string) {
    this.mustRead(u, orgId);
    const [o, policy] = await Promise.all([this.repo.overview(orgId, monthStartOf(new Date())), this.repo.activePolicy(orgId)]);
    const budget = policy?.monthlyBudget ? Number(policy.monthlyBudget) : null;
    return {
      ...o,
      policy: policy ? { id: policy.id, name_ar: policy.nameAr, auto_approve_below: policy.autoApproveBelow, monthly_budget: policy.monthlyBudget } : null,
      budget_remaining: budget == null ? null : Math.max(0, budget - Number(o.monthSpend)).toFixed(2),
      budget_used_pct: budget == null || budget === 0 ? null : ((Number(o.monthSpend) / budget) * 100).toFixed(1),
    };
  }

  async vehicleReport(u: AuthUser, orgId: string, dto: StatementDto) {
    this.mustRead(u, orgId);
    const { from, to } = this.period(dto);
    return this.repo.vehicleSpend(orgId, from, to);
  }
}
