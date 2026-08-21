import type { InvoiceStatus, InvoiceType, PaymentTerms, ZatcaStatus } from '@sinaaty/shared-types';
export interface InvoiceLine { id: string; workOrderItemId: string | null; descriptionAr: string; descriptionEn: string | null; quantity: string; unitPrice: string; discount: string; vatRate: string; vatAmount: string; lineTotal: string; sortOrder: number }
export interface PartySnapshot { name_ar: string; name_en?: string | null; vat_number?: string | null; cr_number?: string | null; address?: unknown; phone?: string | null; user_id?: string | null; org_id?: string | null }
export interface Invoice {
  id: string; orgId: string; number: string; type: InvoiceType; status: InvoiceStatus; workOrderId: string | null; partOrderId: string | null; transportJobId: string | null; parentInvoiceId: string | null;
  customerUserId: string | null; customerOrgId: string | null; buyerSnapshot: PartySnapshot; sellerSnapshot: PartySnapshot; currency: string;
  subtotal: string; discountTotal: string; vatTotal: string; total: string; paidTotal: string; paymentTerms: PaymentTerms; issueDate: Date | null; dueDate: Date | null; supplyDate: Date | null;
  zatcaUuid: string | null; zatcaHash: string | null; zatcaQr: string | null; zatcaStatus: ZatcaStatus; zatcaIcv: string | null; zatcaPih: string | null; zatcaXml?: string | null; notesAr: string | null; voidedAt: Date | null; voidReason: string | null; createdAt: Date; lines: InvoiceLine[];
}
/** Simplified (B2C) vs standard (B2B) tax invoice: standard when the buyer is an organization / VAT-registered. */
export const invoiceTypeFor = (buyer: { org_id?: string | null; vat_number?: string | null }): InvoiceType => (buyer.org_id || buyer.vat_number ? 'standard_tax' : 'simplified_tax');
export const INVOICE_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = { draft: ['issued', 'void'], issued: ['sent', 'partially_paid', 'paid', 'overdue', 'void'], sent: ['partially_paid', 'paid', 'overdue', 'void'], partially_paid: ['paid', 'overdue'], overdue: ['partially_paid', 'paid'], paid: ['refunded'], void: [], refunded: [] };
export const canTransitionInvoice = (from: InvoiceStatus, to: InvoiceStatus) => INVOICE_TRANSITIONS[from].includes(to);
export const isVoidable = (i: Pick<Invoice, 'status' | 'paidTotal'>) => ['issued', 'sent', 'overdue'].includes(i.status) && Number(i.paidTotal) === 0;
export const ACTIVE_STATUSES: InvoiceStatus[] = ['issued', 'sent', 'partially_paid', 'overdue', 'paid'];
