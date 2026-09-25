import type { DisputeResolution, DisputeStatus } from '@sinaaty/shared-types';
export interface Dispute { id: string; number: string; status: DisputeStatus; openedByUserId: string; claimantOrgId: string | null; respondentOrgId: string | null; respondentUserId: string | null; workOrderId: string | null; partOrderId: string | null; escrowHoldId: string | null; category: string; descriptionAr: string; claimedAmount: string | null; resolution: DisputeResolution | null; resolutionAmountToCustomer: string | null; resolutionNoteAr: string | null; assignedTo: string | null; resolvedBy: string | null; resolvedAt: Date | null; createdAt: Date }
export interface DisputeMessage { id: string; authorUserId: string; authorNameAr: string | null; isInternal: boolean; bodyAr: string; createdAt: Date }
export interface Review { id: string; reviewerUserId: string; targetOrgId: string | null; workOrderId: string | null; partOrderId: string | null; rating: number; dimensions: unknown; commentAr: string | null; isPublic: boolean; createdAt: Date }
/** A dispute's parties: whoever opened it, the named respondent, and members of either side's org.
 *  Shared with the media module — evidence photos belong to the parties, not to whoever guesses an id. */
export const isDisputeParty = (d: Pick<Dispute, 'openedByUserId' | 'respondentUserId' | 'claimantOrgId' | 'respondentOrgId'>, viewer: { id: string; orgs: Array<{ orgId: string }> }): boolean =>
  d.openedByUserId === viewer.id || d.respondentUserId === viewer.id ||
  (!!d.claimantOrgId && viewer.orgs.some((o) => o.orgId === d.claimantOrgId)) ||
  (!!d.respondentOrgId && viewer.orgs.some((o) => o.orgId === d.respondentOrgId));

/** Ops-mediated lifecycle. `escalated` = beyond ops (legal/Najiz); it can still be resolved or closed. */
export const DISPUTE_TRANSITIONS: Record<DisputeStatus, DisputeStatus[]> = { open: ['under_review', 'awaiting_parties', 'resolved', 'escalated', 'closed'], under_review: ['awaiting_parties', 'resolved', 'escalated', 'closed'], awaiting_parties: ['under_review', 'resolved', 'escalated', 'closed'], escalated: ['resolved', 'closed'], resolved: ['closed'], closed: [] };
export const canTransitionDispute = (f: DisputeStatus, t: DisputeStatus) => DISPUTE_TRANSITIONS[f].includes(t);
export const OPEN_STATUSES: DisputeStatus[] = ['open', 'under_review', 'awaiting_parties', 'escalated'];
export const DISPUTE_CATEGORIES = ['scope', 'quality', 'price', 'delay', 'damage', 'part_defect', 'no_show'] as const;
/** Money outcome of a decision: what goes back to the customer vs stays for the provider. `split` needs an explicit amount. */
export function decisionAmounts(resolution: DisputeResolution, holdAmount: string, amountToCustomer: string | null): { toCustomer: string; toProvider: string } {
  const total = Number(holdAmount);
  const cust = resolution === 'refund_customer' ? total : resolution === 'split' ? Number(amountToCustomer ?? 0) : 0;
  if (!Number.isFinite(cust) || cust < 0 || cust > total + 1e-9) throw new RangeError('amount_to_customer out of range');
  return { toCustomer: cust.toFixed(2), toProvider: (total - cust).toFixed(2) };
}
/** A dispute may be opened only while the money/order is still in play. */
export const DISPUTABLE_WO_STATUSES = ['in_progress', 'quality_check', 'ready', 'delivered', 'closed', 'disputed'];
