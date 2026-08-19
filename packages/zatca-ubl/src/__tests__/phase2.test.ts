import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { buildInvoiceXml, GENESIS_PIH, type UblInvoice } from '../ubl';
import { invoiceHashBase64, zatcaCanonicalXml } from '../hash';
import { signInvoice, verifySignedInvoice } from '../sign';
import { csrToBase64, generateCsr } from '../csr';
import { decodeQr, encodeQr, isPhase2 } from '../qr';
import { pemToDer, publicKeyPoint, readCertificate } from '../x509';
import { parse, children } from '../der';

/** A real secp256k1 self-signed certificate, produced by OpenSSL from our own CSR: the test signs with
 *  a genuine key pair and verifies the signature independently, so a broken digest chain cannot pass. */
function issueTestCertificate(): { certPem: string; keyPem: string; csrPem: string } {
  const dir = mkdtempSync(join(tmpdir(), 'zatca-'));
  const csr = generateCsr({ commonName: 'EGS-1', organizationName: 'ورشة النور', organizationUnit: 'الفرع الرئيسي', egsSerialNumber: '1-Sinaaty|2-POS|3-0001', vatNumber: '300000000000003', registeredAddress: 'الرياض', businessCategory: 'Automotive', otp: '123456' });
  const csrPath = join(dir, 'r.csr'); const keyPath = join(dir, 'k.pem'); const certPath = join(dir, 'c.pem');
  writeFileSync(csrPath, csr.csrPem); writeFileSync(keyPath, csr.privateKeyPem);
  execFileSync('openssl', ['x509', '-req', '-in', csrPath, '-signkey', keyPath, '-days', '30', '-sha256', '-out', certPath], { stdio: 'pipe' });
  return { certPem: execFileSync('cat', [certPath]).toString(), keyPem: csr.privateKeyPem, csrPem: csr.csrPem };
}
const INVOICE: UblInvoice = {
  id: 'INV-2026-000001', uuid: '3cf5ee18-ee25-44ea-a444-2c37ba7f28be', issueDate: '2026-08-19', issueTime: '11:45:30',
  typeCode: '388', subtype: '0200000', currency: 'SAR', icv: 1, pih: GENESIS_PIH,
  seller: { registrationName: 'ورشة النور للسمكرة', vatNumber: '300000000000003', street: 'طريق الملك فهد', buildingNumber: '1234', city: 'الرياض', postalZone: '12345', countryCode: 'SA' },
  buyer: { registrationName: 'أبو فهد', otherId: { scheme: 'NAT', value: '1010101010' } },
  lines: [{ id: '1', name: 'سمكرة ودهان رفرف', quantity: '1', unitPrice: '650.00', lineExtension: '650.00', taxPercent: '15.00', taxAmount: '97.50', roundingAmount: '747.50' }],
  taxExclusive: '650.00', taxInclusive: '747.50', taxAmount: '97.50', allowanceTotal: '0.00', payableAmount: '747.50',
};

describe('ZATCA Phase 2 — hashing, signing, QR, CSR', () => {
  it('the invoice hash excludes UBLExtensions, the QR reference and any signature', () => {
    const xml = buildInvoiceXml({ ...INVOICE, qrBase64: 'AAA=' });
    const canonical = zatcaCanonicalXml(xml);
    expect(canonical).not.toContain('UBLExtensions');
    expect(canonical).not.toContain('AAA=');            // the QR reference is stripped
    expect(canonical).toContain('<cbc:ID>INV-2026-000001</cbc:ID>');
    expect(canonical).toContain('ICV');                  // ICV and PIH stay inside the hash
    expect(canonical).toContain(GENESIS_PIH);
  });
  it('the hash is stable regardless of the QR, and changes when any signed field changes', () => {
    const a = invoiceHashBase64(buildInvoiceXml({ ...INVOICE, qrBase64: 'AAA=' }));
    const b = invoiceHashBase64(buildInvoiceXml({ ...INVOICE, qrBase64: 'ZZZZ' }));
    expect(a).toBe(b);                                                    // QR is not part of the signed content
    expect(invoiceHashBase64(buildInvoiceXml({ ...INVOICE, payableAmount: '747.51' }))).not.toBe(a);
    expect(invoiceHashBase64(buildInvoiceXml({ ...INVOICE, icv: 2 }))).not.toBe(a);   // ICV is
    expect(Buffer.from(a, 'base64')).toHaveLength(32);                    // SHA-256, base64-encoded
  });
  it('signs with a real secp256k1 CSID and verifies independently', () => {
    const { certPem, keyPem } = issueTestCertificate();
    const xml = buildInvoiceXml(INVOICE);
    const signed = signInvoice({ invoiceXml: xml, privateKeyPem: keyPem, certificatePem: certPem, signingTime: new Date('2026-08-19T11:45:30Z') });
    expect(signed.signedXml).toContain('<ds:SignatureValue>');
    expect(signed.signedXml).toContain('xades:QualifyingProperties');
    expect(Buffer.from(signed.signatureBase64, 'base64')).toHaveLength(64);          // raw r‖s, not DER
    expect(signed.invoiceHashBase64).toBe(invoiceHashBase64(xml));                    // signing does not change the hash
    const v = verifySignedInvoice(signed.signedXml);
    expect(v.valid).toBe(true); expect(v.invoiceHashBase64).toBe(signed.invoiceHashBase64);
  });
  it('rejects a tampered invoice: changing a total after signing breaks verification', () => {
    const { certPem, keyPem } = issueTestCertificate();
    const signed = signInvoice({ invoiceXml: buildInvoiceXml(INVOICE), privateKeyPem: keyPem, certificatePem: certPem });
    const tampered = signed.signedXml.replace('<cbc:PayableAmount currencyID="SAR">747.50</cbc:PayableAmount>', '<cbc:PayableAmount currencyID="SAR">74.75</cbc:PayableAmount>');
    expect(tampered).not.toBe(signed.signedXml);
    const v = verifySignedInvoice(tampered);
    expect(v.valid).toBe(false); expect(v.reason).toMatch(/digest does not match/);
  });
  it('the SignedProperties digest binds the exact certificate (issuer, serial, cert hash)', () => {
    const { certPem, keyPem } = issueTestCertificate();
    const signed = signInvoice({ invoiceXml: buildInvoiceXml(INVOICE), privateKeyPem: keyPem, certificatePem: certPem });
    const cert = readCertificate(certPem);
    expect(signed.signedXml).toContain(cert.digestBase64);
    expect(signed.signedXml).toContain(cert.serialNumber);
    expect(signed.cert.issuerName).toContain('CN=EGS-1');
    expect(cert.digestBase64).toBe(createHash('sha256').update(pemToDer(certPem)).digest('base64'));
  });
  it('builds a Phase-2 QR with tags 1–9 that decodes back to the same values', () => {
    const { certPem, keyPem } = issueTestCertificate();
    const signed = signInvoice({ invoiceXml: buildInvoiceXml(INVOICE), privateKeyPem: keyPem, certificatePem: certPem });
    const cert = readCertificate(certPem);
    const qr = encodeQr({ sellerName: INVOICE.seller.registrationName, vatNumber: '300000000000003', timestamp: '2026-08-19T11:45:30Z', total: '747.50', vat: '97.50', invoiceHash: signed.invoiceHashBase64, signature: signed.signatureBase64, publicKey: publicKeyPoint(cert.publicKeyDer).toString('base64'), certSignature: cert.certSignatureBase64 });
    expect(isPhase2(qr)).toBe(true);
    const d = decodeQr(qr);
    expect(d.fields.sellerName).toBe('ورشة النور للسمكرة');       // Arabic survives the byte-length encoding
    expect(d[6]).toBe(signed.invoiceHashBase64);
    expect(d[7]).toBe(signed.signatureBase64);
    expect(d[9]).toBe(cert.certSignatureBase64);
  });
  it('generates a CSR OpenSSL accepts, with the ZATCA template and EGS attributes', () => {
    const csr = generateCsr({ commonName: 'EGS-2', organizationName: 'وكيل بوش', organizationUnit: 'الصناعية', egsSerialNumber: '1-Sinaaty|2-POS|3-0002', vatNumber: '300000000000043', registeredAddress: 'الرياض', businessCategory: 'Parts', otp: '654321', production: true });
    const text = execFileSync('openssl', ['req', '-in', '-', '-noout', '-text', '-verify'], { input: csr.csrPem }).toString();
    expect(text).toMatch(/verify OK|Certificate request self-signature verify OK/i);
    expect(text).toContain('EGS-2');
    expect(text).toContain('secp256k1');                                   // the curve ZATCA mandates
    expect(text).toContain('1.3.6.1.4.1.311.20.2');                        // certificate template extension
    expect(text).toContain('300000000000043');                             // UID = VAT number
    expect(csrToBase64(csr.csrPem)).toMatch(/^[A-Za-z0-9+/=]+$/);
    // the CSR carries a real public key
    expect(children(parse(pemToDer(csr.csrPem)))).toHaveLength(3);
  });
  it('refuses to build a CSR with an invalid VAT number or invoice-type mask', () => {
    const base = { commonName: 'X', organizationName: 'Y', organizationUnit: 'Z', egsSerialNumber: '1|2|3', registeredAddress: 'R', businessCategory: 'B', otp: '1' };
    expect(() => generateCsr({ ...base, vatNumber: '123' })).toThrow(/vatNumber/);
    expect(() => generateCsr({ ...base, vatNumber: '300000000000003', invoiceTypeMask: '11' })).toThrow(/invoiceTypeMask/);
  });
});

describe('mock CSID issuance (dev only)', () => {
  it('issues a certificate over our CSR key that the signer and verifier both accept', async () => {
    const { issueCertificate } = await import('../x509');
    const csr = generateCsr({ commonName: 'EGS-3', organizationName: 'ورشة', organizationUnit: 'فرع', egsSerialNumber: '1|2|3', vatNumber: '300000000000003', registeredAddress: 'الرياض', businessCategory: 'Auto', otp: '111111' });
    const issued = issueCertificate({ subjectPublicKeySpki: pemToDer(csr.publicKeyPem), commonName: 'EGS-3', organization: 'ورشة' });
    const signed = signInvoice({ invoiceXml: buildInvoiceXml(INVOICE), privateKeyPem: csr.privateKeyPem, certificatePem: issued.certificatePem });
    expect(verifySignedInvoice(signed.signedXml).valid).toBe(true);
    const info = readCertificate(issued.certificatePem);
    expect(info.issuerName).toContain('CN=ZATCA Mock CA');
    expect(publicKeyPoint(info.publicKeyDer).length).toBeGreaterThan(32);
  });
});
