// Warns when a dev API is running against the same database as the e2e suite.
// Its background jobs (outbox drain, escrow auto-release, dunning, parts expiry) mutate rows the
// tests assert on, which shows up as random failures. CI is isolated, so this is a local guard.
const url = `http://127.0.0.1:${process.env.PORT ?? 3000}/v1/health`;
try {
  const res = await fetch(url, { signal: AbortSignal.timeout(800) });
  if (res.ok) {
    console.warn('\x1b[33m⚠  A dev API is listening on %s.\x1b[0m', url);
    console.warn('   Its schedulers share this database and will race the e2e suite.');
    console.warn('   Stop it first:  ./dev.sh stop   (or run the API with JOBS_ENABLED=false)\n');
  }
} catch { /* nothing listening — the normal case */ }
