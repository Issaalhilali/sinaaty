/** نافذ (Nafez) — Ministry of Justice electronic promissory notes. Assumed contract: docs/integrations/nafez.md. */
export interface NafezCreateInput { internalNumber: string; creditor: { orgId: string; legalNameAr: string; crNumber: string | null; vatNumber: string | null }; debtor: { userId: string | null; orgId: string | null; nationalIdHash: string | null; nameAr: string | null }; amount: string; currency: 'SAR'; dueDate: string; placeOfIssue: string; reference: { workOrderNumber: string | null; invoiceNumber: string | null; consentSignatureId: string | null } }
export interface NafezCreateResult { noteRef: string; status: 'issued' | 'pending_consent' | 'rejected'; issuedAt?: Date; raw?: unknown }
export interface NafezPort {
  createNote(input: NafezCreateInput, idempotencyKey: string): Promise<NafezCreateResult>;
  getStatus(noteRef: string): Promise<{ status: 'pending_consent' | 'issued' | 'closed' | 'cancelled' | 'rejected'; outstanding?: string }>;
  updateOutstanding(noteRef: string, outstanding: string, idempotencyKey: string): Promise<{ ok: true }>;
  closeNote(noteRef: string, input: { reason: 'paid' | 'cancelled' | 'settled'; paidAmount: string }, idempotencyKey: string): Promise<{ status: 'closed' | 'cancelled'; closedAt: Date }>;
}
export const NAFEZ_PORT = Symbol('NAFEZ_PORT');
