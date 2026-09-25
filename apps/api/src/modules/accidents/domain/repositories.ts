import type { AccidentReportStatus } from '@sinaaty/shared-types';
import type { TxHandle } from '../../../common/ports/unit-of-work.port';
import type { AccidentReport, Damage } from './accident-report';

export interface AccidentReportUpsert {
  provider: string;
  externalRef: string;
  vehicleId: string | null;
  workOrderId: string | null;
  orgId: string | null;
  status: AccidentReportStatus;
  accidentAt: Date | null;
  locationAr: string | null;
  plateSnapshot: string | null;
  vinSnapshot: string | null;
  faultPercent: string | null;
  insurerNameAr: string | null;
  policyNo: string | null;
  claimNo: string | null;
  deductibleAmount: string | null;
  approvedAmount: string | null;
  damages: Damage[];
  raw: unknown;
  createdBy: string | null;
}

export interface AccidentReportRepository {
  /** Idempotent on (provider, external_ref): re-linking the same report updates it instead of duplicating. */
  upsert(r: AccidentReportUpsert, tx?: TxHandle): Promise<AccidentReport>;
  findById(id: string, tx?: TxHandle): Promise<AccidentReport | null>;
  findByRef(provider: string, externalRef: string, tx?: TxHandle): Promise<AccidentReport | null>;
  findByWorkOrder(workOrderId: string): Promise<AccidentReport | null>;
  list(q: { orgId?: string; vehicleId?: string; status?: AccidentReportStatus[]; limit: number }): Promise<AccidentReport[]>;
  update(id: string, patch: Partial<{ status: AccidentReportStatus; approvedAmount: string | null; deductibleAmount: string | null; faultPercent: string | null; damages: Damage[]; workOrderId: string | null; repairSubmissionRef: string; repairSubmittedAt: Date; raw: unknown }>, tx?: TxHandle): Promise<void>;
}
export const ACCIDENT_REPORT_REPOSITORY = Symbol('ACCIDENT_REPORT_REPOSITORY');
