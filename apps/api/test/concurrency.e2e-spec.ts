import { Test } from '@nestjs/testing';
import { type INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma';
import { OutboxProcessor } from '../src/modules/integrations/outbox/outbox.processor';
import { OutboxHandlerRegistry } from '../src/modules/integrations/outbox/outbox-handler.registry';
import { OutboxWriter } from '../src/common/outbox';
import { LeaderLock } from '../src/common/locks';
import { UNIT_OF_WORK, type UnitOfWork } from '../src/common/ports/unit-of-work.port';

/**
 * Multi-replica safety. Helm runs two API pods, so both the outbox dispatcher and the scheduled jobs execute
 * everywhere at once. These tests reproduce that by running two dispatchers/two lock holders concurrently.
 */
describe('Multi-replica safety (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService; let registry: OutboxHandlerRegistry; let outbox: OutboxWriter; let uow: UnitOfWork; let lock: LeaderLock;
  const suffix = String(Date.now()).slice(-7);
  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile(); app = mod.createNestApplication(); await app.init();
    prisma = app.get(PrismaService); registry = app.get(OutboxHandlerRegistry); outbox = app.get(OutboxWriter); uow = app.get<UnitOfWork>(UNIT_OF_WORK); lock = app.get(LeaderLock);
  });
  afterAll(async () => { await app.close(); });

  it('two dispatchers never process the same event twice (rows are claimed, not just polled)', async () => {
    let calls = 0; const seen: string[] = [];
    const eventType = `ConcurrencyProbe${suffix}`;
    registry.on(eventType, 'probe', async (ev) => { calls++; seen.push(ev.aggregateId); await new Promise((r) => setTimeout(r, 40)); });
    const ids = Array.from({ length: 6 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`);
    await uow.run(async (tx) => { for (const id of ids) await outbox.publish(tx, { eventType, aggregateType: 'probe', aggregateId: id, payload: {} }); });
    // Two independent dispatcher instances, exactly like two pods draining at the same moment.
    const a = new OutboxProcessor(prisma, registry, app.get(OutboxProcessor)['config']);
    const b = new OutboxProcessor(prisma, registry, app.get(OutboxProcessor)['config']);
    const [ra, rb] = await Promise.all([a.drain(50), b.drain(50)]);
    expect(calls).toBe(ids.length);                                  // each event handled exactly once
    expect(new Set(seen).size).toBe(ids.length);
    expect(ra.processed + rb.processed).toBeGreaterThanOrEqual(ids.length);
    const pending = await prisma.outbox.count({ where: { aggregateId: { in: ids }, publishedAt: null } });
    expect(pending).toBe(0);
    const stillLocked = await prisma.outbox.count({ where: { aggregateId: { in: ids }, lockedUntil: { not: null } } });
    expect(stillLocked).toBe(0);                                      // claims are released, not leaked
  });
  it('a failed handler releases its claim so the next pass can retry immediately', async () => {
    const eventType = `FailingProbe${suffix}`; let attempts = 0;
    registry.on(eventType, 'always-fails', async () => { attempts++; await Promise.resolve(); throw new Error('provider down'); });
    const id = '00000000-0000-4000-8000-ffffffffffff';
    await uow.run((tx) => outbox.publish(tx, { eventType, aggregateType: 'probe', aggregateId: id, payload: {} }));
    const p = app.get(OutboxProcessor);
    await p.drain(50);
    const row = await prisma.outbox.findFirst({ where: { aggregateId: id, eventType } });
    expect(row!.publishedAt).toBeNull(); expect(row!.lockedUntil).toBeNull();   // free for the retry
    expect(attempts).toBe(1);
    const req = await prisma.integrationRequest.findFirst({ where: { idempotencyKey: `outbox:${row!.id}:always-fails` } });
    expect(req!.status).toBe('failed'); expect(req!.nextAttemptAt).toBeTruthy();  // backoff recorded
  });
  it('a scheduled job runs on one instance only', async () => {
    let ran = 0;
    const results = await Promise.all(Array.from({ length: 4 }, () => lock.runExclusive(`probe.job.${suffix}`, async () => { ran++; await new Promise((r) => setTimeout(r, 60)); return 'done'; })));
    expect(ran).toBe(1);
    expect(results.filter((r) => r === 'done')).toHaveLength(1);
    expect(results.filter((r) => r === null)).toHaveLength(3);        // the others skip this tick
    // the lock is released afterwards, so the next tick can run again
    expect(await lock.runExclusive(`probe.job.${suffix}`, () => Promise.resolve('again'))).toBe('again');
  });
});
