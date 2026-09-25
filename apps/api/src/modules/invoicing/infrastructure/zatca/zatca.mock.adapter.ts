import { Injectable, Logger } from '@nestjs/common';
import { children, issueCertificate, parse, pemToDer, readCertificate, verifySignedInvoice } from '@sinaaty/zatca-ubl';
import type { CsidResult, ZatcaPort, ZatcaValidationResult } from '../../application/ports/zatca.port';

/**
 * Mock Fatoora. It does not fake success: it issues a real certificate over the CSR public key and then
 * **verifies the XAdES signature** of every submitted invoice, rejecting anything whose digest chain is
 * broken — exactly the class of error ZATCA rejects. Sandbox/live behaviour lives in the sandbox adapter.
 */
@Injectable()
export class ZatcaMockAdapter implements ZatcaPort {
  private readonly log = new Logger('ZatcaMock');
  /** Issues a CSID certificate over `spki` — the same public key for compliance and production, as ZATCA does. */
  private csid(spki: Buffer, production: boolean): CsidResult {
    const { certificatePem } = issueCertificate({ subjectPublicKeySpki: spki, commonName: production ? 'PCSID-EGS' : 'CCSID-EGS', organization: 'Sinaaty Dev', caCommonName: production ? 'ZATCA Mock Production CA' : 'ZATCA Mock Compliance CA' });
    return { binarySecurityToken: pemToDer(certificatePem).toString('base64'), secret: Buffer.from(`${production ? 'prod' : 'comp'}-secret`).toString('base64'), requestId: String(Date.now()), certificatePem };
  }
  complianceCsid(csrBase64: string, otp: string, _key: string) { if (!/^\d{6}$/.test(otp)) return Promise.reject(new Error('ZATCA rejects a malformed OTP')); return Promise.resolve(this.csid(extractSpkiFromCsr(Buffer.from(csrBase64, 'base64')), false)); }
  productionCsid(compliance: CsidResult, _requestId: string, _key: string) { return Promise.resolve(this.csid(readCertificate(compliance.certificatePem).publicKeyDer, true)); }
  complianceCheck(_csid: CsidResult, xml: string, hash: string, _uuid: string, _key: string) { return Promise.resolve(this.validate(xml, hash, 'REPORTED')); }
  clearInvoice(_csid: CsidResult, xml: string, hash: string, _uuid: string, _key: string) { return Promise.resolve(this.validate(xml, hash, 'CLEARED')); }
  reportInvoice(_csid: CsidResult, xml: string, hash: string, _uuid: string, _key: string) { return Promise.resolve(this.validate(xml, hash, 'REPORTED')); }
  private validate(xml: string, expectedHash: string, ok: 'CLEARED' | 'REPORTED'): ZatcaValidationResult {
    const v = verifySignedInvoice(xml);
    if (!v.valid) { this.log.warn(`rejected invoice: ${v.reason}`); return { status: ok === 'CLEARED' ? 'NOT_CLEARED' : 'NOT_REPORTED', warnings: [], errors: [{ code: 'SIGNATURE_INVALID', message: v.reason }] }; }
    if (v.invoiceHashBase64 !== expectedHash) return { status: ok === 'CLEARED' ? 'NOT_CLEARED' : 'NOT_REPORTED', warnings: [], errors: [{ code: 'HASH_MISMATCH', message: 'submitted hash does not match the document' }] };
    return { status: ok, warnings: [], errors: [], clearedInvoiceXml: ok === 'CLEARED' ? xml : undefined, raw: { mock: true } };
  }
}
/** CertificationRequestInfo ::= SEQ { version, subject, subjectPKInfo, attributes } — the third child. */
function extractSpkiFromCsr(der: Buffer): Buffer { return children(children(parse(der))[0]!)[2]!.raw; }
