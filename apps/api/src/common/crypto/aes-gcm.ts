import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * AES-256-GCM for PII at rest (national_id, iban, CSIDs). Output layout: [1B version][12B iv][16B tag][ciphertext].
 * Key rotation: bump version and keep old keys readable. Never log inputs.
 */
const VERSION = 1;
const IV_LEN = 12;
const TAG_LEN = 16;

export function parseKey(base64: string): Buffer {
  const key = Buffer.from(base64, 'base64');
  if (key.length !== 32) throw new Error('PII_ENC_KEY must decode to 32 bytes');
  return key;
}

export function encrypt(plaintext: string, key: Buffer, aad?: string): Buffer {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  if (aad) cipher.setAAD(Buffer.from(aad, 'utf8'));
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return Buffer.concat([Buffer.from([VERSION]), iv, cipher.getAuthTag(), ct]);
}

export function decrypt(payload: Buffer, key: Buffer, aad?: string): string {
  if (payload.length < 1 + IV_LEN + TAG_LEN) throw new Error('ciphertext too short');
  const version = payload[0];
  if (version !== VERSION) throw new Error(`unsupported ciphertext version ${version}`);
  const iv = payload.subarray(1, 1 + IV_LEN);
  const tag = payload.subarray(1 + IV_LEN, 1 + IV_LEN + TAG_LEN);
  const ct = payload.subarray(1 + IV_LEN + TAG_LEN);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  if (aad) decipher.setAAD(Buffer.from(aad, 'utf8'));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}

/** Deterministic lookup hash (e.g. users.national_id_hash): sha256(key-derived salt ‖ value). */
export function lookupHash(value: string, key: Buffer): string {
  const salt = createHash('sha256').update(key).update('lookup-salt').digest();
  return createHash('sha256').update(salt).update(value.trim()).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a), bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}
