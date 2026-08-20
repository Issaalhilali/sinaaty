import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { asTx, PrismaService } from '../../../../prisma';
import type { TxHandle } from '../../../../common/ports/unit-of-work.port';
import type { FleetPolicy } from '../../domain/policy';
import type { FleetApproval, FleetRepository, FleetStatement, StatementLine } from '../../domain/repositories';

const d = (v: Prisma.Decimal | null) => (v == null ? null : v.toFixed(2));
const D = (v: string | null) => (v == null ? null : new Prisma.Decimal(v));

type PolicyRow = { id: string; org_id: string; name_ar: string; auto_approve_below: Prisma.Decimal; requires_two_approvers_above: Prisma.Decimal | null; allowed_org_ids: string[] | null; monthly_budget: Prisma.Decimal | null; is_active: boolean };
const toPolicy = (r: PolicyRow): FleetPolicy => ({
  id: r.id, orgId: r.org_id, nameAr: r.name_ar, autoApproveBelow: r.auto_approve_below.toFixed(2),
  requiresTwoApproversAbove: d(r.requires_two_approvers_above), allowedOrgIds: r.allowed_org_ids, monthlyBudget: d(r.monthly_budget), isActive: r.is_active,
});
const POLICY_COLS = Prisma.raw('id, org_id, name_ar, auto_approve_below, requires_two_approvers_above, allowed_org_ids, monthly_budget, is_active');

@Injectable()
export class FleetPrismaRepository implements FleetRepository {
  constructor(private readonly prisma: PrismaService) {}
  private db(tx?: TxHandle) { return tx ? asTx(tx) : this.prisma; }

  // ---- policies
  async listPolicies(orgId: string) {
    const rows = await this.prisma.$queryRaw<PolicyRow[]>`SELECT ${POLICY_COLS} FROM fleet_policies WHERE org_id = ${orgId}::uuid ORDER BY created_at DESC`;
    return rows.map(toPolicy);
  }
  async activePolicy(orgId: string) {
    const rows = await this.prisma.$queryRaw<PolicyRow[]>`SELECT ${POLICY_COLS} FROM fleet_policies WHERE org_id = ${orgId}::uuid AND is_active ORDER BY created_at DESC LIMIT 1`;
    return rows[0] ? toPolicy(rows[0]) : null;
  }
  async findPolicy(id: string) {
    const rows = await this.prisma.$queryRaw<PolicyRow[]>`SELECT ${POLICY_COLS} FROM fleet_policies WHERE id = ${id}::uuid`;
    return rows[0] ? toPolicy(rows[0]) : null;
  }
  async createPolicy(p: Parameters<FleetRepository['createPolicy']>[0], tx?: TxHandle) {
    const rows = await this.db(tx).$queryRaw<PolicyRow[]>`
      INSERT INTO fleet_policies (org_id, name_ar, auto_approve_below, requires_two_approvers_above, allowed_org_ids, monthly_budget)
      VALUES (${p.orgId}::uuid, ${p.nameAr}, ${new Prisma.Decimal(p.autoApproveBelow)}, ${D(p.requiresTwoApproversAbove)},
              ${p.allowedOrgIds ?? null}::uuid[], ${D(p.monthlyBudget)})
      RETURNING ${POLICY_COLS}`;
    return toPolicy(rows[0]!);
  }
  async updatePolicy(id: string, p: Parameters<FleetRepository['updatePolicy']>[1], tx?: TxHandle) {
    await this.db(tx).$executeRaw`
      UPDATE fleet_policies SET
        name_ar = COALESCE(${p.nameAr ?? null}, name_ar),
        auto_approve_below = COALESCE(${p.autoApproveBelow ? new Prisma.Decimal(p.autoApproveBelow) : null}, auto_approve_below),
        requires_two_approvers_above = CASE WHEN ${'requiresTwoApproversAbove' in p} THEN ${D(p.requiresTwoApproversAbove ?? null)} ELSE requires_two_approvers_above END,
        allowed_org_ids = CASE WHEN ${'allowedOrgIds' in p} THEN ${p.allowedOrgIds ?? null}::uuid[] ELSE allowed_org_ids END,
        monthly_budget = CASE WHEN ${'monthlyBudget' in p} THEN ${D(p.monthlyBudget ?? null)} ELSE monthly_budget END,
        is_active = COALESCE(${p.isActive ?? null}, is_active)
      WHERE id = ${id}::uuid`;
  }

  // ---- approvals
  async addApproval(a: Parameters<FleetRepository['addApproval']>[0], tx?: TxHandle) {
    const rows = await this.db(tx).$queryRaw<Array<{ id: string; decided_at: Date }>>`
      INSERT INTO fleet_approvals (org_id, work_order_id, version_id, approver_user_id, decision, note_ar)
      VALUES (${a.orgId}::uuid, ${a.workOrderId}::uuid, ${a.versionId}::uuid, ${a.approverUserId}::uuid, ${a.decision}, ${a.noteAr})
      RETURNING id, decided_at`;
    return { id: rows[0]!.id, orgId: a.orgId, workOrderId: a.workOrderId, versionId: a.versionId, approverUserId: a.approverUserId, approverNameAr: null, decision: a.decision, noteAr: a.noteAr, decidedAt: rows[0]!.decided_at };
  }
  async listApprovals(workOrderId: string, versionId?: string | null): Promise<FleetApproval[]> {
    const rows = await this.prisma.$queryRaw<Array<{ id: string; org_id: string; work_order_id: string; version_id: string | null; approver_user_id: string; name_ar: string | null; decision: string; note_ar: string | null; decided_at: Date }>>`
      SELECT a.id, a.org_id, a.work_order_id, a.version_id, a.approver_user_id, u.full_name_ar AS name_ar, a.decision, a.note_ar, a.decided_at
      FROM fleet_approvals a LEFT JOIN users u ON u.id = a.approver_user_id
      WHERE a.work_order_id = ${workOrderId}::uuid
        AND (${versionId ?? null}::uuid IS NULL OR a.version_id = ${versionId ?? null}::uuid)
      ORDER BY a.decided_at`;
    return rows.map((r) => ({ id: r.id, orgId: r.org_id, workOrderId: r.work_order_id, versionId: r.version_id, approverUserId: r.approver_user_id, approverNameAr: r.name_ar, decision: r.decision as 'approved' | 'rejected', noteAr: r.note_ar, decidedAt: r.decided_at }));
  }
  async pendingWorkOrders(orgId: string, limit: number) {
    const rows = await this.prisma.$queryRaw<Array<{ id: string; number: string; total: Prisma.Decimal; workshop_org_id: string; workshop_name_ar: string | null; version_id: string | null; plate: string | null; asset_code: string | null; requested_at: Date }>>`
      SELECT w.id, w.number, w.total, w.org_id AS workshop_org_id,
             COALESCE(o.trade_name_ar, o.legal_name_ar) AS workshop_name_ar,
             v.id AS version_id, veh.plate_number AS plate, veh.fleet_asset_code AS asset_code, w.updated_at AS requested_at
      FROM work_orders w
      JOIN organizations o ON o.id = w.org_id
      LEFT JOIN vehicles veh ON veh.id = w.vehicle_id
      LEFT JOIN work_order_versions v ON v.work_order_id = w.id AND v.version = w.current_version
      WHERE w.customer_org_id = ${orgId}::uuid AND w.status = 'awaiting_approval'
      ORDER BY w.updated_at DESC LIMIT ${limit}`;
    return rows.map((r) => ({ id: r.id, number: r.number, total: r.total.toFixed(2), workshopOrgId: r.workshop_org_id, workshopNameAr: r.workshop_name_ar, versionId: r.version_id, plate: r.plate, assetCode: r.asset_code, requestedAt: r.requested_at }));
  }

  // ---- spend / statements
  async monthToDateSpend(orgId: string, monthStart: Date) {
    // Approved work, not just paid: a budget is spent the moment the fleet commits to the repair.
    const rows = await this.prisma.$queryRaw<Array<{ total: Prisma.Decimal | null }>>`
      SELECT COALESCE(sum(total), 0) AS total FROM work_orders
      WHERE customer_org_id = ${orgId}::uuid AND approved_at >= ${monthStart} AND status <> 'cancelled'`;
    return (rows[0]?.total ?? new Prisma.Decimal(0)).toFixed(2);
  }
  async statementLines(orgId: string, from: Date, to: Date): Promise<StatementLine[]> {
    const rows = await this.prisma.$queryRaw<Array<{ id: string; number: string; issue_date: Date; wo_number: string | null; plate: string | null; asset_code: string | null; total: Prisma.Decimal; status: string }>>`
      SELECT i.id, i.number, i.issue_date, w.number AS wo_number, veh.plate_number AS plate, veh.fleet_asset_code AS asset_code, i.total, i.status::text AS status
      FROM invoices i
      LEFT JOIN work_orders w ON w.id = i.work_order_id
      LEFT JOIN vehicles veh ON veh.id = w.vehicle_id
      WHERE i.customer_org_id = ${orgId}::uuid AND i.issue_date >= ${from} AND i.issue_date < ${to} AND i.status <> 'void'
      ORDER BY i.issue_date, i.number`;
    return rows.map((r) => ({ invoiceId: r.id, number: r.number, issueDate: r.issue_date, workOrderNumber: r.wo_number, plate: r.plate, assetCode: r.asset_code, total: r.total.toFixed(2), status: r.status }));
  }
  async upsertStatement(s: Parameters<FleetRepository['upsertStatement']>[0], tx?: TxHandle): Promise<FleetStatement> {
    const rows = await this.db(tx).$queryRaw<Array<{ id: string; org_id: string; period_start: Date; period_end: Date; total: Prisma.Decimal; invoice_ids: string[]; status: string; created_at: Date }>>`
      INSERT INTO fleet_statements (org_id, period_start, period_end, total, invoice_ids)
      VALUES (${s.orgId}::uuid, ${s.periodStart}::date, ${s.periodEnd}::date, ${new Prisma.Decimal(s.total)}, ${s.invoiceIds}::uuid[])
      ON CONFLICT (org_id, period_start, period_end) DO UPDATE SET total = EXCLUDED.total, invoice_ids = EXCLUDED.invoice_ids
      RETURNING id, org_id, period_start, period_end, total, invoice_ids, status::text AS status, created_at`;
    const r = rows[0]!;
    return { id: r.id, orgId: r.org_id, periodStart: r.period_start, periodEnd: r.period_end, total: r.total.toFixed(2), invoiceIds: r.invoice_ids, status: r.status, createdAt: r.created_at };
  }
  async listStatements(orgId: string, limit: number) {
    const rows = await this.prisma.$queryRaw<Array<{ id: string; org_id: string; period_start: Date; period_end: Date; total: Prisma.Decimal; invoice_ids: string[]; status: string; created_at: Date }>>`
      SELECT id, org_id, period_start, period_end, total, invoice_ids, status::text AS status, created_at
      FROM fleet_statements WHERE org_id = ${orgId}::uuid ORDER BY period_start DESC LIMIT ${limit}`;
    return rows.map((r) => ({ id: r.id, orgId: r.org_id, periodStart: r.period_start, periodEnd: r.period_end, total: r.total.toFixed(2), invoiceIds: r.invoice_ids, status: r.status, createdAt: r.created_at }));
  }
  async findStatement(id: string) {
    const rows = await this.prisma.$queryRaw<Array<{ id: string; org_id: string; period_start: Date; period_end: Date; total: Prisma.Decimal; invoice_ids: string[]; status: string; created_at: Date }>>`
      SELECT id, org_id, period_start, period_end, total, invoice_ids, status::text AS status, created_at FROM fleet_statements WHERE id = ${id}::uuid`;
    const r = rows[0];
    return r ? { id: r.id, orgId: r.org_id, periodStart: r.period_start, periodEnd: r.period_end, total: r.total.toFixed(2), invoiceIds: r.invoice_ids, status: r.status, createdAt: r.created_at } : null;
  }

  // ---- reports
  async vehicleSpend(orgId: string, from: Date, to: Date) {
    const rows = await this.prisma.$queryRaw<Array<{ vehicle_id: string; plate: string | null; asset_code: string | null; make_ar: string | null; model_ar: string | null; work_orders: bigint; total: Prisma.Decimal | null; last_service_at: Date | null }>>`
      SELECT v.id AS vehicle_id, v.plate_number AS plate, v.fleet_asset_code AS asset_code, mk.name_ar AS make_ar, md.name_ar AS model_ar,
             count(w.*) AS work_orders, COALESCE(sum(w.total), 0) AS total, max(w.delivered_at) AS last_service_at
      FROM vehicles v
      LEFT JOIN vehicle_makes mk ON mk.id = v.make_id
      LEFT JOIN vehicle_models md ON md.id = v.model_id
      LEFT JOIN work_orders w ON w.vehicle_id = v.id AND w.customer_org_id = ${orgId}::uuid
           AND w.created_at >= ${from} AND w.created_at < ${to} AND w.status <> 'cancelled'
      WHERE v.owner_org_id = ${orgId}::uuid
      GROUP BY v.id, v.plate_number, v.fleet_asset_code, mk.name_ar, md.name_ar
      ORDER BY total DESC NULLS LAST`;
    return rows.map((r) => ({ vehicleId: r.vehicle_id, plate: r.plate, assetCode: r.asset_code, makeAr: r.make_ar, modelAr: r.model_ar, workOrders: Number(r.work_orders), total: (r.total ?? new Prisma.Decimal(0)).toFixed(2), lastServiceAt: r.last_service_at }));
  }
  async overview(orgId: string, monthStart: Date) {
    const rows = await this.prisma.$queryRaw<Array<{ vehicles: bigint; open_wo: bigint; awaiting: bigint; month_spend: Prisma.Decimal | null; open_notes: bigint }>>`
      SELECT (SELECT count(*) FROM vehicles WHERE owner_org_id = ${orgId}::uuid) AS vehicles,
             (SELECT count(*) FROM work_orders WHERE customer_org_id = ${orgId}::uuid AND status NOT IN ('closed','cancelled')) AS open_wo,
             (SELECT count(*) FROM work_orders WHERE customer_org_id = ${orgId}::uuid AND status = 'awaiting_approval') AS awaiting,
             (SELECT COALESCE(sum(total), 0) FROM work_orders WHERE customer_org_id = ${orgId}::uuid AND approved_at >= ${monthStart} AND status <> 'cancelled') AS month_spend,
             (SELECT count(*) FROM promissory_notes WHERE debtor_org_id = ${orgId}::uuid AND status IN ('issued','partially_settled','in_enforcement')) AS open_notes`;
    const r = rows[0]!;
    return { vehicles: Number(r.vehicles), openWorkOrders: Number(r.open_wo), awaitingApproval: Number(r.awaiting), monthSpend: (r.month_spend ?? new Prisma.Decimal(0)).toFixed(2), openNotes: Number(r.open_notes) };
  }
}
