import type { InvoiceStatus, InvoiceType, PaymentTerms, ZatcaStatus } from '@sinaaty/shared-types';
import type { TxHandle } from '../../../common/ports/unit-of-work.port';
import type { Invoice, PartySnapshot } from './invoice';
import type { ZatcaDevice, ZatcaSubmission } from './zatca';
export interface NewInvoiceLine { workOrderItemId?: string | null; descriptionAr: string; descriptionEn?: string | null; quantity: string; unitPrice: string; discount: string; vatRate: string; vatAmount: string; lineTotal: string; sortOrder: number }
export interface NewInvoice { orgId: string; number: string; type: InvoiceType; status: InvoiceStatus; workOrderId?: string; partOrderId?: string; transportJobId?: string; parentInvoiceId?: string; customerUserId?: string; customerOrgId?: string; buyerSnapshot: PartySnapshot; sellerSnapshot: PartySnapshot; subtotal: string; discountTotal: string; vatTotal: string; total: string; paymentTerms: PaymentTerms; issueDate: Date; dueDate?: Date | null; supplyDate?: Date | null; zatcaUuid: string; zatcaHash: string; zatcaQr: string; zatcaStatus: ZatcaStatus; notesAr?: string; createdBy: string | null; lines: NewInvoiceLine[] }
export interface InvoiceRepository {
  /** Atomic per-org, per-year sequence: returns e.g. "INV-2026-000012". */
  nextNumber(orgId: string, series: 'INV' | 'CN' | 'DN', year: number, tx?: TxHandle): Promise<string>;
  create(i: NewInvoice, tx?: TxHandle): Promise<Invoice>;
  findById(id: string): Promise<Invoice | null>;
  findActiveByWorkOrder(workOrderId: string): Promise<Invoice | null>;
  list(q: { orgId?: string; customerUserId?: string; customerOrgId?: string; status?: InvoiceStatus[]; limit: number }): Promise<Invoice[]>;
  /** The (single) non-void invoice of a transport job — the idempotency anchor for auto-issuance. */
  findByTransportJob(transportJobId: string, tx?: TxHandle): Promise<Invoice | null>;
  setStatus(id: string, status: InvoiceStatus, extra?: { voidedAt?: Date; voidReason?: string; paidTotal?: string }, tx?: TxHandle): Promise<void>;
}
export const INVOICE_REPOSITORY = Symbol('INVOICE_REPOSITORY');

/** ZATCA devices (EGS units) and submission log. The ICV/PIH chain is advanced atomically per device. */
export interface ZatcaRepository {
  createDevice(d: { orgId: string; unitName: string; csidEnc: Buffer; isProduction: boolean; csidExpiresAt: Date | null }, tx?: TxHandle): Promise<{ id: string }>;
  updateDevice(id: string, p: { csidEnc?: Buffer; isProduction?: boolean; csidExpiresAt?: Date | null }, tx?: TxHandle): Promise<void>;
  findDevice(id: string, tx?: TxHandle): Promise<(ZatcaDevice & { csidEnc: Buffer | null }) | null>;
  findActiveDevice(orgId: string, tx?: TxHandle): Promise<(ZatcaDevice & { csidEnc: Buffer | null }) | null>;
  listDevices(orgId: string): Promise<ZatcaDevice[]>;
  /** Reserves the next ICV and returns the previous hash — row-locked so two invoices never share a counter. */
  advanceChain(deviceId: string, tx: TxHandle): Promise<{ icv: number; pih: string }>;
  setChainHash(deviceId: string, icv: number, hash: string, tx: TxHandle): Promise<void>;
  addSubmission(s: { invoiceId: string; deviceId: string | null; mode: 'clearance' | 'reporting'; requestHash: string | null; responseCode: number | null; response: unknown; warnings: unknown; errors: unknown; status: ZatcaStatus }, tx?: TxHandle): Promise<{ id: string }>;
  listSubmissions(invoiceId: string): Promise<ZatcaSubmission[]>;
  setInvoiceZatca(invoiceId: string, p: { zatcaStatus: ZatcaStatus; zatcaHash?: string; zatcaQr?: string; zatcaXml?: string; zatcaIcv?: number; zatcaPih?: string }, tx?: TxHandle): Promise<void>;
}
export const ZATCA_REPOSITORY = Symbol('ZATCA_REPOSITORY');
