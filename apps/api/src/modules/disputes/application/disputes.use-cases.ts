import { Inject, Injectable } from '@nestjs/common';
import type { DisputeStatus } from '@sinaaty/shared-types';
import { AppError } from '../../../common/errors';
import { AuditLogWriter } from '../../../common/audit';
import { OutboxWriter } from '../../../common/outbox';
import { Money } from '../../../common/domain/money';
import { UNIT_OF_WORK, type UnitOfWork } from '../../../common/ports/unit-of-work.port';
import type { AuthUser } from '../../identity/domain/auth-user';
import { isPlatformStaff, membership } from '../../identity/domain/auth-user';
import { EscrowService } from '../../payments/application/escrow.service';
import { EscrowUseCases } from '../../payments/application/use-cases/escrow.use-cases';
import { newId } from '../../../common/domain/ids';
import { ESCROW_REPOSITORY, type EscrowRepository } from '../../payments/domain/repositories';
import { WORK_ORDER_REPOSITORY, type WorkOrderRepository } from '../../work-orders/domain/repositories';
import { WoTransitionService } from '../../work-orders/application/wo-transition.service';
import { canTransition } from '../../work-orders/domain/state-machine';
import { PARTS_REPOSITORY, type PartsRepository } from '../../parts/domain/repositories';
import { type Dispute, canTransitionDispute, decisionAmounts, DISPUTABLE_WO_STATUSES, isDisputeParty, OPEN_STATUSES } from '../domain/dispute';
import { DISPUTE_REPOSITORY, type DisputeRepository } from '../domain/repositories';
import type { AssignDto, MessageDto, OpenDisputeDto, ResolveDto, ReviewDto, StatusDto } from './dto/disputes.dto';

/**
 * Disputes: a party opens one against a work order or part order → the related escrow hold is frozen in the same
 * transaction → both sides + ops exchange messages/evidence → ops decides → the money moves through the ledger
 * (release / refund / split) and the escrow hold reaches a terminal state. Every step writes audit + outbox.
 */
@Injectable()
export class DisputesUseCases {
  constructor(
    @Inject(DISPUTE_REPOSITORY) private readonly repo: DisputeRepository, @Inject(ESCROW_REPOSITORY) private readonly holds: EscrowRepository,
    @Inject(WORK_ORDER_REPOSITORY) private readonly workOrders: WorkOrderRepository, @Inject(PARTS_REPOSITORY) private readonly parts: PartsRepository,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork, private readonly escrow: EscrowService, private readonly escrowUseCases: EscrowUseCases, private readonly woTransitions: WoTransitionService, private readonly audit: AuditLogWriter, private readonly outbox: OutboxWriter,
  ) {}
  private isParty(d: Dispute, u: AuthUser) { return isDisputeParty(d, u); }
  private mustRead(d: Dispute, u: AuthUser) { if (!this.isParty(d, u) && !isPlatformStaff(u)) throw new AppError('FORBIDDEN'); }
  private staff(u: AuthUser) { if (!isPlatformStaff(u)) throw new AppError('FORBIDDEN'); }

  /** Open: figures out the two sides + the escrow hold from the underlying order, then freezes the money. */
  async open(u: AuthUser, dto: OpenDisputeDto) {
    let claimantOrgId: string | null = null; let respondentOrgId: string | null = null; let respondentUserId: string | null = null; let holdId: string | null = null; let ref = '';
    let wo: Awaited<ReturnType<WorkOrderRepository['findById']>> = null;
    if (dto.work_order_id) {
      wo = await this.workOrders.findById(dto.work_order_id); if (!wo) throw new AppError('NOT_FOUND');
      const isCustomer = wo.customerUserId === u.id || (!!wo.customerOrgId && !!membership(u, wo.customerOrgId)); const isProvider = !!membership(u, wo.orgId);
      if (!isCustomer && !isProvider && !isPlatformStaff(u)) throw new AppError('FORBIDDEN');
      if (!DISPUTABLE_WO_STATUSES.includes(wo.status)) throw new AppError('CONFLICT', { messageAr: 'لا يمكن فتح نزاع على أمر في هذه الحالة.', messageEn: `Cannot dispute a work order in status ${wo.status}.` });
      if (await this.repo.findOpenByWorkOrder(wo.id)) throw new AppError('CONFLICT', { messageAr: 'يوجد نزاع مفتوح على هذا الأمر.', messageEn: 'An open dispute already exists.' });
      claimantOrgId = isCustomer ? (wo.customerOrgId ?? null) : wo.orgId; respondentOrgId = isCustomer ? wo.orgId : (wo.customerOrgId ?? null); respondentUserId = isCustomer ? null : (wo.customerUserId ?? null);
      holdId = (await this.holds.listByWorkOrder(wo.id)).find((h) => h.status === 'held')?.id ?? null; ref = wo.number;
    } else {
      const o = await this.parts.findOrder(dto.part_order_id!); if (!o) throw new AppError('NOT_FOUND');
      const isBuyer = o.buyerUserId === u.id || (!!o.buyerOrgId && !!membership(u, o.buyerOrgId)); const isSupplier = !!membership(u, o.supplierOrgId);
      if (!isBuyer && !isSupplier && !isPlatformStaff(u)) throw new AppError('FORBIDDEN');
      if (await this.repo.findOpenByPartOrder(o.id)) throw new AppError('CONFLICT', { messageAr: 'يوجد نزاع مفتوح على هذا الطلب.', messageEn: 'An open dispute already exists.' });
      claimantOrgId = isBuyer ? (o.buyerOrgId ?? null) : o.supplierOrgId; respondentOrgId = isBuyer ? o.supplierOrgId : (o.buyerOrgId ?? null); respondentUserId = isBuyer ? null : (o.buyerUserId ?? null);
      holdId = (await this.holds.listByPartOrder(o.id)).find((h) => h.status === 'held')?.id ?? null; ref = o.number;
    }
    const dispute = await this.uow.run(async (tx) => {
      const number = await this.repo.nextNumber(tx);
      const d = await this.repo.create({ number, openedByUserId: u.id, claimantOrgId, respondentOrgId, respondentUserId, workOrderId: dto.work_order_id ?? null, partOrderId: dto.part_order_id ?? null, escrowHoldId: holdId, category: dto.category, descriptionAr: dto.description_ar, claimedAmount: dto.claimed_amount ?? null }, tx);
      if (dto.media_ids.length) await this.repo.attachMedia(d.id, dto.media_ids, 'evidence', tx);
      if (holdId) await this.escrow.freeze(tx, holdId, d.id, u.id);          // the money stops moving the moment a dispute exists
      // The work order itself moves to `disputed` through its own transition service (history + audit + outbox + realtime).
      if (wo && canTransition(wo.status, 'disputed')) await this.woTransitions.apply(tx, wo, 'disputed', { userId: u.id }, `نزاع ${number}: ${dto.category}`, { disputeId: d.id });
      await this.audit.write(tx, { action: 'dispute.open', entityType: 'dispute', entityId: d.id, orgId: respondentOrgId, actorUserId: u.id, after: { number, category: dto.category, ref, escrow_frozen: !!holdId, claimed: dto.claimed_amount ?? null } });
      await this.outbox.publish(tx, { eventType: 'DisputeOpened', aggregateType: 'dispute', aggregateId: d.id, payload: { number, category: dto.category, claimantOrgId, respondentOrgId, respondentUserId, openedByUserId: u.id, workOrderId: d.workOrderId, partOrderId: d.partOrderId, escrowHoldId: holdId } });
      return d;
    });
    return { ...dispute, escrow_frozen: !!holdId };
  }
  async get(u: AuthUser, id: string) { const d = await this.repo.findById(id); if (!d) throw new AppError('NOT_FOUND'); this.mustRead(d, u); const staff = isPlatformStaff(u); const hold = d.escrowHoldId ? await this.holds.findById(d.escrowHoldId) : null; return { ...d, messages: await this.repo.listMessages(id, staff), media: await this.repo.listMedia(id), escrow: hold ? { id: hold.id, status: hold.status, amount: hold.amount, released: hold.releasedAmount, refunded: hold.refundedAmount } : null }; }
  async list(u: AuthUser, q: { status?: DisputeStatus[]; org_id?: string; mine?: boolean; limit?: number }) {
    if (q.org_id) { if (!membership(u, q.org_id) && !isPlatformStaff(u)) throw new AppError('FORBIDDEN'); return this.repo.list({ orgId: q.org_id, status: q.status, limit: q.limit ?? 50 }); }
    if (isPlatformStaff(u) && !q.mine) return this.repo.list({ status: q.status, limit: q.limit ?? 50 });
    return this.repo.list({ openedByUserId: u.id, status: q.status, limit: q.limit ?? 50 });
  }
  /** Parties and ops post messages; `is_internal` notes are ops-only and never shown to parties. */
  async message(u: AuthUser, id: string, dto: MessageDto) {
    const d = await this.repo.findById(id); if (!d) throw new AppError('NOT_FOUND'); this.mustRead(d, u);
    if (dto.is_internal && !isPlatformStaff(u)) throw new AppError('FORBIDDEN');
    if (!OPEN_STATUSES.includes(d.status) && !isPlatformStaff(u)) throw new AppError('CONFLICT', { messageAr: 'النزاع مغلق.', messageEn: 'Dispute is closed.' });
    return this.uow.run(async (tx) => {
      const m = await this.repo.addMessage({ disputeId: id, authorUserId: u.id, isInternal: dto.is_internal, bodyAr: dto.body_ar }, tx);
      if (dto.media_ids.length) await this.repo.attachMedia(id, dto.media_ids, 'evidence', tx);
      if (!dto.is_internal) await this.outbox.publish(tx, { eventType: 'DisputeMessagePosted', aggregateType: 'dispute', aggregateId: id, payload: { number: d.number, authorUserId: u.id, claimantOrgId: d.claimantOrgId, respondentOrgId: d.respondentOrgId, respondentUserId: d.respondentUserId, openedByUserId: d.openedByUserId } });
      return m;
    });
  }
  async assign(u: AuthUser, id: string, dto: AssignDto) { this.staff(u); const d = await this.repo.findById(id); if (!d) throw new AppError('NOT_FOUND'); await this.uow.run(async (tx) => { await this.repo.update(id, { assignedTo: dto.assigned_to, ...(d.status === 'open' ? { status: 'under_review' } : {}) }, tx); await this.audit.write(tx, { action: 'dispute.assign', entityType: 'dispute', entityId: id, actorUserId: u.id, actorType: 'admin', after: { assigned_to: dto.assigned_to, reason: dto.reason_ar } }); }); return this.repo.findById(id); }
  async setStatus(u: AuthUser, id: string, dto: StatusDto) {
    this.staff(u); const d = await this.repo.findById(id); if (!d) throw new AppError('NOT_FOUND');
    if (!canTransitionDispute(d.status, dto.status)) throw new AppError('CONFLICT', { messageAr: `لا يمكن نقل النزاع من ${d.status} إلى ${dto.status}.`, messageEn: `Illegal dispute transition ${d.status} → ${dto.status}.` });
    if (dto.status === 'closed' && OPEN_STATUSES.includes(d.status) && d.escrowHoldId) { const h = await this.holds.findById(d.escrowHoldId); if (h?.status === 'frozen') throw new AppError('CONFLICT', { messageAr: 'أصدر قراراً أولاً — المبلغ ما زال مجمّداً.', messageEn: 'Resolve first — escrow is still frozen.' }); }
    await this.uow.run(async (tx) => { await this.repo.update(id, { status: dto.status }, tx); await this.audit.write(tx, { action: `dispute.${dto.status}`, entityType: 'dispute', entityId: id, actorUserId: u.id, actorType: 'admin', before: { status: d.status }, after: { status: dto.status, reason: dto.reason_ar } }); await this.outbox.publish(tx, { eventType: 'DisputeStatusChanged', aggregateType: 'dispute', aggregateId: id, payload: { number: d.number, from: d.status, to: dto.status, claimantOrgId: d.claimantOrgId, respondentOrgId: d.respondentOrgId, respondentUserId: d.respondentUserId, openedByUserId: d.openedByUserId } }); });
    return this.repo.findById(id);
  }
  /**
   * Ops decision. The money follows the decision in the same transaction:
   *  release_to_provider → full release · refund_customer → full refund · split → partial refund then release the rest
   *  replace_part / no_action → escrow stays frozen until a follow-up decision (documented, not silently released).
   */
  async resolve(u: AuthUser, id: string, dto: ResolveDto) {
    this.staff(u); const d = await this.repo.findById(id); if (!d) throw new AppError('NOT_FOUND');
    if (!canTransitionDispute(d.status, 'resolved')) throw new AppError('CONFLICT', { messageAr: 'النزاع محسوم مسبقاً.', messageEn: `Cannot resolve from ${d.status}.` });
    const hold = d.escrowHoldId ? await this.holds.findById(d.escrowHoldId) : null;
    const movesMoney = ['release_to_provider', 'refund_customer', 'split'].includes(dto.resolution);
    if (movesMoney && !hold) throw new AppError('CONFLICT', { messageAr: 'لا يوجد مبلغ محفوظ لهذا النزاع — اختر قراراً بلا حركة مالية.', messageEn: 'No escrow hold on this dispute.' });
    if (dto.resolution === 'split' && !dto.amount_to_customer) throw new AppError('VALIDATION', { messageAr: 'حدّد مبلغ العميل في التسوية.', messageEn: 'amount_to_customer is required for a split.' });
    let amounts = { toCustomer: '0.00', toProvider: '0.00' };
    if (hold) { try { amounts = decisionAmounts(dto.resolution, hold.amount, dto.amount_to_customer ?? null); } catch { throw new AppError('VALIDATION', { messageAr: `مبلغ العميل يجب أن يكون بين 0 و${hold.amount}.`, messageEn: 'amount_to_customer must be between 0 and the held amount.', details: { held: hold.amount, amount_to_customer: dto.amount_to_customer ?? null } }); } }
    const refundId = newId();
    await this.uow.run(async (tx) => {
      if (hold && movesMoney) {
        if (Money.of(amounts.toCustomer).gt(Money.ZERO)) await this.escrow.refund(tx, hold.id, refundId, amounts.toCustomer, u.id, `قرار نزاع ${d.number}: ${dto.note_ar}`);
        if (Money.of(amounts.toProvider).gt(Money.ZERO)) await this.escrow.release(tx, hold.id, 'dispute_decision', u.id);
      }
      await this.repo.update(id, { status: 'resolved', resolution: dto.resolution, resolutionAmountToCustomer: hold ? amounts.toCustomer : null, resolutionNoteAr: dto.note_ar, resolvedBy: u.id, resolvedAt: new Date() }, tx);
      await this.audit.write(tx, { action: 'dispute.resolve', entityType: 'dispute', entityId: id, orgId: d.respondentOrgId, actorUserId: u.id, actorType: 'admin', before: { status: d.status }, after: { resolution: dto.resolution, to_customer: amounts.toCustomer, to_provider: amounts.toProvider, note: dto.note_ar } });
      await this.outbox.publish(tx, { eventType: 'DisputeResolved', aggregateType: 'dispute', aggregateId: id, payload: { number: d.number, resolution: dto.resolution, toCustomer: amounts.toCustomer, toProvider: amounts.toProvider, claimantOrgId: d.claimantOrgId, respondentOrgId: d.respondentOrgId, respondentUserId: d.respondentUserId, openedByUserId: d.openedByUserId, workOrderId: d.workOrderId, partOrderId: d.partOrderId } });
    });
    // Ledger + dispute state are committed; now move the money back at the provider (mock PSP in dev).
    if (hold && Money.of(amounts.toCustomer).gt(Money.ZERO)) await this.escrowUseCases.settleRefundWithPsp(hold.id, refundId, amounts.toCustomer, `قرار نزاع ${d.number}`);
    return this.get(u, id);
  }
  /** Review after the order is done (or the dispute closed). One review per reviewer per order; org rating recomputed. */
  myReview(u: AuthUser, q: { work_order_id?: string; part_order_id?: string }) {
    return this.repo.findMyReview(u.id, { workOrderId: q.work_order_id, partOrderId: q.part_order_id });
  }

  async review(u: AuthUser, dto: ReviewDto) {
    let targetOrgId: string | null = null; let reviewerOrgId: string | null = null;
    if (dto.work_order_id) { const wo = await this.workOrders.findById(dto.work_order_id); if (!wo) throw new AppError('NOT_FOUND'); const isCustomer = wo.customerUserId === u.id || (!!wo.customerOrgId && !!membership(u, wo.customerOrgId)); if (!isCustomer) throw new AppError('FORBIDDEN', { messageAr: 'التقييم للعميل بعد الاستلام.', messageEn: 'Only the customer can review.' }); if (!['delivered', 'closed', 'disputed'].includes(wo.status)) throw new AppError('CONFLICT', { messageAr: 'التقييم بعد تسليم السيارة.', messageEn: 'Review after delivery.' }); targetOrgId = wo.orgId; reviewerOrgId = wo.customerOrgId ?? null; }
    else { const o = await this.parts.findOrder(dto.part_order_id!); if (!o) throw new AppError('NOT_FOUND'); const isBuyer = o.buyerUserId === u.id || (!!o.buyerOrgId && !!membership(u, o.buyerOrgId)); if (!isBuyer) throw new AppError('FORBIDDEN'); if (!['delivered', 'installed', 'confirmed'].includes(o.status)) throw new AppError('CONFLICT', { messageAr: 'التقييم بعد استلام القطعة.', messageEn: 'Review after delivery.' }); targetOrgId = o.supplierOrgId; reviewerOrgId = o.buyerOrgId ?? null; }
    return this.uow.run(async (tx) => {
      const r = await this.repo.createReview({ reviewerUserId: u.id, reviewerOrgId, targetOrgId, targetUserId: null, workOrderId: dto.work_order_id ?? null, partOrderId: dto.part_order_id ?? null, rating: dto.rating, dimensions: dto.dimensions, commentAr: dto.comment_ar ?? null }, tx);
      const rating = await this.repo.refreshOrgRating(targetOrgId, tx);
      await this.outbox.publish(tx, { eventType: 'ReviewPosted', aggregateType: 'review', aggregateId: r.id, payload: { targetOrgId, rating: dto.rating, workOrderId: dto.work_order_id ?? null, partOrderId: dto.part_order_id ?? null } });
      return { ...r, org_rating: rating };
    });
  }
  reviews(q: { org_id: string; limit?: number }) { return this.repo.listReviews({ targetOrgId: q.org_id, limit: q.limit ?? 50 }); }
}
