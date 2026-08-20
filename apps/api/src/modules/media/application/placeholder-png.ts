import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';

/**
 * A real, valid PNG generated on the fly — dev/test storage keeps no bytes (mock-upload discards them),
 * and an app showing broken-image icons is worse than one showing deterministic placeholders. The colour
 * derives from the object key, so different photos are visibly different and the same photo is stable.
 */
export function placeholderPng(objectKey: string, size = 96): Buffer {
  const seed = createHash('sha256').update(objectKey).digest();
  const [r, g, b] = [80 + (seed[0]! % 120), 90 + (seed[1]! % 110), 85 + (seed[2]! % 115)];

  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, crcBuf]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2;                       // 8-bit depth, truecolour

  // Each scanline: filter byte 0 then RGB triples; a lighter diagonal band keeps it from looking broken.
  const rows: Buffer[] = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3);
    for (let x = 0; x < size; x++) {
      const lift = Math.abs(x - y) < size / 8 ? 40 : 0;
      row[1 + x * 3] = Math.min(255, r + lift);
      row[2 + x * 3] = Math.min(255, g + lift);
      row[3 + x * 3] = Math.min(255, b + lift);
    }
    rows.push(row);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
  return t;
})();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff]! ^ (c >>> 8);
  return c ^ 0xffffffff;
}
