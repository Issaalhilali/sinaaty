import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { TxHandle } from '../ports/unit-of-work.port';
import { computeAuditHash } from './audit-hash';
import { redactPii } from '../crypto/redaction';

export type Tx = TxHandle | Prisma.TransactionClient;
const unwrap = (tx: Tx): Prisma.TransactionClient => tx as Prisma.TransactionClient;

export interface AuditEvent {
  action: string; // work_order.approve, invoice.issue, pn.close ...
  entityType: string;
  entityId?: string | null;
  actorUserId?: string | null;
  actorType?: 'user' | 'system' | 'webhook' | 'admin';
  orgId?: string | null;
  before?: unknown;
  after?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

/**
 * Appends to audit_log inside the caller's transaction, chaining hashes.
 * Serializes writers with an advisory lock so the chain never forks.
 */
@Injectable()
export class AuditLogWriter {
  private static readonly LOCK_KEY = 7_432_001; // arbitrary constant, app-wide

  async write(handle: Tx, ev: AuditEvent): Promise<{ id: bigint; hash: string }> {
    const tx = unwrap(handle);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${AuditLogWriter.LOCK_KEY})`;
    const last = await tx.$queryRaw<Array<{ hash: string }>>`SELECT hash FROM audit_log ORDER BY id DESC LIMIT 1`;
    const prevHash = last[0]?.hash ?? null;
    const occurredAt = new Date();
    const row = {
      occurredAt: occurredAt.toISOString(),
      actorUserId: ev.actorUserId ?? null,
      actorType: ev.actorType ?? 'user',
      orgId: ev.orgId ?? null,
      action: ev.action,
      entityType: ev.entityType,
      entityId: ev.entityId ?? null,
      before: redactPii(ev.before ?? null),
      after: redactPii(ev.after ?? null),
      requestId: ev.requestId ?? null,
    };
    const hash = computeAuditHash(prevHash, row);
    const inserted = await tx.$queryRaw<Array<{ id: bigint }>>`
      INSERT INTO audit_log (occurred_at, actor_user_id, actor_type, org_id, action, entity_type, entity_id, before, after, ip_address, user_agent, request_id, prev_hash, hash)
      VALUES (${occurredAt}, ${row.actorUserId}::uuid, ${row.actorType}, ${row.orgId}::uuid, ${row.action}, ${row.entityType}, ${row.entityId}::uuid,
              ${JSON.stringify(row.before)}::jsonb, ${JSON.stringify(row.after)}::jsonb, ${ev.ipAddress ?? null}::inet, ${ev.userAgent ?? null}, ${row.requestId}, ${prevHash}, ${hash})
      RETURNING id`;
    return { id: inserted[0]!.id, hash };
  }
}
