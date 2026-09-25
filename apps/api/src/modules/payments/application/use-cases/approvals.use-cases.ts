import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '../../../../common/errors';
import { AuditLogWriter } from '../../../../common/audit';
import { OutboxWriter } from '../../../../common/outbox';
import { Money } from '../../../../common/domain/money';
import { newId } from '../../../../common/domain/ids';
import { UNIT_OF_WORK, type UnitOfWork } from '../../../../common/ports/unit-of-work.port';
import type { AuthUser } from '../../../identity/domain/auth-user';
import { isPlatformStaff } from '../../../identity/domain/auth-user';
import { APPROVAL_REPOSITORY, ESCROW_REPOSITORY, PAYMENT_REPOSITORY, type AdminApproval, type ApprovalRepository, type EscrowRepository, type PaymentRepository } from '../../domain/repositories';
import { EscrowService } from '../escrow.service';
import { PSP_PORT, type PspPort } from '../ports/psp.port';
import type { RefundDto, DecisionDto } from '../dto/payments.dto';

const REFUND_ACTION = 'escrow.refund';

/**
 * Maker/checker on escrow refunds (docs/design/maker-checker-refunds.md, arbitrated 2026-08-21).
 * The requester never approves their own request — the database CHECK re-verifies that — but they may
 * withdraw it. Money moves only inside the approval transaction, and the payload is REVALIDATED at
 * that moment: an approval granted days after the request must not execute against a hold the world
 * has since changed.
 */
@Injectable()
export class ApprovalsUseCases {
  constructor(
    @Inject(APPROVAL_REPOSITORY) private readonly approvals: ApprovalRepository,
    @Inject(ESCROW_REPOSITORY) private readonly holds: EscrowRepository,
    @Inject(PAYMENT_REPOSITORY) private readonly payments: PaymentRepository,
    @Inject(PSP_PORT) private readonly psp: PspPort,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    private readonly escrow: EscrowService, private readonly audit: AuditLogWriter, private readonly outbox: OutboxWriter,
  ) {}

  private staff(u: AuthUser) { if (!isPlatformStaff(u)) throw new AppError('FORBIDDEN'); }
  /** The hold must still be refundable for this amount — checked at request AND again at approval. */
  private assertRefundable(hold: { status: string; amount: string; refundedAmount: string }, amount: string) {
    if (!['held', 'frozen'].includes(hold.status)) throw new AppError('ESCROW_NOT_RELEASABLE', { messageAr: 'المبلغ لم يعد قابلاً للاسترداد — تغيّرت حالته منذ الطلب.', messageEn: 'The hold is no longer refundable — its state changed since the request.', details: { status: hold.status } });
    const remaining = Money.of(hold.amount).minus(Money.of(hold.refundedAmount));
    const amt = Money.of(amount);
    if (amt.isZero() || amt.isNegative() || amt.gt(remaining)) throw new AppError('VALIDATION', { messageAr: 'مبلغ الاسترداد غير صالح أو يتجاوز المتبقي.', messageEn: 'Refund amount invalid or exceeds the remaining balance.', details: { remaining: remaining.toString() } });
  }

  /** Step 1 — the maker: nothing moves; a request is recorded and the second pair of eyes is summoned. */
  async requestRefund(u: AuthUser, holdId: string, dto: RefundDto) {
    this.staff(u);
    const hold = await this.holds.findById(holdId); if (!hold) throw new AppError('NOT_FOUND');
    const amount = dto.amount ?? hold.amount;
    this.assertRefundable(hold, amount);
    const expiresAt = new Date(Date.now() + (await this.approvals.expiryHours()) * 3_600_000);
    try {
      const a = await this.uow.run(async (tx) => {
        const created = await this.approvals.create({ action: REFUND_ACTION, entityType: 'escrow_hold', entityId: holdId, payload: { amount, reason_ar: dto.reason_ar }, requestedBy: u.id, expiresAt }, tx);
        await this.audit.write(tx, { action: 'approval.request', entityType: 'admin_approval', entityId: created.id, orgId: hold.beneficiaryOrgId, actorUserId: u.id, after: { action: REFUND_ACTION, hold: holdId, amount, reason: dto.reason_ar } });
        await this.outbox.publish(tx, { eventType: 'ApprovalRequested', aggregateType: 'admin_approval', aggregateId: created.id, payload: { action: REFUND_ACTION, entityId: holdId, amount, requestedBy: u.id } });
        return created;
      });
      return { approval_id: a.id, status: a.status, expires_at: a.expiresAt.toISOString() };
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') throw new AppError('CONFLICT', { messageAr: 'يوجد طلب استرداد مفتوح على هذا الحجز.', messageEn: 'An open refund request already exists for this hold.' });
      throw e;
    }
  }

  list(u: AuthUser, q: { status?: AdminApproval['status']; limit?: number }) { this.staff(u); return this.approvals.list({ status: q.status, action: undefined, limit: q.limit ?? 50 }); }

  /** Step 2 — the checker: a DIFFERENT person approves; the payload is revalidated and executed in one tx. */
  async approve(u: AuthUser, approvalId: string, dto: DecisionDto) {
    this.staff(u);
    const a = await this.approvals.findById(approvalId); if (!a) throw new AppError('NOT_FOUND');
    if (a.status !== 'requested') throw new AppError('CONFLICT', { messageAr: 'الطلب محسوم أو منتهٍ.', messageEn: 'Request already decided or expired.', details: { status: a.status } });
    if (a.requestedBy === u.id) throw new AppError('FORBIDDEN', { messageAr: 'لا يُعتمد الطلب من صاحبه — مبدأ الأربع عيون.', messageEn: 'A request cannot be approved by its own maker.' });
    const hold = await this.holds.findById(a.entityId); if (!hold) throw new AppError('NOT_FOUND');
    const pAmount = a.payload['amount']; const pReason = a.payload['reason_ar'];
    const amount = typeof pAmount === 'string' ? pAmount : hold.amount;
    const reason = typeof pReason === 'string' ? pReason : dto.reason_ar;
    this.assertRefundable(hold, amount);   // the world may have changed since the request
    const refundId = newId();
    await this.uow.run(async (tx) => {
      await this.escrow.refund(tx, hold.id, refundId, amount, u.id, reason);
      await this.approvals.decide(approvalId, { status: 'approved', decidedBy: u.id, decisionReasonAr: dto.reason_ar }, tx);
      await this.audit.write(tx, { action: 'approval.approve', entityType: 'admin_approval', entityId: approvalId, orgId: hold.beneficiaryOrgId, actorUserId: u.id, after: { hold: hold.id, amount, refundId, reason: dto.reason_ar } });
    });
    // PSP settlement after commit, exactly like every other refund path (external I/O never inside the tx).
    const payment = await this.payments.findById(hold.paymentId);
    const r = payment?.pspChargeId ? await this.psp.refund(payment.pspChargeId, amount, reason) : { refundId, status: 'succeeded' as const };
    if (payment) await this.payments.update(payment.id, { refundedAmount: (Number(payment.refundedAmount) + Number(amount)).toFixed(2), status: Number(payment.refundedAmount) + Number(amount) >= Number(payment.amount) ? 'refunded' : 'partially_refunded' });
    return { approval_id: approvalId, refund_id: refundId, psp_refund_id: r.refundId, amount, status: r.status };
  }

  /** Reject — open to any finance staff INCLUDING the maker (withdrawing your own typo needs no colleague). */
  async reject(u: AuthUser, approvalId: string, dto: DecisionDto) {
    this.staff(u);
    const a = await this.approvals.findById(approvalId); if (!a) throw new AppError('NOT_FOUND');
    if (a.status !== 'requested') throw new AppError('CONFLICT', { details: { status: a.status } });
    await this.uow.run(async (tx) => {
      await this.approvals.decide(approvalId, { status: 'rejected', decidedBy: u.id, decisionReasonAr: dto.reason_ar }, tx);
      await this.audit.write(tx, { action: 'approval.reject', entityType: 'admin_approval', entityId: approvalId, actorUserId: u.id, after: { withdrawn_by_maker: a.requestedBy === u.id, reason: dto.reason_ar } });
    });
    return { approval_id: approvalId, status: 'rejected' };
  }

  /** Daily sweep: unanswered requests expire and the hold returns to its normal life. */
  async expireDue() { const n = await this.approvals.expireDue(new Date()); return { expired: n }; }
}
