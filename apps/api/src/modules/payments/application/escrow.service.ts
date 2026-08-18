import { Inject, Injectable } from '@nestjs/common';
import { escrowRefunded, escrowReleased, paymentCaptured, computeSplit } from '@sinaaty/ledger';
import { AppError } from '../../../common/errors';
import { AppConfig } from '../../../config';
import { AuditLogWriter } from '../../../common/audit';
import { OutboxWriter } from '../../../common/outbox';
import { Money } from '../../../common/domain/money';
import type { TxHandle } from '../../../common/ports/unit-of-work.port';
import { ORGANIZATION_REPOSITORY, type OrganizationRepository } from '../../organizations/domain/repositories';
import { canTransitionEscrow, type EscrowHold } from '../domain/payment';
import { ESCROW_REPOSITORY, type EscrowRepository, LEDGER_REPOSITORY, type LedgerRepository } from '../domain/repositories';

/** All escrow money movements — every method posts a balanced ledger entry inside the caller's tx. */
@Injectable()
export class EscrowService {
  constructor(@Inject(ESCROW_REPOSITORY) private readonly holds: EscrowRepository, @Inject(LEDGER_REPOSITORY) private readonly ledger: LedgerRepository, @Inject(ORGANIZATION_REPOSITORY) private readonly orgs: OrganizationRepository, private readonly audit: AuditLogWriter, private readonly outbox: OutboxWriter, private readonly config: AppConfig) {}

  /** Payment captured → funds held for the beneficiary org (ledger: psp_clearing → escrow_liability:org). */
  async hold(tx: TxHandle, p: { paymentId: string; orgId: string; amount: string; workOrderId?: string | null; partOrderId?: string | null; providerRef?: string }): Promise<EscrowHold> {
    const now = new Date(); const autoReleaseAt = new Date(now.getTime() + this.config.get('ESCROW_AUTO_RELEASE_HOURS') * 3_600_000);
    const hold = await this.holds.create({ paymentId: p.paymentId, beneficiaryOrgId: p.orgId, workOrderId: p.workOrderId ?? null, partOrderId: p.partOrderId ?? null, amount: p.amount, autoReleaseAt, status: 'held', heldAt: now, providerRef: p.providerRef }, tx);
    await this.ledger.post(paymentCaptured({ paymentId: p.paymentId, orgId: p.orgId, amount: p.amount }), tx);
    await this.audit.write(tx, { action: 'escrow.hold', entityType: 'escrow_hold', entityId: hold.id, orgId: p.orgId, actorType: 'system', after: { amount: p.amount, autoReleaseAt: autoReleaseAt.toISOString() } });
    return hold;
  }
  /** Release to the org: split into org_available + platform commission (+VAT on commission). */
  async release(tx: TxHandle, holdId: string, reason: 'customer_confirmed' | 'auto_timeout' | 'dispute_decision' | 'admin', actorUserId: string | null): Promise<EscrowHold> {
    const hold = await this.holds.findById(holdId); if (!hold) throw new AppError('NOT_FOUND');
    if (hold.status === 'frozen' && reason !== 'dispute_decision' && reason !== 'admin') throw new AppError('ESCROW_FROZEN');
    if (!canTransitionEscrow(hold.status, 'released')) throw new AppError('ESCROW_NOT_RELEASABLE', { details: { status: hold.status } });
    const org = await this.orgs.findById(hold.beneficiaryOrgId); if (!org) throw new AppError('NOT_FOUND');
    const split = computeSplit(hold.amount, org.commissionRateBps, this.config.get('VAT_RATE_PCT'), 0);
    await this.ledger.post(escrowReleased({ escrowHoldId: hold.id, orgId: hold.beneficiaryOrgId, gross: hold.amount, commissionBps: org.commissionRateBps, vatRatePct: this.config.get('VAT_RATE_PCT') }), tx);
    const now = new Date();
    await this.holds.update(hold.id, { status: 'released', platformFee: split.commission.plus(split.vatOnCommission).toFixed(2), releasedAmount: split.net.toFixed(2), releaseReason: reason, releasedAt: now }, tx);
    await this.audit.write(tx, { action: 'escrow.release', entityType: 'escrow_hold', entityId: hold.id, orgId: hold.beneficiaryOrgId, actorUserId, actorType: actorUserId ? 'user' : 'system', before: { status: hold.status }, after: { status: 'released', reason, gross: hold.amount, net: split.net.toFixed(2), commission: split.commission.toFixed(2), vat_on_commission: split.vatOnCommission.toFixed(2) } });
    await this.outbox.publish(tx, { eventType: 'EscrowReleased', aggregateType: 'escrow_hold', aggregateId: hold.id, payload: { orgId: hold.beneficiaryOrgId, workOrderId: hold.workOrderId, gross: hold.amount, net: split.net.toFixed(2), reason } });
    return (await this.holds.findById(hold.id, tx))!;
  }
  async freeze(tx: TxHandle, holdId: string, disputeId: string | null, actorUserId: string | null) {
    const hold = await this.holds.findById(holdId); if (!hold) throw new AppError('NOT_FOUND');
    if (!canTransitionEscrow(hold.status, 'frozen')) throw new AppError('ESCROW_NOT_RELEASABLE', { messageAr: 'لا يمكن تجميد المبلغ في حالته الحالية.', messageEn: 'Cannot freeze in current state.', details: { status: hold.status } });
    await this.holds.update(hold.id, { status: 'frozen', ...(disputeId ? { disputeId } : {}) }, tx);
    await this.audit.write(tx, { action: 'escrow.freeze', entityType: 'escrow_hold', entityId: hold.id, orgId: hold.beneficiaryOrgId, actorUserId, after: { disputeId } });
  }
  /** Refund (full/partial) to the payer before release: escrow_liability → refunds_payable; PSP refund is executed by the caller. */
  async refund(tx: TxHandle, holdId: string, refundId: string, amount: string, actorUserId: string | null, reason: string) {
    const hold = await this.holds.findById(holdId); if (!hold) throw new AppError('NOT_FOUND');
    if (!['held', 'frozen'].includes(hold.status)) throw new AppError('ESCROW_NOT_RELEASABLE', { details: { status: hold.status } });
    const remaining = Money.of(hold.amount).minus(Money.of(hold.refundedAmount)); const amt = Money.of(amount);
    if (amt.gt(remaining) || amt.isZero() || amt.isNegative()) throw new AppError('VALIDATION', { messageAr: 'مبلغ الاسترجاع غير صالح.', messageEn: 'Invalid refund amount.', details: { remaining: remaining.toString() } });
    await this.ledger.post(escrowRefunded({ escrowHoldId: hold.id, refundId, orgId: hold.beneficiaryOrgId, amount: amt.toString() }), tx);
    const newRefunded = Money.of(hold.refundedAmount).plus(amt);
    await this.holds.update(hold.id, { refundedAmount: newRefunded.toString(), ...(newRefunded.equals(Money.of(hold.amount)) ? { status: 'refunded', releaseReason: 'refund' } : {}) }, tx);
    await this.audit.write(tx, { action: 'escrow.refund', entityType: 'escrow_hold', entityId: hold.id, orgId: hold.beneficiaryOrgId, actorUserId, actorType: actorUserId ? 'admin' : 'system', after: { amount: amt.toString(), reason } });
  }
}
