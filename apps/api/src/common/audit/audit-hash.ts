import { createHash } from 'node:crypto';

/** Canonical JSON (sorted keys) so hashes are reproducible across processes. */
export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj).sort().map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(',')}}`;
}

export interface AuditRowForHash {
  occurredAt: string; // ISO
  actorUserId: string | null;
  actorType: string;
  orgId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
  requestId: string | null;
}

/** hash = sha256(prev_hash ‖ canonical(row)). Genesis prev_hash = 64 zeros. */
export const GENESIS_HASH = '0'.repeat(64);
export function computeAuditHash(prevHash: string | null, row: AuditRowForHash): string {
  return createHash('sha256').update(prevHash ?? GENESIS_HASH).update(canonicalize(row)).digest('hex');
}

/** Verifies a chain slice; returns index of first broken link or -1. */
export function verifyChain(rows: Array<AuditRowForHash & { prevHash: string | null; hash: string }>): number {
  let prev: string | null = rows[0]?.prevHash ?? null;
  for (let i = 0; i < rows.length; i++) {
    const { prevHash, hash, ...row } = rows[i]!;
    if ((prevHash ?? GENESIS_HASH) !== (prev ?? GENESIS_HASH)) return i;
    if (computeAuditHash(prevHash, row) !== hash) return i;
    prev = hash;
  }
  return -1;
}
