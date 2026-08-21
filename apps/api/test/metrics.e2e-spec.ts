import { Test } from '@nestjs/testing';
import { type INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { metrics } from '@opentelemetry/api';
import { AggregationTemporality, InMemoryMetricExporter, MeterProvider, PeriodicExportingMetricReader, type DataPoint } from '@opentelemetry/sdk-metrics';
import { AppModule } from '../src/app.module';
import { OutboxWriter } from '../src/common/outbox/outbox.writer';
import { UNIT_OF_WORK, type UnitOfWork } from '../src/common/ports/unit-of-work.port';
import { OutboxHandlerRegistry } from '../src/modules/integrations/outbox/outbox-handler.registry';
import { OutboxProcessor } from '../src/modules/integrations/outbox/outbox.processor';

/**
 * P2 acceptance (requirements-review session): the metric names the Grafana dashboard references are
 * emitted with values that MOVE under real flow — proven with an in-memory OTel reader, not by reading
 * the code. The global meter provider is registered before the app boots, exactly like production
 * (telemetry.ts starts before bootstrap).
 */
describe('OTEL metrics (e2e)', () => {
  const exporter = new InMemoryMetricExporter(AggregationTemporality.CUMULATIVE);
  const reader = new PeriodicExportingMetricReader({ exporter, exportIntervalMillis: 3_600_000 });
  let app: INestApplication; let outbox: OutboxProcessor; const http = () => request(app.getHttpServer());
  const suffix = String(Date.now()).slice(-7);
  const login = async (phone: string) => { const r = await http().post('/v1/auth/otp/request').send({ phone }).expect(200); const v = await http().post('/v1/auth/otp/verify').send({ phone, code: r.body.debug_code }).expect(200); return v.body.accessToken as string; };

  const collect = async () => {
    exporter.reset();
    await reader.forceFlush();
    const byName = new Map<string, DataPoint<number>[]>();
    for (const rm of exporter.getMetrics()) for (const sm of rm.scopeMetrics) for (const m of sm.metrics) byName.set(m.descriptor.name, m.dataPoints as DataPoint<number>[]);
    return byName;
  };

  beforeAll(async () => {
    metrics.setGlobalMeterProvider(new MeterProvider({ readers: [reader] }));
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication(); app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' }); await app.init(); await app.listen(0, '127.0.0.1');
    outbox = app.get(OutboxProcessor);
  });
  afterAll(async () => { await app.close(); metrics.disable(); });

  it('the dashboard names are emitted, and the integration counter moves when the outbox actually works', async () => {
    // A real event through the real dispatcher: one handler that succeeds, one that always fails —
    // so BOTH counter statuses move, exactly what the failure-rate panel graphs.
    await login('+966500000099'); await login(`+96653${suffix}`);   // exercise the API so gauges observe live data
    const registry = app.get(OutboxHandlerRegistry); const uow = app.get<UnitOfWork>(UNIT_OF_WORK); const writer = app.get(OutboxWriter);
    const eventType = `MetricsProbe${suffix}`;
    registry.on(eventType, 'metrics-ok', () => Promise.resolve());
    registry.on(eventType, 'metrics-boom', () => Promise.reject(new Error('boom')));
    await uow.run((tx) => writer.publish(tx, { eventType, aggregateType: 'probe', aggregateId: '00000000-0000-4000-8000-000000000042', payload: {} }));
    const before = await collect();
    const sumOf = (pts: DataPoint<number>[] | undefined) => (pts ?? []).reduce((a, p) => a + p.value, 0);
    const beforeCount = sumOf(before.get('sinaaty.integration.requests'));
    await outbox.drain(200); await outbox.drain(200);
    const after = await collect();
    // Gauges exist under the exact names the dashboard queries, with sane values.
    expect(after.get('sinaaty.outbox.pending')![0]!.value).toBeGreaterThanOrEqual(0);
    expect(after.get('sinaaty.outbox.stalled')![0]!.value).toBeGreaterThanOrEqual(0);
    expect(after.get('sinaaty.integration.dead_letters')![0]!.value).toBeGreaterThanOrEqual(0);
    expect(after.get('sinaaty.ledger.imbalance')![0]!.value).toBe(0);
    // The counter MOVED because handlers ran — one success, one recorded failure.
    const pts = after.get('sinaaty.integration.requests')!;
    const byStatus = (st: string) => sumOf(pts.filter((p) => p.attributes['status'] === st));
    expect(sumOf(pts)).toBeGreaterThan(beforeCount);
    expect(byStatus('succeeded')).toBeGreaterThan(0);
    expect(byStatus('failed')).toBeGreaterThan(0);
  });
});
