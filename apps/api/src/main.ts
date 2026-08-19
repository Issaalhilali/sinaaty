import { startTelemetry } from './telemetry';

/**
 * Entry point. Telemetry must be started before anything else is imported, otherwise the
 * OpenTelemetry auto-instrumentation cannot patch http/express/pg (ESM imports are hoisted),
 * so the application itself is pulled in with a dynamic import below.
 */
startTelemetry();

void (async () => {
  const { bootstrap } = await import('./bootstrap');
  await bootstrap();
})();
