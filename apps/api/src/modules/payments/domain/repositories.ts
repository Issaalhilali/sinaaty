import type { EscrowStatus, PaymentMethod, PaymentStatus, PayoutStatus } from '@sinaaty/shared-types';
import type { LedgerEntryDraft } from '@sinaaty/ledger';
import type { TxHandle } from '../../../common/ports/unit-of-work.port';
import type { EscrowHold, Payment, Payout } from './payment';
export interface PaymentRepository {
  create(p: { invoiceId?: string; workOrderId?: string; partOrderId?: string; payerUserId?: string; payerOrgId?: string; payeeOrgId: string; method: PaymentMethod; amount: string; pspProvider?: string; pspIntentId?: string; idempotencyKey: string; status?: PaymentStatus }, tx?: TxHandle): Promise<Payment>;
  findById(id: string): Promise<Payment | null>;
  findByIntent(provider: string, intentId: string): Promise<Payment | null>;
  findPendingForInvoice(invoiceId: string): Promise<Payment | null>;
  listForInvoice(invoiceId: string): Promise<Payment[]>;
  update(id: string, patch: Partial<{ status: PaymentStatus; pspChargeId: string; failureReason: string; authorizedAt: Date; capturedAt: Date; refundedAmount: string; pspPayload: unknown }>, tx?: TxHandle): Promise<void>;
}
export interface EscrowRepository {
  create(h: { paymentId: string; beneficiaryOrgId: string; workOrderId?: string | null; partOrderId?: string | null; amount: string; autoReleaseAt: Date; status: EscrowStatus; heldAt: Date; providerRef?: string }, tx?: TxHandle): Promise<EscrowHold>;
  findById(id: string, tx?: TxHandle): Promise<EscrowHold | null>;
  findByPayment(paymentId: string): Promise<EscrowHold | null>;
  listByWorkOrder(workOrderId: string): Promise<EscrowHold[]>;
  listDue(now: Date, limit: number): Promise<EscrowHold[]>;
  listReleasedUnpaid(orgId?: string): Promise<EscrowHold[]>;
  update(id: string, patch: Partial<{ status: EscrowStatus; platformFee: string; releasedAmount: string; refundedAmount: string; releaseReason: string; disputeId: string | null; releasedAt: Date }>, tx?: TxHandle): Promise<void>;
}
export interface LedgerRepository {
  post(entry: LedgerEntryDraft, tx?: TxHandle): Promise<{ entryId: string; duplicate: boolean }>;
  balance(code: string): Promise<string>;
  balances(codes: string[]): Promise<Record<string, string>>;
  entriesForOrg(orgId: string, limit: number): Promise<Array<{ id: string; entryType: string; refTable: string | null; refId: string | null; description: string | null; postedAt: Date; lines: Array<{ account: string; debit: string; credit: string }> }>>;
  /** Σdebit − Σcredit over all lines — must always be 0.00 */
  globalImbalance(): Promise<string>;
}
export interface PayoutRepository {
  create(p: { orgId: string; bankAccountId: string; amount: string; scheduledFor: Date; holdIds: Array<{ holdId: string; amount: string }> }, tx?: TxHandle): Promise<Payout>;
  findById(id: string): Promise<Payout | null>;
  listForOrg(orgId: string, limit: number): Promise<Payout[]>;
  listScheduled(limit: number): Promise<Payout[]>;
  update(id: string, patch: Partial<{ status: PayoutStatus; providerRef: string; processedAt: Date; failureReason: string; ledgerEntryId: string }>, tx?: TxHandle): Promise<void>;
  defaultBankAccountId(orgId: string): Promise<string | null>;
}
export interface WebhookInbox {
  /** Returns false when the (provider, eventId) was already stored → caller must treat as replay. */
  record(e: { provider: string; providerEventId: string; eventType: string; signatureValid: boolean; headers?: unknown; payload: unknown }, tx?: TxHandle): Promise<{ inserted: boolean }>;
  markProcessed(provider: string, providerEventId: string, error?: string, tx?: TxHandle): Promise<void>;
}
export const PAYMENT_REPOSITORY = Symbol('PAYMENT_REPOSITORY');
export const ESCROW_REPOSITORY = Symbol('ESCROW_REPOSITORY');
export const LEDGER_REPOSITORY = Symbol('LEDGER_REPOSITORY');
export const PAYOUT_REPOSITORY = Symbol('PAYOUT_REPOSITORY');
export const WEBHOOK_INBOX = Symbol('WEBHOOK_INBOX');
