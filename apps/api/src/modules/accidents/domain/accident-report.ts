import type { AccidentReportStatus, WoItemType } from '@sinaaty/shared-types';

/** One damaged part as the assessor recorded it. `action` is what the insurer approved for that part. */
export interface Damage {
  partCode: string;
  labelAr: string;
  severity: 'minor' | 'moderate' | 'severe';
  action: 'repair' | 'replace' | 'paint';
}

export interface AccidentReport {
  id: string;
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
  repairSubmissionRef: string | null;
  repairSubmittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A report is only worth acting on once the assessor has priced it. Before that the workshop may read it
 * (to plan) but must not register a repair report against it.
 */
export const ASSESSED_STATUSES: AccidentReportStatus[] = ['assessed', 'approved', 'closed'];
export const isActionable = (s: AccidentReportStatus) => ASSESSED_STATUSES.includes(s);
/** Terminal for our purposes: nothing more will arrive from the provider. */
export const isFinal = (s: AccidentReportStatus) => s === 'closed' || s === 'rejected';

const ACTION_LABEL: Record<Damage['action'], string> = { repair: 'إصلاح', replace: 'استبدال', paint: 'سمكرة ودهان' };
const ACTION_ITEM_TYPE: Record<Damage['action'], WoItemType> = { repair: 'labor', replace: 'part', paint: 'paint' };

export interface SuggestedItem { type: WoItemType; descriptionAr: string; partCode: string; severity: Damage['severity']; quantity: string }

/**
 * Turns the assessor's damage list into draft work-order items so the workshop does not retype it
 * (FR-WO-10 / docs/05-USER-FLOWS.md §1.4). Prices are deliberately absent: the workshop quotes its own
 * labour, and the insurer's approved total is a ceiling, not a price list.
 */
export function suggestItems(damages: Damage[]): SuggestedItem[] {
  return damages.map((d) => ({
    type: ACTION_ITEM_TYPE[d.action],
    descriptionAr: `${ACTION_LABEL[d.action]} — ${d.labelAr}`,
    partCode: d.partCode,
    severity: d.severity,
    quantity: '1',
  }));
}

/**
 * What the customer actually pays out of pocket on an insured repair: the deductible plus their share of
 * the fault, capped so it never exceeds the repair total. Returned as a hint for the estimate screen —
 * the invoice itself is still built from the signed work-order snapshot.
 */
export function customerShare(total: string, deductible: string | null, faultPercent: string | null): { deductible: string; fault_share: string; estimated_customer_total: string } {
  const t = Math.max(0, Math.round(Number(total) * 100) / 100);
  const d = Math.min(t, Math.max(0, Number(deductible ?? 0)));
  const pct = Math.min(100, Math.max(0, Number(faultPercent ?? 0)));
  const faultShare = Math.round((t - d) * (pct / 100) * 100) / 100;
  const customer = Math.min(t, Math.round((d + faultShare) * 100) / 100);
  return { deductible: d.toFixed(2), fault_share: faultShare.toFixed(2), estimated_customer_total: customer.toFixed(2) };
}
