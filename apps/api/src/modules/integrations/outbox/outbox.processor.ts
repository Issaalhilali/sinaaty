import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { AppConfig } from '../../../config';
import { MetricsService } from '../../../common/metrics/metrics.service';
import { PrismaService } from '../../../prisma';
import { OutboxHandlerRegistry, type OutboxEnvelope } from './outbox-handler.registry';

const LEASE_SECONDS = 120; const MAX_ATTEMPTS = 6; const backoffMs = (attempt: number) => Math.min(60 * 60_000, 5_000 * 2 ** attempt);
/**
 * Transactional-outbox dispatcher (in-process; BullMQ workers can replace the loop without changing handlers).
 * Every (outbox row × handler) has an integration_requests row keyed `outbox:<id>:<handler>` that tracks
 * attempts / next_attempt_at / dead_letter. The outbox row is marked published when every handler
 * succeeded (or dead-lettered). Handlers must be idempotent.
 */
@Injectable()
export class OutboxProcessor {
  private readonly log = new Logger(OutboxProcessor.name); private running = false;
  constructor(private readonly prisma: PrismaService, private readonly registry: OutboxHandlerRegistry, private readonly config: AppConfig, private readonly metrics: MetricsService) {}
  // Safe on every replica: rows are claimed with SKIP LOCKED. And the tick drains until the backlog is
  // EMPTY, not one batch: a single 50-rows-per-10s pass caps consumption at 300 events/min, and the
  // 1-hour soak proved intake outruns that ~4× (pending ratcheted +1270/min, linearly, from minute one).
  // The loop exits when a pass claims nothing; `running` already prevents overlap.
  @Interval(10_000) async tick() {
    if (!this.config.get('JOBS_ENABLED')) return;
    let r; do { r = await this.drain(200); } while (r.processed > 0);
  }

  async drain(limit = 50): Promise<{ processed: number; succeeded: number; failed: number; deadLettered: number }> {
    if (this.running) return { processed: 0, succeeded: 0, failed: 0, deadLettered: 0 }; this.running = true;
    const stats = { processed: 0, succeeded: 0, failed: 0, deadLettered: 0 };
    try {
      // Claim rows atomically: with several API replicas every instance used to poll the same rows and could
      // call a provider twice before either recorded its attempt. SKIP LOCKED hands each row to exactly one
      // instance, and the lease expires so a crashed instance does not park events forever.
      const rows = await this.prisma.$queryRaw<Array<{ id: bigint; event_type: string; aggregate_type: string; aggregate_id: string; payload: unknown; created_at: Date }>>`
        UPDATE outbox SET locked_until = now() + make_interval(secs => ${LEASE_SECONDS})
        WHERE id IN (
          SELECT id FROM outbox
          WHERE published_at IS NULL AND (locked_until IS NULL OR locked_until < now())
          ORDER BY id ASC LIMIT ${limit} FOR UPDATE SKIP LOCKED
        )
        RETURNING id, event_type, aggregate_type, aggregate_id, payload, created_at`;
      for (const row of rows) {
        const ev: OutboxEnvelope = { id: row.id, eventType: row.event_type, aggregateType: row.aggregate_type, aggregateId: row.aggregate_id, payload: (row.payload ?? {}) as Record<string, unknown>, createdAt: row.created_at };
        const handlers = this.registry.for(ev.eventType);
        let allDone = true; stats.processed++;
        for (const h of handlers) {
          const key = `outbox:${row.id}:${h.name}`;
          const req = await this.prisma.integrationRequest.findUnique({ where: { idempotencyKey: key } });
          if (req?.status === 'succeeded' || req?.status === 'dead_letter') continue;
          if (req?.nextAttemptAt && req.nextAttemptAt > new Date()) { allDone = false; continue; }
          const attempts = (req?.attempts ?? 0) + 1; const started = Date.now();
          try {
            await h.fn(ev);
            await this.prisma.integrationRequest.upsert({ where: { idempotencyKey: key }, update: { status: 'succeeded', attempts, latencyMs: Date.now() - started, errorMessage: null, nextAttemptAt: null }, create: { provider: 'nafez', operation: h.name.slice(0, 60), idempotencyKey: key, refTable: 'outbox', status: 'succeeded', attempts, latencyMs: Date.now() - started, requestPayload: { event_type: ev.eventType, aggregate_id: ev.aggregateId } } });
            stats.succeeded++; this.metrics.recordIntegration('nafez', h.name, 'succeeded');
          } catch (e) {
            const dead = attempts >= MAX_ATTEMPTS; allDone = allDone && dead; if (!dead) allDone = false;
            const msg = (e as Error).message?.slice(0, 500) ?? 'error';
            await this.prisma.integrationRequest.upsert({ where: { idempotencyKey: key }, update: { status: dead ? 'dead_letter' : 'failed', attempts, errorMessage: msg, nextAttemptAt: dead ? null : new Date(Date.now() + backoffMs(attempts)) }, create: { provider: 'nafez', operation: h.name.slice(0, 60), idempotencyKey: key, refTable: 'outbox', status: dead ? 'dead_letter' : 'failed', attempts, errorMessage: msg, nextAttemptAt: dead ? null : new Date(Date.now() + backoffMs(attempts)), requestPayload: { event_type: ev.eventType, aggregate_id: ev.aggregateId } } });
            this.metrics.recordIntegration('nafez', h.name, dead ? 'dead_letter' : 'failed');
            if (dead) { stats.deadLettered++; this.log.error(`outbox ${row.id} ${ev.eventType} → ${h.name} dead-lettered: ${msg}`); } else { stats.failed++; this.log.warn(`outbox ${row.id} ${ev.eventType} → ${h.name} failed (attempt ${attempts}): ${msg}`); }
          }
        }
        // Release the claim either way: published when every handler finished, otherwise free for the next
        // pass (a still-held lease would delay the retry by up to LEASE_SECONDS).
        await this.prisma.outbox.update({ where: { id: row.id }, data: { publishedAt: allDone ? new Date() : null, lockedUntil: null } });
      }
    } finally { this.running = false; }
    return stats;
  }
  /** Admin: retry a dead-lettered handler now. */
  async retry(idempotencyKey: string) { await this.prisma.integrationRequest.update({ where: { idempotencyKey }, data: { status: 'pending', nextAttemptAt: null, attempts: 0 } }); const id = Number(idempotencyKey.split(':')[1]); await this.prisma.outbox.update({ where: { id }, data: { publishedAt: null } }); return this.drain(10); }
}
