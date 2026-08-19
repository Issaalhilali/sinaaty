import { createSign, generateKeyPairSync } from 'node:crypto';
import { bitString, context, integer, oid, printable, seq, set, Tag, tlv, utf8 } from './der';
import { derToPem, pemToDer } from './x509';

/**
 * PKCS#10 CSR for ZATCA CSID onboarding.
 *
 * ZATCA requires: secp256k1 EC key, a specific subject DN, and two attributes —
 *   challengePassword = the OTP from Fatoora, and an extensionRequest carrying
 *   1.3.6.1.4.1.311.20.2 (certificate template name: `TSTZATCA-Code-Signing` in sandbox,
 *   `ZATCA-Code-Signing` in production) plus a subjectAltName **directoryName** holding
 *   SN (EGS serial), UID (VAT number), title (invoice type mask), registeredAddress and businessCategory.
 * Built by hand so those exact attributes and their order are under our control.
 */
export interface CsrInput {
  commonName: string;            // EGS unit common name
  organizationName: string;      // legal name
  organizationUnit: string;      // branch / VAT group
  countryCode?: string;          // SA
  /** 1-SW manufacturer|2-model|3-serial — ZATCA's EGS serial format. */
  egsSerialNumber: string;
  vatNumber: string;             // 15 digits (UID)
  /** 4 flags: standard, simplified, (reserved), (reserved) — e.g. `1100` for both. */
  invoiceTypeMask?: string;
  registeredAddress: string;
  businessCategory: string;
  production?: boolean;
  otp: string;
}
export interface CsrResult { csrPem: string; privateKeyPem: string; publicKeyPem: string }

const OID_CN = '2.5.4.3', OID_C = '2.5.4.6', OID_O = '2.5.4.10', OID_OU = '2.5.4.11';
const OID_SN = '2.5.4.5', OID_UID = '0.9.2342.19200300.100.1.1', OID_TITLE = '2.5.4.12', OID_REG_ADDR = '2.5.4.26', OID_BUSINESS_CATEGORY = '2.5.4.15';
const OID_CHALLENGE_PASSWORD = '1.2.840.113549.1.9.7', OID_EXTENSION_REQUEST = '1.2.840.113549.1.9.14';
const OID_TEMPLATE = '1.3.6.1.4.1.311.20.2', OID_SAN = '2.5.29.17';

const rdn = (typeOid: string, value: string, printableStr = false) => set(seq(oid(typeOid), printableStr ? printable(value) : utf8(value)));

export function generateCsr(input: CsrInput): CsrResult {
  if (!/^3\d{13}3$/.test(input.vatNumber)) throw new RangeError('vatNumber must be 15 digits starting and ending with 3');
  if (!/^\d{4}$/.test(input.invoiceTypeMask ?? '1100')) throw new RangeError('invoiceTypeMask must be 4 digits (e.g. 1100)');
  // ZATCA mandates secp256k1 — the same curve Bitcoin uses; Node supports it natively.
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'secp256k1' });
  const privateKeyPem = privateKey.export({ type: 'sec1', format: 'pem' }).toString();
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const spki = pemToDer(publicKeyPem);

  const subject = seq(rdn(OID_C, input.countryCode ?? 'SA', true), rdn(OID_OU, input.organizationUnit), rdn(OID_O, input.organizationName), rdn(OID_CN, input.commonName));
  // SAN directoryName carrying the ZATCA EGS attributes.
  const sanDirectory = context(4, seq(rdn(OID_SN, input.egsSerialNumber), rdn(OID_UID, input.vatNumber), rdn(OID_TITLE, input.invoiceTypeMask ?? '1100'), rdn(OID_REG_ADDR, input.registeredAddress), rdn(OID_BUSINESS_CATEGORY, input.businessCategory)));
  const extensions = seq(
    seq(oid(OID_TEMPLATE), tlv(Tag.OCTET_STRING, utf8(input.production ? 'ZATCA-Code-Signing' : 'TSTZATCA-Code-Signing'))),
    seq(oid(OID_SAN), tlv(Tag.OCTET_STRING, seq(sanDirectory))),
  );
  const attributes = context(0,
    Buffer.concat([
      seq(oid(OID_CHALLENGE_PASSWORD), set(utf8(input.otp))),
      seq(oid(OID_EXTENSION_REQUEST), set(extensions)),
    ]),
  );
  const certificationRequestInfo = seq(integer(0), subject, spki, attributes);
  const signature = createSign('SHA256').update(certificationRequestInfo).sign(privateKey);
  const csr = seq(certificationRequestInfo, seq(oid('1.2.840.10045.4.3.2')), bitString(signature)); // ecdsa-with-SHA256
  return { csrPem: derToPem(csr, 'CERTIFICATE REQUEST'), privateKeyPem, publicKeyPem };
}
/** ZATCA sends the CSR base64 (no PEM armour) in the compliance request body. */
export const csrToBase64 = (csrPem: string): string => pemToDer(csrPem).toString('base64');
