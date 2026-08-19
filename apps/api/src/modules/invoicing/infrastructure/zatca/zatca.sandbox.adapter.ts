import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../../../config';
import { derToPem } from '@sinaaty/zatca-ubl';
import type { CsidResult, ZatcaPort, ZatcaValidationResult } from '../../application/ports/zatca.port';

/**
 * ZATCA Fatoora sandbox/production HTTP adapter.
 * Endpoints and payload shapes follow the published Fatoora API; the contract is documented in
 * docs/integrations/zatca.md and must be re-checked against the portal before going live.
 * Authentication after onboarding is HTTP Basic: base64(binarySecurityToken:secret).
 */
@Injectable()
export class ZatcaHttpAdapter implements ZatcaPort {
  private readonly log = new Logger('ZatcaHttp');
  constructor(private readonly config: AppConfig) {}
  private base() { return this.config.get('ZATCA_BASE_URL'); }
  private async call<T>(path: string, body: unknown, headers: Record<string, string>, idempotencyKey: string): Promise<{ status: number; body: T }> {
    const res = await fetch(`${this.base()}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json', 'accept-version': 'V2', 'Accept-Language': 'en', 'X-Idempotency-Key': idempotencyKey, ...headers }, body: JSON.stringify(body) });
    const text = await res.text(); let parsed: unknown = {}; try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = { raw: text }; }
    if (res.status >= 500) throw new Error(`ZATCA ${path} failed with ${res.status}`);
    return { status: res.status, body: parsed as T };
  }
  private basic(c: CsidResult) { return { authorization: `Basic ${Buffer.from(`${c.binarySecurityToken}:${c.secret}`).toString('base64')}` }; }
  async complianceCsid(csrBase64: string, otp: string, key: string): Promise<CsidResult> {
    const r = await this.call<{ binarySecurityToken: string; secret: string; requestID: string | number }>('/compliance', { csr: csrBase64 }, { OTP: otp }, key);
    if (r.status !== 200) throw new Error(`ZATCA compliance CSID rejected (${r.status})`);
    return { binarySecurityToken: r.body.binarySecurityToken, secret: r.body.secret, requestId: String(r.body.requestID), certificatePem: derToPem(Buffer.from(r.body.binarySecurityToken, 'base64')) };
  }
  async productionCsid(compliance: CsidResult, complianceRequestId: string, key: string): Promise<CsidResult> {
    const r = await this.call<{ binarySecurityToken: string; secret: string }>('/production/csids', { compliance_request_id: complianceRequestId }, this.basic(compliance), key);
    if (r.status !== 200) throw new Error(`ZATCA production CSID rejected (${r.status})`);
    return { binarySecurityToken: r.body.binarySecurityToken, secret: r.body.secret, certificatePem: derToPem(Buffer.from(r.body.binarySecurityToken, 'base64')) };
  }
  complianceCheck(csid: CsidResult, xml: string, hash: string, uuid: string, key: string) { return this.submit('/compliance/invoices', csid, xml, hash, uuid, key, 'REPORTED'); }
  clearInvoice(csid: CsidResult, xml: string, hash: string, uuid: string, key: string) { return this.submit('/invoices/clearance/single', csid, xml, hash, uuid, key, 'CLEARED', { 'Clearance-Status': '1' }); }
  reportInvoice(csid: CsidResult, xml: string, hash: string, uuid: string, key: string) { return this.submit('/invoices/reporting/single', csid, xml, hash, uuid, key, 'REPORTED'); }
  private async submit(path: string, csid: CsidResult, xml: string, hash: string, uuid: string, key: string, ok: 'CLEARED' | 'REPORTED', extra: Record<string, string> = {}): Promise<ZatcaValidationResult> {
    const r = await this.call<{ clearanceStatus?: string; reportingStatus?: string; clearedInvoice?: string; validationResults?: { warningMessages?: unknown[]; errorMessages?: unknown[] } }>(path, { invoiceHash: hash, uuid, invoice: Buffer.from(xml, 'utf8').toString('base64') }, { ...this.basic(csid), ...extra }, key);
    const warnings = r.body.validationResults?.warningMessages ?? []; const errors = r.body.validationResults?.errorMessages ?? [];
    const accepted = r.status === 200 && (r.body.clearanceStatus === 'CLEARED' || r.body.reportingStatus === 'REPORTED');
    if (!accepted) this.log.warn(`ZATCA ${path} → ${r.status} with ${errors.length} error(s)`);
    return { status: accepted ? ok : (ok === 'CLEARED' ? 'NOT_CLEARED' : 'NOT_REPORTED'), warnings, errors, clearedInvoiceXml: r.body.clearedInvoice ? Buffer.from(r.body.clearedInvoice, 'base64').toString('utf8') : undefined, raw: r.body };
  }
}
