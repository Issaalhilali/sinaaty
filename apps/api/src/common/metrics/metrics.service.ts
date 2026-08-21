import { Injectable, type OnModuleInit } from '@nestjs/common';
import { metrics } from '@opentelemetry/api';
import { PrismaService } from '../../prisma';

/**
 * Application metrics the Grafana dashboard already references (infra/observability) — until now the
 * panels pointed at names nothing emitted. Names are OTel-dotted; the collector renders them as
 * `sinaaty_outbox_pending`, `sinaaty_integration_requests_total{provider,status}`,
 * `sinaaty_ledger_imbalance` — exactly the dashboard's expressions.
 *
 * Gauges are observed in ONE batch callback (one SQL round per export interval, 30s). With telemetry
 * off (dev/test default) the meter is a no-op and the callback never runs — zero overhead.
 * A pilot without an automated alarm on ledger imbalance is not a pilot; this is what the alert
 * rules bite on.
 */
@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly meter = metrics.getMeter('sinaaty-api');
  /** One increment per integration_requests outcome write — rate() gives failures/dead-letters per second. */
  private readonly integrationRequests = this.meter.createCounter('sinaaty.integration.requests', { description: 'integration_requests outcomes as they are written', unit: '{request}' });

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    const pending = this.meter.createObservableGauge('sinaaty.outbox.pending', { description: 'outbox rows not yet fully published', unit: '{event}' });
    const stalled = this.meter.createObservableGauge('sinaaty.outbox.stalled', { description: 'outbox rows whose claim lease expired without publish (a worker died mid-event)', unit: '{event}' });
    const deadLetters = this.meter.createObservableGauge('sinaaty.integration.dead_letters', { description: 'handler executions parked after max attempts — each one is a human task', unit: '{request}' });
    const imbalance = this.meter.createObservableGauge('sinaaty.ledger.imbalance', { description: 'ABS(SUM(debit-credit)) across ledger_lines — anything but zero is an incident', unit: 'SAR' });
    this.meter.addBatchObservableCallback(async (result) => {
      const s = await this.snapshot();
      result.observe(pending, s.outboxPending);
      result.observe(stalled, s.outboxStalled);
      result.observe(deadLetters, s.deadLetters);
      result.observe(imbalance, s.ledgerImbalance);
    }, [pending, stalled, deadLetters, imbalance]);
  }

  /** The same numbers the gauges observe — callable directly (admin overview, tests). */
  async snapshot(): Promise<{ outboxPending: number; outboxStalled: number; deadLetters: number; ledgerImbalance: number }> {
    const [row] = await this.prisma.$queryRaw<Array<{ pending: number; stalled: number; dead: number; imbalance: string }>>`
      SELECT
        (SELECT count(*)::int FROM outbox WHERE published_at IS NULL) AS pending,
        (SELECT count(*)::int FROM outbox WHERE published_at IS NULL AND locked_until IS NOT NULL AND locked_until < now()) AS stalled,
        (SELECT count(*)::int FROM integration_requests WHERE status = 'dead_letter') AS dead,
        (SELECT COALESCE(ABS(SUM(debit - credit)), 0)::text FROM ledger_lines) AS imbalance`;
    return { outboxPending: row!.pending, outboxStalled: row!.stalled, deadLetters: row!.dead, ledgerImbalance: Number(row!.imbalance) };
  }

  recordIntegration(provider: string, operation: string, status: 'succeeded' | 'failed' | 'dead_letter') {
    this.integrationRequests.add(1, { provider, operation, status });
  }
}
