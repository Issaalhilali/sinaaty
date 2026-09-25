/**
 * Posting templates — the ONLY place financial effects are expressed. Each returns a balanced
 * LedgerEntryDraft; the api's LedgerPort persists it inside the caller's transaction.
 */
import { Accounts } from './accounts';
import { entry, type LedgerEntryDraft } from './entry';
import { type AmountInput, bpsToRate, round2, Decimal } from './money';

export interface Split {
  gross: Decimal;
  commission: Decimal;
  vatOnCommission: Decimal;
  noteFee: Decimal;
  net: Decimal;
}

/** Fee math for a release: commission (bps of gross) + VAT on commission + optional flat note fee. */
export function computeSplit(gross: AmountInput, commissionBps: number, vatRatePct: number, noteFee: AmountInput = 0): Split {
  const g = round2(gross);
  const commission = round2(g.mul(bpsToRate(commissionBps)));
  const vatOnCommission = round2(commission.mul(vatRatePct).div(100));
  const fee = round2(noteFee);
  const net = g.minus(commission).minus(vatOnCommission).minus(fee);
  if (net.lt(0)) throw new RangeError('fees exceed gross amount');
  return { gross: g, commission, vatOnCommission, noteFee: fee, net };
}

/** Customer paid → PSP holds → we owe the org (escrow). */
export function paymentCaptured(p: { paymentId: string; orgId: string; amount: AmountInput }): LedgerEntryDraft {
  return entry('payment_captured', `payment_captured:${p.paymentId}`)
    .ref('payments', p.paymentId)
    .debit(Accounts.pspClearing, p.amount)
    .credit(Accounts.escrowLiability(p.orgId), p.amount)
    .build();
}

/** Escrow released to org: split into org_available + platform revenue (+ VAT on our fee). */
export function escrowReleased(p: {
  escrowHoldId: string;
  orgId: string;
  gross: AmountInput;
  commissionBps: number;
  vatRatePct: number;
  noteFee?: AmountInput;
}): LedgerEntryDraft {
  const s = computeSplit(p.gross, p.commissionBps, p.vatRatePct, p.noteFee ?? 0);
  return entry('escrow_release', `escrow_release:${p.escrowHoldId}`)
    .ref('escrow_holds', p.escrowHoldId)
    .debit(Accounts.escrowLiability(p.orgId), s.gross)
    .credit(Accounts.orgAvailable(p.orgId), s.net)
    .credit(Accounts.revenue('commission'), s.commission)
    .credit(Accounts.vatPayable, s.vatOnCommission)
    .credit(Accounts.revenue('note_fee'), s.noteFee)
    .build();
}

/**
 * Transport escrow release: the platform's cut is the margin FROZEN ON THE JOB when it was quoted
 * (not the org's commission bps) → platform_revenue:transport_margin + VAT on the margin; the
 * remainder becomes available to the provider. Balanced like every release.
 */
export function transportEscrowReleased(p: {
  escrowHoldId: string;
  orgId: string;
  gross: AmountInput;
  margin: AmountInput;
  vatRatePct: number;
}): LedgerEntryDraft {
  const gross = round2(p.gross);
  const margin = round2(p.margin);
  const vatOnMargin = round2(margin.mul(p.vatRatePct).div(100));
  const net = gross.minus(margin).minus(vatOnMargin);
  if (net.lt(0)) throw new RangeError('transport margin exceeds gross amount');
  return entry('escrow_release', `escrow_release:${p.escrowHoldId}`)
    .ref('escrow_holds', p.escrowHoldId)
    .debit(Accounts.escrowLiability(p.orgId), gross)
    .credit(Accounts.orgAvailable(p.orgId), net)
    .credit(Accounts.revenue('transport_margin'), margin)
    .credit(Accounts.vatPayable, vatOnMargin)
    .build();
}

/** Escrow refunded to customer (full or partial) — before PSP executes the refund. */
export function escrowRefunded(p: { escrowHoldId: string; refundId: string; orgId: string; amount: AmountInput }): LedgerEntryDraft {
  return entry('refund', `refund:${p.refundId}`)
    .ref('refunds', p.refundId)
    .debit(Accounts.escrowLiability(p.orgId), p.amount)
    .credit(Accounts.refundsPayable, p.amount)
    .build();
}

/** Dispute split: part to org (net of fees on that part), rest refunded. */
export function disputeSplit(p: {
  escrowHoldId: string;
  disputeId: string;
  orgId: string;
  gross: AmountInput;
  toCustomer: AmountInput;
  commissionBps: number;
  vatRatePct: number;
}): LedgerEntryDraft {
  const gross = round2(p.gross);
  const toCustomer = round2(p.toCustomer);
  if (toCustomer.gt(gross) || toCustomer.lt(0)) throw new RangeError('toCustomer must be within [0, gross]');
  const toOrgGross = gross.minus(toCustomer);
  const s = computeSplit(toOrgGross, p.commissionBps, p.vatRatePct, 0);
  return entry('dispute_split', `dispute_split:${p.disputeId}`)
    .ref('disputes', p.disputeId)
    .debit(Accounts.escrowLiability(p.orgId), gross)
    .credit(Accounts.refundsPayable, toCustomer)
    .credit(Accounts.orgAvailable(p.orgId), s.net)
    .credit(Accounts.revenue('commission'), s.commission)
    .credit(Accounts.vatPayable, s.vatOnCommission)
    .build();
}

/** Payout executed to org's bank. */
export function payoutSent(p: { payoutId: string; orgId: string; amount: AmountInput }): LedgerEntryDraft {
  return entry('payout', `payout:${p.payoutId}`)
    .ref('payouts', p.payoutId)
    .debit(Accounts.orgAvailable(p.orgId), p.amount)
    .credit(Accounts.bank, p.amount)
    .build();
}

/** PSP settled captured funds into our bank. */
export function pspSettled(p: { settlementRef: string; amount: AmountInput }): LedgerEntryDraft {
  return entry('psp_settlement', `psp_settlement:${p.settlementRef}`)
    .debit(Accounts.bank, p.amount)
    .credit(Accounts.pspClearing, p.amount)
    .build();
}
