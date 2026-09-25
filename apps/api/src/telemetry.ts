/**
 * OpenTelemetry bootstrap — imported *before* the Nest app so auto-instrumentation can patch
 * http/express/pg/ioredis. Disabled unless OTEL_ENABLED=true, so dev and tests stay untouched.
 * Exports OTLP/HTTP by default; set OTEL_EXPORTER=console to print spans locally.
 */
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PrismaInstrumentation } from '@prisma/instrumentation';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { ConsoleSpanExporter, type SpanExporter } from '@opentelemetry/sdk-trace-base';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

let sdk: NodeSDK | undefined;
/** Never trace health/metrics probes — they would drown the traces. */
const IGNORED_PATHS = ['/v1/health', '/health', '/metrics', '/favicon.ico'];

export function startTelemetry(): void {
  if (process.env.OTEL_ENABLED !== 'true' || sdk) return;
  if (process.env.OTEL_DEBUG === 'true') diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318';
  const useConsole = process.env.OTEL_EXPORTER === 'console';
  const traceExporter: SpanExporter = useConsole ? new ConsoleSpanExporter() : new OTLPTraceExporter({ url: `${endpoint}/v1/traces` });
  sdk = new NodeSDK({
    resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? 'sinaaty-api', [ATTR_SERVICE_VERSION]: process.env.APP_VERSION ?? '0.0.1', 'deployment.environment': process.env.APP_ENV ?? 'dev' }),
    traceExporter,
    ...(useConsole ? {} : { metricReader: new PeriodicExportingMetricReader({ exporter: new OTLPMetricExporter({ url: `${endpoint}/v1/metrics` }), exportIntervalMillis: 30_000 }) }),
    instrumentations: [new PrismaInstrumentation(), getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-http': { ignoreIncomingRequestHook: (req) => IGNORED_PATHS.some((p) => (req.url ?? '').startsWith(p)) },
    })],
  });
  sdk.start();
  process.once('SIGTERM', () => void shutdownTelemetry());
}
export async function shutdownTelemetry(): Promise<void> { await sdk?.shutdown().catch(() => undefined); sdk = undefined; }
