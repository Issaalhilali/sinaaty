import { createHash } from 'node:crypto';
import type { Invoice } from '../../invoicing/domain/invoice';
import type { WorkOrder } from '../../work-orders/domain/work-order';
import type { Snapshot } from '../../work-orders/domain/snapshot';
import type { NoteEvent, PromissoryNote } from '../domain/note';

/**
 * Enforcement (ناجز) evidence bundle: a manifest + a ZIP (STORE method, no compression — tiny writer, no deps).
 * Files: note.json, note-events.json, dunning.json, work-order.json, signed-version.json (snapshot + sha256),
 * versions.json, inspections.json, media-index.json (object keys, downloaded by ops), invoice.json, README.txt
 */
export interface BundleInput { note: PromissoryNote; parties: { creditorNameAr: string; debtorNameAr: string | null }; events: NoteEvent[]; dunning: Array<{ step: number; channel: string; isFormal: boolean; sentAt: Date }>; workOrder: WorkOrder | null; signedVersion: { version: number; snapshot: Snapshot; sha256: string } | null; versions: Array<{ version: number; sha256: string; signed: boolean; createdAt: Date }>; inspections: unknown[]; media: Array<{ mediaId: string; entityType: string; label: string | null; bucket: string; objectKey: string; mimeType: string }>; invoice: Invoice | null }
export function buildBundle(i: BundleInput) {
  const files: Array<{ name: string; content: string }> = [
    { name: 'README.txt', content: `حزمة تنفيذ السند لأمر ${i.note.number}\nالدائن: ${i.parties.creditorNameAr}\nالمدين: ${i.parties.debtorNameAr ?? '—'}\nالمبلغ المطالب به: ${i.note.outstandingAmount} ر.س\nمرجع نافذ: ${i.note.nafezReference ?? '—'}\nأُنشئت بواسطة صناعية — كل ملف JSON يحمل بصمة SHA-256 في manifest.json\n` },
    { name: 'note.json', content: JSON.stringify(i.note, null, 2) },
    { name: 'note-events.json', content: JSON.stringify(i.events, null, 2) },
    { name: 'dunning.json', content: JSON.stringify(i.dunning, null, 2) },
    { name: 'work-order.json', content: JSON.stringify(i.workOrder, null, 2) },
    { name: 'signed-version.json', content: JSON.stringify(i.signedVersion, null, 2) },
    { name: 'versions.json', content: JSON.stringify(i.versions, null, 2) },
    { name: 'inspections.json', content: JSON.stringify(i.inspections, null, 2) },
    { name: 'media-index.json', content: JSON.stringify(i.media, null, 2) },
    { name: 'invoice.json', content: JSON.stringify(i.invoice, null, 2) },
  ];
  const manifest = { note: i.note.number, generated_at: new Date().toISOString(), files: files.map((f) => ({ name: f.name, sha256: createHash('sha256').update(f.content).digest('hex'), bytes: Buffer.byteLength(f.content) })) };
  files.push({ name: 'manifest.json', content: JSON.stringify(manifest, null, 2) });
  return { manifest, zip: zipStore(files.map((f) => ({ name: f.name, data: Buffer.from(f.content, 'utf8') }))) };
}
// ---- minimal ZIP writer (STORE) ----
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf: Buffer): number { let c = 0xffffffff; for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
export function zipStore(files: Array<{ name: string; data: Buffer }>): Buffer {
  const parts: Buffer[] = []; const central: Buffer[] = []; let offset = 0; const now = new Date();
  const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xffff; const dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xffff;
  for (const f of files) {
    const name = Buffer.from(f.name, 'utf8'); const crc = crc32(f.data);
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(0, 8); local.writeUInt16LE(dosTime, 10); local.writeUInt16LE(dosDate, 12); local.writeUInt32LE(crc, 14); local.writeUInt32LE(f.data.length, 18); local.writeUInt32LE(f.data.length, 22); local.writeUInt16LE(name.length, 26); local.writeUInt16LE(0, 28);
    parts.push(local, name, f.data);
    const cd = Buffer.alloc(46); cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(20, 4); cd.writeUInt16LE(20, 6); cd.writeUInt16LE(0x0800, 8); cd.writeUInt16LE(0, 10); cd.writeUInt16LE(dosTime, 12); cd.writeUInt16LE(dosDate, 14); cd.writeUInt32LE(crc, 16); cd.writeUInt32LE(f.data.length, 20); cd.writeUInt32LE(f.data.length, 24); cd.writeUInt16LE(name.length, 28); cd.writeUInt16LE(0, 30); cd.writeUInt16LE(0, 32); cd.writeUInt16LE(0, 34); cd.writeUInt16LE(0, 36); cd.writeUInt32LE(0, 38); cd.writeUInt32LE(offset, 42);
    central.push(cd, name); offset += local.length + name.length + f.data.length;
  }
  const cdSize = central.reduce((a, b) => a + b.length, 0);
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(0, 4); end.writeUInt16LE(0, 6); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(cdSize, 12); end.writeUInt32LE(offset, 16); end.writeUInt16LE(0, 20);
  return Buffer.concat([...parts, ...central, end]);
}
