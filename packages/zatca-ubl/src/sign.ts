import { createHash, createPrivateKey, createSign, createVerify, type KeyObject } from 'node:crypto';
import { canonicalizeNode, findElement, parseXml } from './c14n';
import { pemToDer, readCertificate, type CertInfo } from './x509';
import { invoiceHashBase64 } from './hash';

/**
 * XAdES-B-B enveloped signature for ZATCA Phase 2.
 *
 * Chain of digests (each one must be computed over *canonical* bytes, or ZATCA rejects the invoice):
 *   1. invoice digest  = SHA-256(canonical invoice without UBLExtensions/QR/Signature)   → ds:Reference URI=""
 *   2. properties digest = SHA-256(canonical xades:SignedProperties)                      → ds:Reference URI="#…SignedProperties"
 *   3. SignatureValue  = ECDSA-SHA256(canonical ds:SignedInfo) with the CSID private key
 *
 * The signing certificate digest, issuer name and serial number are taken from the certificate itself,
 * so a mismatched cert/key pair fails verification instead of producing a silently invalid invoice.
 */
export interface SignInput { invoiceXml: string; privateKeyPem: string; certificatePem: string; signingTime?: Date }
export interface SignResult { signedXml: string; invoiceHashBase64: string; signatureBase64: string; signedPropertiesDigest: string; signingTime: string; cert: CertInfo }

const SIG_ID = 'urn:oasis:names:specification:ubl:signature:Invoice';
const SP_ID = 'xadesSignedProperties';

/** ZATCA requires the raw (r‖s) signature, not the DER wrapper Node produces. */
function derToRawEcdsa(der: Buffer, size = 32): Buffer {
  if (der[0] !== 0x30) throw new RangeError('not a DER ECDSA signature');
  let i = 2; if (der[1]! & 0x80) i = 2 + (der[1]! & 0x7f);
  const readInt = (): Buffer => { if (der[i] !== 0x02) throw new RangeError('bad DER integer'); const l = der[i + 1]!; let v = der.subarray(i + 2, i + 2 + l); i += 2 + l; while (v.length > size && v[0] === 0) v = v.subarray(1); return Buffer.concat([Buffer.alloc(Math.max(0, size - v.length)), v]); };
  return Buffer.concat([readInt(), readInt()]);
}

export function signInvoice(input: SignInput): SignResult {
  const cert = readCertificate(input.certificatePem);
  const certDer = pemToDer(input.certificatePem);
  const key: KeyObject = createPrivateKey(input.privateKeyPem);
  const docDigest = invoiceHashBase64(input.invoiceXml);
  const signingTime = (input.signingTime ?? new Date()).toISOString().replace(/\.\d{3}Z$/, 'Z');

  // --- xades:SignedProperties (digested as canonical bytes, then referenced from SignedInfo)
  const signedProperties = `<xades:SignedProperties xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" Id="${SP_ID}"><xades:SignedSignatureProperties><xades:SigningTime>${signingTime}</xades:SigningTime><xades:SigningCertificate><xades:Cert><xades:CertDigest><ds:DigestMethod xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"></ds:DigestMethod><ds:DigestValue xmlns:ds="http://www.w3.org/2000/09/xmldsig#">${cert.digestBase64}</ds:DigestValue></xades:CertDigest><xades:IssuerSerial><ds:X509IssuerName xmlns:ds="http://www.w3.org/2000/09/xmldsig#">${cert.issuerName}</ds:X509IssuerName><ds:X509SerialNumber xmlns:ds="http://www.w3.org/2000/09/xmldsig#">${cert.serialNumber}</ds:X509SerialNumber></xades:IssuerSerial></xades:Cert></xades:SigningCertificate></xades:SignedSignatureProperties></xades:SignedProperties>`;
  const spDigest = createHash('sha256').update(canonicalizeNode(parseXml(signedProperties)), 'utf8').digest('base64');

  // --- ds:SignedInfo (what is actually signed)
  const signedInfo = `<ds:SignedInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#"><ds:CanonicalizationMethod Algorithm="http://www.w3.org/2006/12/xml-c14n11"></ds:CanonicalizationMethod><ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha256"></ds:SignatureMethod><ds:Reference Id="invoiceSignedData" URI=""><ds:Transforms><ds:Transform Algorithm="http://www.w3.org/TR/1999/REC-xpath-19991116"><ds:XPath>not(//ancestor-or-self::ext:UBLExtensions)</ds:XPath></ds:Transform><ds:Transform Algorithm="http://www.w3.org/TR/1999/REC-xpath-19991116"><ds:XPath>not(//ancestor-or-self::cac:Signature)</ds:XPath></ds:Transform><ds:Transform Algorithm="http://www.w3.org/TR/1999/REC-xpath-19991116"><ds:XPath>not(//ancestor-or-self::cac:AdditionalDocumentReference[cbc:ID='QR'])</ds:XPath></ds:Transform><ds:Transform Algorithm="http://www.w3.org/2006/12/xml-c14n11"></ds:Transform></ds:Transforms><ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"></ds:DigestMethod><ds:DigestValue>${docDigest}</ds:DigestValue></ds:Reference><ds:Reference Type="http://www.w3.org/2000/09/xmldsig#SignatureProperties" URI="#${SP_ID}"><ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"></ds:DigestMethod><ds:DigestValue>${spDigest}</ds:DigestValue></ds:Reference></ds:SignedInfo>`;
  const canonicalSignedInfo = canonicalizeNode(parseXml(signedInfo));
  const signatureDer = createSign('SHA256').update(canonicalSignedInfo, 'utf8').sign(key);
  const signatureBase64 = derToRawEcdsa(signatureDer).toString('base64');

  const ublExtension = `<ext:UBLExtension><ext:ExtensionURI>urn:oasis:names:specification:ubl:dsig:enveloped:xades</ext:ExtensionURI><ext:ExtensionContent><sig:UBLDocumentSignatures xmlns:sig="urn:oasis:names:specification:ubl:schema:xsd:CommonSignatureComponents-2" xmlns:sac="urn:oasis:names:specification:ubl:schema:xsd:SignatureAggregateComponents-2" xmlns:sbc="urn:oasis:names:specification:ubl:schema:xsd:SignatureBasicComponents-2"><sac:SignatureInformation><cbc:ID>urn:oasis:names:specification:ubl:signature:1</cbc:ID><sbc:ReferencedSignatureID>${SIG_ID}</sbc:ReferencedSignatureID><ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="signature">${signedInfo.replace(' xmlns:ds="http://www.w3.org/2000/09/xmldsig#"', '')}<ds:SignatureValue>${signatureBase64}</ds:SignatureValue><ds:KeyInfo><ds:X509Data><ds:X509Certificate>${certDer.toString('base64')}</ds:X509Certificate></ds:X509Data></ds:KeyInfo><ds:Object><xades:QualifyingProperties xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" Target="signature">${signedProperties.replace(' xmlns:xades="http://uri.etsi.org/01903/v1.3.2#"', '').replace(/ xmlns:ds="http:\/\/www\.w3\.org\/2000\/09\/xmldsig#"/g, '')}</xades:QualifyingProperties></ds:Object></ds:Signature></sac:SignatureInformation></sig:UBLDocumentSignatures></ext:ExtensionContent></ext:UBLExtension>`;
  const signedXml = input.invoiceXml.replace('<ext:UBLExtensions></ext:UBLExtensions>', `<ext:UBLExtensions>${ublExtension}</ext:UBLExtensions>`);
  if (!signedXml.includes('ext:UBLExtension>')) throw new Error('invoice XML has no <ext:UBLExtensions> placeholder to sign into');
  return { signedXml, invoiceHashBase64: docDigest, signatureBase64, signedPropertiesDigest: spDigest, signingTime, cert };
}

/** Independent verification: recompute both digests from the signed document and check the ECDSA signature. */
export function verifySignedInvoice(signedXml: string): { valid: boolean; reason?: string; invoiceHashBase64?: string } {
  const root = parseXml(signedXml);
  const sig = findElement(root, 'Signature'); if (!sig) return { valid: false, reason: 'no ds:Signature' };
  const si = findElement(sig, 'SignedInfo'); if (!si) return { valid: false, reason: 'no ds:SignedInfo' };
  const text = (n: ReturnType<typeof findElement>, local: string): string | null => { const f = n ? findElement(n, local) : null; const t = f?.children.find((c) => typeof c === 'string'); return typeof t === 'string' ? t : null; };
  const certB64 = text(sig, 'X509Certificate'); const sigValue = text(sig, 'SignatureValue');
  if (!certB64 || !sigValue) return { valid: false, reason: 'missing certificate or signature value' };
  const recomputed = invoiceHashBase64(signedXml);
  const refDigest = (findElement(si, 'Reference') && text(findElement(si, 'Reference'), 'DigestValue')) ?? null;
  if (refDigest !== recomputed) return { valid: false, reason: 'invoice digest does not match the signed document' };

  // What was signed is the SignedInfo subtree *with* its own namespace declaration (ZATCA/XMLDSig convention);
  // inside the document that declaration sits on ds:Signature, so it is restored before canonicalizing.
  const siWithNs = si.attrs.some((a) => a.name === 'xmlns:ds') ? si : { ...si, attrs: [{ name: 'xmlns:ds', value: 'http://www.w3.org/2000/09/xmldsig#' }, ...si.attrs] };
  const canonicalSignedInfo = canonicalizeNode(siWithNs);
  const raw = Buffer.from(sigValue, 'base64'); const half = raw.length / 2;
  const toDerInt = (b: Buffer) => { let v = b; while (v.length > 1 && v[0] === 0) v = v.subarray(1); const pad = v[0]! & 0x80 ? Buffer.concat([Buffer.from([0]), v]) : v; return Buffer.concat([Buffer.from([0x02, pad.length]), pad]); };
  const derSig = (() => { const r = toDerInt(raw.subarray(0, half)); const s = toDerInt(raw.subarray(half)); return Buffer.concat([Buffer.from([0x30, r.length + s.length]), r, s]); })();
  const pem = `-----BEGIN CERTIFICATE-----\n${(certB64.match(/.{1,64}/g) ?? []).join('\n')}\n-----END CERTIFICATE-----\n`;
  const ok = createVerify('SHA256').update(canonicalSignedInfo, 'utf8').verify(pem, derSig);
  return ok ? { valid: true, invoiceHashBase64: recomputed } : { valid: false, reason: 'ECDSA signature does not verify against the embedded certificate' };
}
