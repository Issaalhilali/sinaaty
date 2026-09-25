import { Injectable, Logger } from '@nestjs/common';
import { hostname } from 'node:os';
import { PrismaService } from '../../prisma';

/**
 * Cluster-wide "run this once" lease.
 *
 * Scheduled work (escrow auto-release, payouts, bidding expiry, part-order auto-confirm) used to run in **every**
 * API replica: with two pods each job fired twice per tick against the same rows. The domain services are
 * idempotent, so nothing was corrupted, but duplicate provider calls and doubled work are real.
 *
 * A lease row is used rather than `pg_advisory_lock` because Prisma pools connections: a session-scoped advisory
 * lock taken on one connection cannot be released reliably from another, so it leaks until the pool recycles it
 * (proven by test). The lease also self-heals — if the holder crashes, it expires.
 */
@Injectable()
export class LeaderLock {
  private readonly log = new Logger('LeaderLock');
  private readonly holder = `${hostname()}:${process.pid}`;
  constructor(private readonly prisma: PrismaService) {}

  /** Runs `fn` only if this instance wins the lease; returns null when another instance already holds it. */
  async runExclusive<T>(name: string, fn: () => Promise<T>, leaseSeconds = 300): Promise<T | null> {
    const acquired = await this.prisma.$queryRaw<Array<{ name: string }>>`
      INSERT INTO job_locks (name, locked_until, holder, updated_at)
      VALUES (${name}, now() + make_interval(secs => ${leaseSeconds}), ${this.holder}, now())
      ON CONFLICT (name) DO UPDATE
        SET locked_until = now() + make_interval(secs => ${leaseSeconds}), holder = ${this.holder}, updated_at = now()
        WHERE job_locks.locked_until < now()
      RETURNING name`;
    if (!acquired.length) return null;
    try { return await fn(); }
    finally {
      // Release immediately so the next tick is not delayed by the remaining lease.
      await this.prisma.$executeRaw`UPDATE job_locks SET locked_until = now(), updated_at = now() WHERE name = ${name} AND holder = ${this.holder}`
        .catch((e: Error) => this.log.warn(`could not release ${name}: ${e.message}`));
    }
  }
}
