import { createHash } from 'node:crypto';
import { children, parse, type DerNode } from './der';

/** X.509 fields XAdES needs: the issuer DN (RFC 2253 string), the serial number and the certificate digest. */
export interface CertInfo { issuerName: string; serialNumber: string; digestBase64: string; publicKeyDer: Buffer; certSignatureBase64: string }

const OID_NAMES: Record<string, string> = { '2.5.4.3': 'CN', '2.5.4.6': 'C', '2.5.4.7': 'L', '2.5.4.8': 'ST', '2.5.4.10': 'O', '2.5.4.11': 'OU', '0.9.2342.19200300.100.1.25': 'DC', '0.9.2342.19200300.100.1.1': 'UID' };
function oidToDotted(v: Buffer): string {
  const out = [Math.floor(v[0]! / 40), v[0]! % 40]; let acc = 0;
  for (const b of v.subarray(1)) { acc = acc * 128 + (b & 0x7f); if (!(b & 0x80)) { out.push(acc); acc = 0; } }
  return out.join('.');
}
/** RFC 2253: RDNs reversed, `type=value`, comma-separated — the exact form XAdES X509IssuerName expects. */
function dn(node: DerNode): string {
  const rdns = children(node).map((rdn) => children(rdn).map((atv) => { const [t, v] = children(atv); const name = OID_NAMES[oidToDotted(t!.value)] ?? oidToDotted(t!.value); return `${name}=${v!.value.toString('utf8')}`; }).join('+'));
  return rdns.reverse().join(', ');
}
export const pemToDer = (pem: string): Buffer => Buffer.from(pem.replace(/-----(BEGIN|END)[^-]+-----/g, '').replace(/\s+/g, ''), 'base64');
export const derToPem = (der: Buffer, label = 'CERTIFICATE'): string => `-----BEGIN ${label}-----\n${(der.toString('base64').match(/.{1,64}/g) ?? []).join('\n')}\n-----END ${label}-----\n`;

/** Reads a DER/PEM certificate: Certificate ::= SEQUENCE { tbsCertificate, signatureAlgorithm, signatureValue }. */
export function readCertificate(input: Buffer | string): CertInfo {
  const der = typeof input === 'string' ? pemToDer(input) : input;
  const cert = parse(der); const [tbs, , sig] = children(cert);
  const tbsKids = children(tbs!);
  // tbsCertificate ::= [0] version, serialNumber, signature, issuer, validity, subject, subjectPublicKeyInfo, ...
  const explicitVersion = tbsKids[0]!.tag === 0xa0 ? 1 : 0;
  const serial = tbsKids[explicitVersion]!;
  const issuer = tbsKids[explicitVersion + 2]!;
  const spki = tbsKids[explicitVersion + 5]!;
  const serialNumber = BigInt(`0x${serial.value.toString('hex')}`).toString();
  return {
    issuerName: dn(issuer),
    serialNumber,
    digestBase64: createHash('sha256').update(der).digest('base64'),
    publicKeyDer: spki.raw,
    // ZATCA QR tag 9: the CA's signature over the certificate.
    certSignatureBase64: Buffer.from(sig!.value.subarray(1)).toString('base64'),
  };
}
/** Raw EC public key point (BIT STRING contents) — QR tag 8 carries this, not the full SPKI. */
export function publicKeyPoint(spkiDer: Buffer): Buffer { const [, key] = children(parse(spkiDer)); return key!.value.subarray(1); }

// ---------------------------------------------------------------------------------------------
// Certificate issuance — used by the ZATCA **mock** adapter so local/dev signing exercises the real
// crypto path (a genuine CSID-shaped certificate over our CSR public key). Never used against live
// ZATCA: there, the certificate comes from the authority.
// ---------------------------------------------------------------------------------------------
import { createSign, generateKeyPairSync, type KeyObject } from 'node:crypto';
import { bitString, context, integer, oid, seq, tlv, Tag, utf8, set } from './der';

export interface IssuedCertificate { certificatePem: string; caPrivateKeyPem: string }
const utcTime = (d: Date) => tlv(Tag.UTC_TIME, Buffer.from(d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z').slice(2), 'ascii'));
const rdnUtf8 = (typeOid: string, value: string) => set(seq(oid(typeOid), utf8(value)));

/** Issues an ECDSA-SHA256 certificate for `subjectPublicKeySpki`, signed by a freshly generated CA key. */
export function issueCertificate(params: { subjectPublicKeySpki: Buffer; commonName: string; organization: string; serial?: number; days?: number; caCommonName?: string }): IssuedCertificate {
  const { privateKey: caKey } = generateKeyPairSync('ec', { namedCurve: 'secp256k1' });
  const now = new Date(); const notAfter = new Date(now.getTime() + (params.days ?? 365) * 86_400_000);
  const issuer = seq(rdnUtf8('2.5.4.3', params.caCommonName ?? 'ZATCA Mock CA'), rdnUtf8('2.5.4.10', 'Sinaaty Dev'));
  const subject = seq(rdnUtf8('2.5.4.3', params.commonName), rdnUtf8('2.5.4.10', params.organization));
  const tbs = seq(
    context(0, integer(2)),                                   // v3
    integer(params.serial ?? Math.floor(Date.now() / 1000)),
    seq(oid('1.2.840.10045.4.3.2')),                          // ecdsa-with-SHA256
    issuer,
    seq(utcTime(now), utcTime(notAfter)),
    subject,
    params.subjectPublicKeySpki,
  );
  const signature = createSign('SHA256').update(tbs).sign(caKey as KeyObject);
  const cert = seq(tbs, seq(oid('1.2.840.10045.4.3.2')), bitString(signature));
  return { certificatePem: derToPem(cert, 'CERTIFICATE'), caPrivateKeyPem: (caKey as KeyObject).export({ type: 'sec1', format: 'pem' }).toString() };
}
