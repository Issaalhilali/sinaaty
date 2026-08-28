// Runs before each e2e test file is loaded (jest setupFiles) — overrides .env for tests.

// Diagnostic for the intermittent whole-suite flake: when a supertest assertion fails, print the full
// target URL (the port says WHICH listener answered), the response headers (x-powered-by identifies our
// Express apps; its absence means a foreign process answered) and the error envelope body.
import supertest from 'supertest';

// `assert` is not part of supertest's public typings — reach it through a structural cast.
const proto = supertest.Test.prototype as unknown as { assert: (resError: unknown, res: unknown, fn?: (err: unknown, res: unknown) => void) => unknown };
const origAssert = proto.assert;
proto.assert = function (resError: unknown, res: unknown, fn?: (err: unknown, res: unknown) => void) {
  return origAssert.call(this, resError, res, (err: unknown, rr: unknown) => {
    const r = rr as { status?: number; headers?: unknown; body?: unknown } | undefined;
    if (err) {
      const head = r ? JSON.stringify(r.headers) : '';
      const body = r ? JSON.stringify(r.body ?? {}).slice(0, 400) : String((resError as Error | undefined)?.message ?? '');
      console.error(`E2E-DIAG ${(this as { method?: string }).method} ${(this as { url?: string }).url} -> ${r?.status ?? 'NO-RESPONSE'} headers=${head} body=${body}`);
    }
    if (fn) fn(err, r);
  });
};

// **No test talks to a real provider** (CLAUDE.md §5.3: CI must pass with all mocks).
//
// Naming two of them left the rest to whatever `.env` held. A dev machine with `INTEGRATION_PUSH=live`
// (set to prove FCM end to end) made the whole suite refuse to boot — and had the key been exported it
// would have been far worse than a failure: the suite would have pushed test notifications to real
// phones. Every flag in `env.schema.ts` is listed, and the list is asserted against the schema below,
// so an integration added tomorrow cannot quietly default to live.
//
// Listed, not looped over `process.env`: at this point the `.env` file has not been read yet, so the
// flags are not in the environment to be rewritten — which is exactly why the first fix did nothing.
const MOCKED = ['ACCIDENTS', 'AI', 'EMAIL', 'ESCROW', 'MAPS', 'NAFATH', 'NAFEZ', 'PSP', 'PUSH', 'SEARCH', 'SMS', 'SPEECH', 'STORAGE', 'VIN', 'ZATCA'];
for (const k of MOCKED) process.env[`INTEGRATION_${k}`] = 'mock';

Object.assign(process.env, {
  NODE_ENV: 'test',
  APP_ENV: 'test',
  LOG_LEVEL: process.env['E2E_LOG'] ?? 'silent',
  NAFATH_MOCK_AUTO_APPROVE_MS: '0',
  INTEGRATION_NAFATH: 'mock',
  INTEGRATION_SMS: 'mock',
  THROTTLE_LIMIT: '1000',
  OTP_MAX_REQUESTS_PER_10MIN: '1000',
  JOBS_ENABLED: 'false',
});
