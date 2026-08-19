/**
 * ZATCA Fatoora (Phase 2) — Anti-Corruption Layer.
 * Onboarding: CSR → compliance CSID → compliance checks → production CSID.
 * Runtime: standard invoices are **cleared** (ZATCA signs and returns the invoice), simplified invoices are
 * **reported** within 24h. Every call carries an idempotency key and is logged in `integration_requests`.
 */
export interface CsidResult { binarySecurityToken: string; secret: string; requestId?: string; certificatePem: string }
export interface ZatcaValidationResult { status: 'CLEARED' | 'REPORTED' | 'NOT_CLEARED' | 'NOT_REPORTED'; warnings: unknown[]; errors: unknown[]; clearedInvoiceXml?: string; raw?: unknown }
export interface ZatcaPort {
  /** Exchange a CSR + the Fatoora portal OTP for a compliance CSID. */
  complianceCsid(csrBase64: string, otp: string, idempotencyKey: string): Promise<CsidResult>;
  /** ZATCA replays sample documents against the compliance CSID before granting production access. */
  complianceCheck(csid: CsidResult, signedInvoiceXml: string, invoiceHashBase64: string, uuid: string, idempotencyKey: string): Promise<ZatcaValidationResult>;
  /** Production CSID — the certificate used to sign live invoices. */
  productionCsid(compliance: CsidResult, complianceRequestId: string, idempotencyKey: string): Promise<CsidResult>;
  clearInvoice(csid: CsidResult, signedInvoiceXml: string, invoiceHashBase64: string, uuid: string, idempotencyKey: string): Promise<ZatcaValidationResult>;
  reportInvoice(csid: CsidResult, signedInvoiceXml: string, invoiceHashBase64: string, uuid: string, idempotencyKey: string): Promise<ZatcaValidationResult>;
}
export const ZATCA_PORT = Symbol('ZATCA_PORT');
