import type { InvoiceStatus, InvoiceType, PaymentTerms, ZatcaStatus } from '@sinaaty/shared-types';
import type { TxHandle } from '../../../common/ports/unit-of-work.port';
import type { Invoice, PartySnapshot } from './invoice';
export interface NewInvoiceLine { workOrderItemId?: string | null; descriptionAr: string; descriptionEn?: string | null; quantity: string; unitPrice: string; discount: string; vatRate: string; vatAmount: string; lineTotal: string; sortOrder: number }
export interface NewInvoice { orgId: string; number: string; type: InvoiceType; status: InvoiceStatus; workOrderId?: string; partOrderId?: string; parentInvoiceId?: string; customerUserId?: string; customerOrgId?: string; buyerSnapshot: PartySnapshot; sellerSnapshot: PartySnapshot; subtotal: string; discountTotal: string; vatTotal: string; total: string; paymentTerms: PaymentTerms; issueDate: Date; dueDate?: Date | null; supplyDate?: Date | null; zatcaUuid: string; zatcaHash: string; zatcaQr: string; zatcaStatus: ZatcaStatus; notesAr?: string; createdBy: string | null; lines: NewInvoiceLine[] }
export interface InvoiceRepository {
  /** Atomic per-org, per-year sequence: returns e.g. "INV-2026-000012". */
  nextNumber(orgId: string, series: 'INV' | 'CN' | 'DN', year: number, tx?: TxHandle): Promise<string>;
  create(i: NewInvoice, tx?: TxHandle): Promise<Invoice>;
  findById(id: string): Promise<Invoice | null>;
  findActiveByWorkOrder(workOrderId: string): Promise<Invoice | null>;
  list(q: { orgId?: string; customerUserId?: string; customerOrgId?: string; status?: InvoiceStatus[]; limit: number }): Promise<Invoice[]>;
  setStatus(id: string, status: InvoiceStatus, extra?: { voidedAt?: Date; voidReason?: string; paidTotal?: string }, tx?: TxHandle): Promise<void>;
}
export const INVOICE_REPOSITORY = Symbol('INVOICE_REPOSITORY');
