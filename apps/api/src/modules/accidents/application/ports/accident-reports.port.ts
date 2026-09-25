import type { AccidentReportStatus } from '@sinaaty/shared-types';
import type { Damage } from '../../domain/accident-report';

/** The provider's view of a report. Strings for money/percentages — never floats (CLAUDE.md §5.1). */
export interface ProviderAccidentReport {
  externalRef: string;
  status: AccidentReportStatus;
  accidentAt: string | null;
  locationAr: string | null;
  plate: string | null;
  vin: string | null;
  faultPercent: string | null;
  insurerNameAr: string | null;
  policyNo: string | null;
  claimNo: string | null;
  deductibleAmount: string | null;
  approvedAmount: string | null;
  damages: Damage[];
}

export interface RepairSubmission {
  externalRef: string;
  workOrderNumber: string;
  workshopName: string;
  workshopCrNumber: string | null;
  completedAt: string;
  invoiceNumber: string | null;
  invoiceTotal: string | null;
  itemsSummaryAr: string[];
  photoCount: number;
}

/**
 * منجز / تقدير — accident reports and damage assessment.
 *
 * The real counterparty and its API are NOT confirmed (PRD risk R3): the contract below is our assumption,
 * documented in docs/integrations/monjez.md. Domain code depends on this port only, so switching to the
 * live contract is an adapter change. `fetchByRef` returns null when the provider has no such report —
 * a wrong reference typed by a service advisor is an ordinary case, not an exception.
 */
export interface AccidentReportsPort {
  readonly provider: string;
  fetchByRef(externalRef: string, hint?: { vin?: string | null; plate?: string | null }): Promise<ProviderAccidentReport | null>;
  /** FR-WO-10 — register the completed repair against the accident file. Idempotent per (ref, work order). */
  submitRepairReport(s: RepairSubmission): Promise<{ submissionRef: string; acceptedAt: string }>;
}
export const ACCIDENT_REPORTS_PORT = Symbol('ACCIDENT_REPORTS_PORT');
