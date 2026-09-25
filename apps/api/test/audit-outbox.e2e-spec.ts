import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma';
import { AuditLogWriter } from '../src/common/audit';
import { OutboxWriter } from '../src/common/outbox';
import { verifyChain } from '../src/common/audit/audit-hash';

describe('AuditLogWriter + OutboxWriter (db)', () => {
  let prisma: PrismaService; let audit: AuditLogWriter; let outbox: OutboxWriter; let close: () => Promise<void>;

  beforeAll(async () => {
    process.env['NODE_ENV'] = 'test'; process.env['LOG_LEVEL'] = 'silent';
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app = mod.createNestApplication(); await app.init(); await app.listen(0, '127.0.0.1');
    prisma = app.get(PrismaService); audit = app.get(AuditLogWriter); outbox = app.get(OutboxWriter);
    close = () => app.close();
  });
  afterAll(async () => { await close(); });

  it('writes a hash-chained audit row and an outbox event in one transaction; chain verifies', async () => {
    const tag = `test-${Date.now()}`;
    await prisma.$transaction(async (tx) => {
      await audit.write(tx, { action: 'test.one', entityType: tag, after: { national_id: '1010101010', ok: 1 }, actorType: 'system' });
      await audit.write(tx, { action: 'test.two', entityType: tag, actorType: 'system' });
      await outbox.publish(tx, { eventType: 'TestEvent', aggregateType: 'test', aggregateId: '00000000-0000-7000-8000-000000000001', payload: { tag } });
    });
    const rows = await prisma.$queryRaw<Array<{ occurred_at: Date; actor_user_id: string | null; actor_type: string; org_id: string | null; action: string; entity_type: string; entity_id: string | null; before: unknown; after: unknown; request_id: string | null; prev_hash: string | null; hash: string }>>`
      SELECT * FROM audit_log WHERE entity_type = ${tag} ORDER BY id`;
    expect(rows).toHaveLength(2);
    expect(rows[1]!.prev_hash).toBe(rows[0]!.hash);
    expect((rows[0]!.after as { national_id: string }).national_id).toBe('[REDACTED]');
    const chain = rows.map((r) => ({ occurredAt: r.occurred_at.toISOString(), actorUserId: r.actor_user_id, actorType: r.actor_type, orgId: r.org_id, action: r.action, entityType: r.entity_type, entityId: r.entity_id, before: r.before, after: r.after, requestId: r.request_id, prevHash: r.prev_hash, hash: r.hash }));
    expect(verifyChain(chain)).toBe(-1);
    const ob = await prisma.$queryRaw<Array<{ event_type: string }>>`SELECT event_type FROM outbox WHERE payload->>'tag' = ${tag}`;
    expect(ob).toHaveLength(1);
  });

  it('audit_log rejects UPDATE (append-only trigger)', async () => {
    await expect(prisma.$executeRaw`UPDATE audit_log SET action = 'x' WHERE action = 'test.one'`).rejects.toThrow(/append-only/);
  });
});
