import { createHash } from 'node:crypto';
import { canonicalizeNode, parseXml, removeElements } from './c14n';

/**
 * ZATCA invoice hash: SHA-256 over the canonical XML **after** removing the three elements that are not
 * part of the signed content — UBLExtensions (holds the signature itself), the QR
 * AdditionalDocumentReference (contains the hash, so it cannot be inside it), and any ds:Signature.
 * Returned base64: the value that goes into QR tag 6, the PIH of the next invoice, and DigestValue.
 */
export function invoiceHashBase64(invoiceXml: string): string {
  const stripped = zatcaCanonicalXml(invoiceXml);
  return createHash('sha256').update(stripped, 'utf8').digest('base64');
}
export function zatcaCanonicalXml(invoiceXml: string): string {
  const root = parseXml(invoiceXml);
  const cleaned = removeElements(root, (n) => {
    const local = n.name.includes(':') ? n.name.split(':').slice(1).join(':') : n.name;
    if (local === 'UBLExtensions' || local === 'Signature') return true;
    if (local === 'AdditionalDocumentReference') {
      const id = n.children.find((c) => typeof c !== 'string' && (c.name === 'cbc:ID' || c.name === 'ID'));
      const value = id && typeof id !== 'string' ? id.children.find((c) => typeof c === 'string') : undefined;
      return value === 'QR';
    }
    return false;
  });
  return canonicalizeNode(cleaned);
}
/** SHA-256 (hex) of a canonical JSON payload — used for internal integrity fields, not for ZATCA. */
export function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const o = value as Record<string, unknown>;
  return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`).join(',')}}`;
}
export const invoiceHash = (payload: unknown): string => createHash('sha256').update(canonical(payload)).digest('hex');
export const sha256Base64 = (data: string | Buffer): string => createHash('sha256').update(data as never).digest('base64');
