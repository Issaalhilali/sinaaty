import type { EnforcementStatus, NotificationChannel, PnStatus } from '@sinaaty/shared-types';
import type { TxHandle } from '../../../common/ports/unit-of-work.port';
import type { EnforcementCase, NoteEvent, PromissoryNote, Settlement } from './note';
export interface NoteRepository {
  nextNumber(prefix: 'PN' | 'MK', tx?: TxHandle): Promise<string>;
  create(n: { number: string; creditorOrgId: string; debtorUserId?: string | null; debtorOrgId?: string | null; workOrderId?: string | null; invoiceId?: string | null; partOrderId?: string | null; amount: string; dueDate: Date; placeOfIssue?: string; consentSignatureId?: string | null; issuanceFee?: string; createdBy?: string | null }, tx?: TxHandle): Promise<PromissoryNote>;
  findById(id: string, tx?: TxHandle): Promise<PromissoryNote | null>;
  findOpenByWorkOrder(workOrderId: string, tx?: TxHandle): Promise<PromissoryNote | null>;
  findByWorkOrder(workOrderId: string): Promise<PromissoryNote[]>;
  list(q: { creditorOrgId?: string; debtorUserId?: string; debtorOrgId?: string; status?: PnStatus[]; overdueOnly?: boolean; limit: number }): Promise<PromissoryNote[]>;
  update(id: string, patch: Partial<{ status: PnStatus; nafezReference: string; outstandingAmount: string; issueDate: Date; issuedAt: Date; closedAt: Date; cancelledAt: Date; cancelReason: string; nafezPayload: unknown; invoiceId: string }>, tx?: TxHandle): Promise<void>;
  addEvent(e: { noteId: string; from: PnStatus | null; to: PnStatus; amountDelta?: string | null; paymentId?: string | null; providerRef?: string | null; providerPayload?: unknown; actorUserId?: string | null; noteAr?: string }, tx?: TxHandle): Promise<void>;
  listEvents(noteId: string): Promise<NoteEvent[]>;
  createSettlement(s: { number: string; noteId: string | null; invoiceId: string | null; workOrderId: string | null; creditorOrgId: string; debtorUserId: string | null; debtorOrgId: string | null; amountSettled: string; contentSha256: string }, tx?: TxHandle): Promise<Settlement>;
  findSettlement(id: string): Promise<Settlement | null>;
  findSettlementByNote(noteId: string): Promise<Settlement | null>;
  addDunning(d: { noteId: string; invoiceId: string | null; step: number; channel: NotificationChannel; isFormal: boolean }, tx?: TxHandle): Promise<{ inserted: boolean }>;
  listDunning(noteId: string): Promise<Array<{ step: number; channel: NotificationChannel; isFormal: boolean; sentAt: Date }>>;
  createEnforcement(e: { noteId: string; requestedBy: string; claimedAmount: string; timeline: unknown }, tx?: TxHandle): Promise<EnforcementCase>;
  findEnforcementByNote(noteId: string): Promise<EnforcementCase | null>;
  updateEnforcement(id: string, patch: Partial<{ status: EnforcementStatus; najizCaseRef: string; filedAt: Date; closedAt: Date; recoveredAmount: string; timeline: unknown }>, tx?: TxHandle): Promise<void>;
}
export const NOTE_REPOSITORY = Symbol('NOTE_REPOSITORY');
