import type { TxHandle } from '../../../common/ports/unit-of-work.port';
import type { FleetPolicy } from './policy';

export interface FleetApproval {
  id: string;
  orgId: string;
  workOrderId: string | null;
  versionId: string | null;
  approverUserId: string;
  approverNameAr: string | null;
  decision: 'approved' | 'rejected';
  noteAr: string | null;
  decidedAt: Date;
}

export interface StatementLine { invoiceId: string; number: string; issueDate: Date; workOrderNumber: string | null; plate: string | null; assetCode: string | null; total: string; status: string }

export interface FleetStatement {
  id: string;
  orgId: string;
  periodStart: Date;
  periodEnd: Date;
  total: string;
  invoiceIds: string[];
  status: string;
  createdAt: Date;
}

export interface FleetRepository {
  // policies
  listPolicies(orgId: string): Promise<FleetPolicy[]>;
  activePolicy(orgId: string): Promise<FleetPolicy | null>;
  createPolicy(p: { orgId: string; nameAr: string; autoApproveBelow: string; requiresTwoApproversAbove: string | null; allowedOrgIds: string[] | null; monthlyBudget: string | null }, tx?: TxHandle): Promise<FleetPolicy>;
  updatePolicy(id: string, p: Partial<{ nameAr: string; autoApproveBelow: string; requiresTwoApproversAbove: string | null; allowedOrgIds: string[] | null; monthlyBudget: string | null; isActive: boolean }>, tx?: TxHandle): Promise<void>;
  findPolicy(id: string): Promise<FleetPolicy | null>;

  // approvals
  addApproval(a: { orgId: string; workOrderId: string; versionId: string | null; approverUserId: string; decision: 'approved' | 'rejected'; noteAr: string | null }, tx?: TxHandle): Promise<FleetApproval>;
  listApprovals(workOrderId: string, versionId?: string | null): Promise<FleetApproval[]>;
  pendingWorkOrders(orgId: string, limit: number): Promise<Array<{ id: string; number: string; total: string; workshopOrgId: string; workshopNameAr: string | null; versionId: string | null; plate: string | null; assetCode: string | null; requestedAt: Date }>>;

  // spend / statements
  monthToDateSpend(orgId: string, monthStart: Date): Promise<string>;
  statementLines(orgId: string, from: Date, to: Date): Promise<StatementLine[]>;
  upsertStatement(s: { orgId: string; periodStart: Date; periodEnd: Date; total: string; invoiceIds: string[] }, tx?: TxHandle): Promise<FleetStatement>;
  listStatements(orgId: string, limit: number): Promise<FleetStatement[]>;
  findStatement(id: string): Promise<FleetStatement | null>;

  // reports
  vehicleSpend(orgId: string, from: Date, to: Date): Promise<Array<{ vehicleId: string; plate: string | null; assetCode: string | null; makeAr: string | null; modelAr: string | null; workOrders: number; total: string; lastServiceAt: Date | null }>>;
  overview(orgId: string, monthStart: Date): Promise<{ vehicles: number; openWorkOrders: number; awaitingApproval: number; monthSpend: string; openNotes: number }>;
}
export const FLEET_REPOSITORY = Symbol('FLEET_REPOSITORY');
