import { randomBytes } from 'node:crypto';
import { decrypt, encrypt, lookupHash, parseKey } from '../crypto/aes-gcm';
import { redactPii, redactString } from '../crypto/redaction';
import { canonicalize, computeAuditHash, GENESIS_HASH, verifyChain } from '../audit/audit-hash';

describe('AES-256-GCM', () => {
  const key = randomBytes(32);
  it('round-trips and produces distinct ciphertexts (random IV)', () => {
    const c1 = encrypt('1010101010', key), c2 = encrypt('1010101010', key);
    expect(c1.equals(c2)).toBe(false);
    expect(decrypt(c1, key)).toBe('1010101010');
  });
  it('fails on tamper, wrong key, wrong AAD', () => {
    const c = encrypt('SA0380000000608010167519', key, 'org:1');
    const tampered = Buffer.from(c); tampered[tampered.length - 1] = (tampered[tampered.length - 1] ?? 0) ^ 0xff;
    expect(() => decrypt(tampered, key, 'org:1')).toThrow();
    expect(() => decrypt(c, randomBytes(32), 'org:1')).toThrow();
    expect(() => decrypt(c, key, 'org:2')).toThrow();
  });
  it('lookupHash is deterministic and key-bound', () => {
    expect(lookupHash('1010101010', key)).toBe(lookupHash(' 1010101010 ', key));
    expect(lookupHash('1010101010', key)).not.toBe(lookupHash('1010101010', randomBytes(32)));
    expect(() => parseKey('short')).toThrow();
  });
});

describe('PII redaction', () => {
  it('masks sensitive keys and value shapes', () => {
    const out = redactPii({ national_id: '1010101010', note: 'IBAN SA0380000000608010167519 phone +966501234567 id 2233445566', nested: { iban: 'x', ok: 'keep' } });
    expect(out.national_id).toBe('[REDACTED]');
    expect(out.note).toBe('IBAN SA**[IBAN] phone +9665******* id **********');
    expect(out.nested).toEqual({ iban: '[REDACTED]', ok: 'keep' });
    expect(redactString('nothing here 12345')).toBe('nothing here 12345');
  });
});

describe('audit hash chain', () => {
  const row = (i: number): { occurredAt: string; actorUserId: null; actorType: string; orgId: null; action: string; entityType: string; entityId: null; before: null; after: unknown; requestId: null } => ({ occurredAt: `2026-08-17T10:00:0${i}.000Z`, actorUserId: null, actorType: 'system', orgId: null, action: `a${i}`, entityType: 'x', entityId: null, before: null, after: { i, z: 1, a: 2 }, requestId: null });
  it('canonicalizes with sorted keys', () => {
    expect(canonicalize({ b: 1, a: [{ d: 1, c: 2 }] })).toBe('{"a":[{"c":2,"d":1}],"b":1}');
  });
  it('links and verifies; detects tampering', () => {
    const rows: Array<ReturnType<typeof row> & { prevHash: string | null; hash: string }> = [];
    let prev: string | null = null;
    for (let i = 0; i < 5; i++) {
      const r = row(i); const hash = computeAuditHash(prev, r);
      rows.push({ ...r, prevHash: prev, hash }); prev = hash;
    }
    expect(rows[0]!.prevHash).toBeNull();
    expect(computeAuditHash(null, row(0))).toBe(computeAuditHash(GENESIS_HASH, row(0)));
    expect(verifyChain(rows)).toBe(-1);
    rows[2]!.after = { i: 99 };
    expect(verifyChain(rows)).toBe(2);
  });
});
