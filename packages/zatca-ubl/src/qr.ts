/**
 * ZATCA Phase 1 QR: TLV (tag-length-value) of 5 fields, base64-encoded.
 *   1 seller name · 2 VAT registration number · 3 timestamp (ISO 8601) · 4 invoice total (with VAT) · 5 VAT total
 * Phase 2 adds tags 6–9 (invoice hash, ECDSA signature, public key, certificate signature) — see Step 20.
 * Length byte = UTF-8 byte length (Arabic names count bytes, not characters).
 */
export interface QrPhase1 { sellerName: string; vatNumber: string; timestamp: string; total: string; vat: string }
export interface QrPhase2 extends QrPhase1 { invoiceHash?: string; signature?: string; publicKey?: string; certSignature?: string }

const enc = new TextEncoder(); const dec = new TextDecoder();
function tlv(tag: number, value: string | Uint8Array): Uint8Array {
  const v = typeof value === 'string' ? enc.encode(value) : value;
  if (v.length > 255) throw new RangeError(`TLV value for tag ${tag} exceeds 255 bytes`);
  const out = new Uint8Array(2 + v.length); out[0] = tag; out[1] = v.length; out.set(v, 2); return out;
}
function concat(parts: Uint8Array[]): Uint8Array { const n = parts.reduce((a, p) => a + p.length, 0); const out = new Uint8Array(n); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; }
const b64 = (u: Uint8Array) => Buffer.from(u).toString('base64');
const unb64 = (s: string) => new Uint8Array(Buffer.from(s, 'base64'));

export function validateQrInput(q: QrPhase1): void {
  if (!q.sellerName.trim()) throw new RangeError('sellerName required');
  if (!/^3\d{13}3$/.test(q.vatNumber)) throw new RangeError('vatNumber must be 15 digits starting and ending with 3');
  if (Number.isNaN(Date.parse(q.timestamp))) throw new RangeError('timestamp must be ISO 8601');
  if (!/^\d+\.\d{2}$/.test(q.total) || !/^\d+\.\d{2}$/.test(q.vat)) throw new RangeError('total/vat must be strings with 2 decimals');
}
export function encodeQr(q: QrPhase2): string {
  validateQrInput(q);
  const parts = [tlv(1, q.sellerName), tlv(2, q.vatNumber), tlv(3, q.timestamp), tlv(4, q.total), tlv(5, q.vat)];
  if (q.invoiceHash) parts.push(tlv(6, q.invoiceHash));
  if (q.signature) parts.push(tlv(7, unb64(q.signature)));
  if (q.publicKey) parts.push(tlv(8, unb64(q.publicKey)));
  if (q.certSignature) parts.push(tlv(9, unb64(q.certSignature)));
  return b64(concat(parts));
}
export function decodeQr(base64: string): Record<number, string> & { fields: QrPhase1 } {
  const u = unb64(base64); const out: Record<number, string> = {}; let i = 0;
  while (i < u.length) { const tag = u[i]!; const len = u[i + 1]!; const v = u.subarray(i + 2, i + 2 + len); if (v.length !== len) throw new RangeError('truncated TLV'); out[tag] = tag >= 7 ? b64(v) : dec.decode(v); i += 2 + len; }
  for (const t of [1, 2, 3, 4, 5]) if (out[t] === undefined) throw new RangeError(`missing TLV tag ${t}`);
  return Object.assign(out, { fields: { sellerName: out[1]!, vatNumber: out[2]!, timestamp: out[3]!, total: out[4]!, vat: out[5]! } });
}
