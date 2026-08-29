import type { DisputeResolution, DisputeStatus } from '@sinaaty/shared-types';
import type { TxHandle } from '../../../common/ports/unit-of-work.port';
import type { Dispute, DisputeMessage, Review } from './dispute';
export interface DisputeRepository {
  nextNumber(tx?: TxHandle): Promise<string>;
  create(d: { number: string; openedByUserId: string; claimantOrgId: string | null; respondentOrgId: string | null; respondentUserId: string | null; workOrderId: string | null; partOrderId: string | null; escrowHoldId: string | null; category: string; descriptionAr: string; claimedAmount: string | null }, tx?: TxHandle): Promise<Dispute>;
  findById(id: string, tx?: TxHandle): Promise<Dispute | null>;
  findOpenByWorkOrder(workOrderId: string): Promise<Dispute | null>;
  findOpenByPartOrder(partOrderId: string): Promise<Dispute | null>;
  list(q: { status?: DisputeStatus[]; openedByUserId?: string; orgId?: string; assignedTo?: string; limit: number }): Promise<Dispute[]>;
  update(id: string, p: { status?: DisputeStatus; assignedTo?: string | null; resolution?: DisputeResolution; resolutionAmountToCustomer?: string | null; resolutionNoteAr?: string; resolvedBy?: string; resolvedAt?: Date }, tx?: TxHandle): Promise<void>;
  addMessage(m: { disputeId: string; authorUserId: string; isInternal: boolean; bodyAr: string }, tx?: TxHandle): Promise<DisputeMessage>;
  listMessages(disputeId: string, includeInternal: boolean): Promise<DisputeMessage[]>;
  attachMedia(disputeId: string, mediaIds: string[], label: string, tx?: TxHandle): Promise<number>;
  listMedia(disputeId: string): Promise<Array<{ mediaId: string; label: string | null; mimeType: string }>>;
  // reviews
  /** تقييمي أنا على أمرٍ بعينه — به تعرف الشاشة أتعرض النجوم أم «شكراً لك». */
  findMyReview(reviewerUserId: string, q: { workOrderId?: string; partOrderId?: string }): Promise<Review | null>;
  createReview(r: { reviewerUserId: string; reviewerOrgId: string | null; targetOrgId: string | null; targetUserId: string | null; workOrderId: string | null; partOrderId: string | null; rating: number; dimensions: unknown; commentAr: string | null }, tx?: TxHandle): Promise<Review>;
  listReviews(q: { targetOrgId?: string; reviewerUserId?: string; limit: number }): Promise<Review[]>;
  /** Recompute org rating from public reviews (cached on organizations.rating_avg/count). */
  refreshOrgRating(orgId: string, tx?: TxHandle): Promise<{ avg: string; count: number }>;
}
export const DISPUTE_REPOSITORY = Symbol('DISPUTE_REPOSITORY');
