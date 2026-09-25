import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '../../../../common/errors';
import { UNIT_OF_WORK, type UnitOfWork } from '../../../../common/ports/unit-of-work.port';
import type { AuthUser } from '../../../identity/domain/auth-user';
import { isPlatformStaff } from '../../../identity/domain/auth-user';
import { WORK_ORDER_REPOSITORY, type WorkOrderRepository } from '../../../work-orders/domain/repositories';
import { isCustomer } from '../../../work-orders/domain/work-order';
import { APPROVAL_REPOSITORY, type ApprovalRepository, ESCROW_REPOSITORY, type EscrowRepository, PAYMENT_REPOSITORY, type PaymentRepository } from '../../domain/repositories';
import { EscrowService } from '../escrow.service';
import { PSP_PORT, type PspPort } from '../ports/psp.port';
import type { ReasonDto } from '../dto/payments.dto';

@Injectable()
export class EscrowUseCases {
  constructor(@Inject(ESCROW_REPOSITORY) private readonly holds: EscrowRepository, @Inject(PAYMENT_REPOSITORY) private readonly payments: PaymentRepository, @Inject(WORK_ORDER_REPOSITORY) private readonly workOrders: WorkOrderRepository, @Inject(PSP_PORT) private readonly psp: PspPort, @Inject(APPROVAL_REPOSITORY) private readonly approvals: ApprovalRepository, @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork, private readonly escrow: EscrowService) {}

  /** Customer confirms receipt → funds released to the workshop now (instead of waiting for auto-release). */
  async customerConfirm(u: AuthUser, workOrderId: string) {
    const wo = await this.workOrders.findById(workOrderId); if (!wo) throw new AppError('NOT_FOUND');
    if (!isCustomer(wo, u) && !isPlatformStaff(u)) throw new AppError('FORBIDDEN');
    if (!['delivered', 'closed'].includes(wo.status)) throw new AppError('CONFLICT', { messageAr: 'أكّد الاستلام بعد تسليم المركبة.', messageEn: 'Confirm after the vehicle is delivered.' });
    const held = (await this.holds.listByWorkOrder(workOrderId)).filter((h) => h.status === 'held');
    if (!held.length) throw new AppError('ESCROW_NOT_RELEASABLE', { messageAr: 'لا يوجد مبلغ محتجز لهذا الأمر.', messageEn: 'No held funds for this work order.' });
    const released = await this.uow.run(async (tx) => { const out = []; for (const h of held) out.push(await this.escrow.release(tx, h.id, 'customer_confirmed', u.id)); return out; });
    return { released: released.map((h) => ({ id: h.id, amount: h.amount, released_amount: h.releasedAmount, platform_fee: h.platformFee })) };
  }
  /** Scheduler: release every held hold whose auto_release_at has passed. Returns count.
   *  A hold with an OPEN refund request is skipped — the machine must not release money a human is
   *  actively deciding whether to give back (maker/checker design). */
  async releaseDue(limit = 100) {
    const due = await this.holds.listDue(new Date(), limit); let n = 0; let heldForDecision = 0;
    for (const h of due) {
      if (await this.approvals.hasOpenForEntity('escrow.refund', h.id)) { heldForDecision++; continue; }
      try { await this.uow.run((tx) => this.escrow.release(tx, h.id, 'auto_timeout', null)); n++; } catch { /* frozen or raced — skip */ }
    }
    return { released: n, scanned: due.length, held_for_decision: heldForDecision };
  }
  async adminRelease(u: AuthUser, holdId: string, dto: ReasonDto) { if (!isPlatformStaff(u)) throw new AppError('FORBIDDEN'); return this.uow.run((tx) => this.escrow.release(tx, holdId, 'admin', u.id)).then((h) => ({ ...h, reason: dto.reason_ar })); }
  async adminFreeze(u: AuthUser, holdId: string, dto: ReasonDto) { if (!isPlatformStaff(u)) throw new AppError('FORBIDDEN'); await this.uow.run((tx) => this.escrow.freeze(tx, holdId, null, u.id)); return { frozen: true, reason: dto.reason_ar }; }
  /**
   * PSP side of a refund whose ledger entry was already posted inside another module's transaction
   * (dispute decisions do the ledger + state atomically, then settle with the provider here).
   */
  async settleRefundWithPsp(holdId: string, refundId: string, amount: string, reason: string) {
    const hold = await this.holds.findById(holdId); if (!hold) return null;
    const payment = await this.payments.findById(hold.paymentId); if (!payment) return null;
    const r = payment.pspChargeId ? await this.psp.refund(payment.pspChargeId, amount, reason) : { refundId, status: 'succeeded' as const };
    const refunded = (Number(payment.refundedAmount) + Number(amount)).toFixed(2);
    await this.payments.update(payment.id, { refundedAmount: refunded, status: Number(refunded) >= Number(payment.amount) ? 'refunded' : 'partially_refunded' });
    return { psp_refund_id: r.refundId, status: r.status, amount };
  }
  async get(u: AuthUser, holdId: string) { const h = await this.holds.findById(holdId); if (!h) throw new AppError('NOT_FOUND'); if (!isPlatformStaff(u) && !u.orgs.some((o) => o.orgId === h.beneficiaryOrgId)) { const p = await this.payments.findById(h.paymentId); if (p?.payerUserId !== u.id) throw new AppError('FORBIDDEN'); } return h; }
}
