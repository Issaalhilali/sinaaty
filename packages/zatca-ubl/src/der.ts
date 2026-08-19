/**
 * Minimal DER (ASN.1) encoder/decoder — enough to build a PKCS#10 CSR and read an X.509 certificate.
 * Written here rather than pulled from a library because ZATCA needs exact control over the CSR
 * attributes (custom template OID + SAN directoryName), and the certificate fields feed the XAdES
 * SignedProperties (issuer name + serial number must match the certificate byte-for-byte).
 */
export const enum Tag { INTEGER = 0x02, BIT_STRING = 0x03, OCTET_STRING = 0x04, NULL = 0x05, OID = 0x06, UTF8_STRING = 0x0c, PRINTABLE_STRING = 0x13, IA5_STRING = 0x16, UTC_TIME = 0x17, SEQUENCE = 0x30, SET = 0x31 }

/** DER length: short form < 128, else long form with the byte count. */
function len(n: number): Buffer {
  if (n < 0x80) return Buffer.from([n]);
  const bytes: number[] = []; let v = n;
  while (v > 0) { bytes.unshift(v & 0xff); v >>>= 8; }
  return Buffer.from([0x80 | bytes.length, ...bytes]);
}
export function tlv(tag: number, value: Buffer): Buffer { return Buffer.concat([Buffer.from([tag]), len(value.length), value]); }
export const seq = (...parts: Buffer[]) => tlv(Tag.SEQUENCE, Buffer.concat(parts));
export const set = (...parts: Buffer[]) => tlv(Tag.SET, Buffer.concat(parts));
export const utf8 = (s: string) => tlv(Tag.UTF8_STRING, Buffer.from(s, 'utf8'));
export const printable = (s: string) => tlv(Tag.PRINTABLE_STRING, Buffer.from(s, 'ascii'));
export const ia5 = (s: string) => tlv(Tag.IA5_STRING, Buffer.from(s, 'ascii'));
export const nullValue = () => tlv(Tag.NULL, Buffer.alloc(0));
export const context = (n: number, value: Buffer, constructed = true) => tlv((constructed ? 0xa0 : 0x80) | n, value);
/** INTEGER with the DER sign rule (prepend 0x00 when the top bit is set). */
export function integer(value: number | Buffer): Buffer {
  let b = typeof value === 'number' ? Buffer.from(value === 0 ? [0] : numberToBytes(value)) : value;
  if (b.length === 0) b = Buffer.from([0]);
  if (b[0]! & 0x80) b = Buffer.concat([Buffer.from([0]), b]);
  return tlv(Tag.INTEGER, b);
}
function numberToBytes(n: number): number[] { const out: number[] = []; let v = n; while (v > 0) { out.unshift(v & 0xff); v = Math.floor(v / 256); } return out; }
/** BIT STRING with 0 unused bits. */
export const bitString = (value: Buffer) => tlv(Tag.BIT_STRING, Buffer.concat([Buffer.from([0]), value]));
export const octetString = (value: Buffer) => tlv(Tag.OCTET_STRING, value);
/** OID from dotted notation, e.g. "1.2.840.10045.4.3.2". */
export function oid(dotted: string): Buffer {
  const parts = dotted.split('.').map(Number);
  if (parts.length < 2 || parts.some((p) => !Number.isInteger(p) || p < 0)) throw new RangeError(`bad OID: ${dotted}`);
  const body: number[] = [40 * parts[0]! + parts[1]!];
  for (const p of parts.slice(2)) { const stack: number[] = []; let v = p; do { stack.unshift(v & 0x7f); v >>>= 7; } while (v > 0); for (let i = 0; i < stack.length - 1; i++) stack[i]! |= 0x80; body.push(...stack); }
  return tlv(Tag.OID, Buffer.from(body));
}

export interface DerNode { tag: number; header: number; length: number; value: Buffer; raw: Buffer }
/** Single-level parse at an offset (used to walk a certificate). */
export function parse(buf: Buffer, offset = 0): DerNode {
  const tag = buf[offset]!; let i = offset + 1; const first = buf[i]!; let length: number;
  if (first < 0x80) { length = first; i += 1; } else { const n = first & 0x7f; length = 0; for (let k = 0; k < n; k++) length = length * 256 + buf[i + 1 + k]!; i += 1 + n; }
  return { tag, header: i - offset, length, value: buf.subarray(i, i + length), raw: buf.subarray(offset, i + length) };
}
export function children(node: DerNode): DerNode[] { const out: DerNode[] = []; let o = 0; while (o < node.value.length) { const c = parse(node.value, o); out.push(c); o += c.header + c.length; } return out; }
