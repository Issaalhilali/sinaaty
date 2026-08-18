// Runs before each e2e test file is loaded (jest setupFiles) — overrides .env for tests.
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
