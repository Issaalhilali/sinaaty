// Runs before each e2e test file is loaded (jest setupFiles) — overrides .env for tests.
Object.assign(process.env, {
  NODE_ENV: 'test',
  APP_ENV: 'test',
  LOG_LEVEL: 'silent',
  NAFATH_MOCK_AUTO_APPROVE_MS: '0',
  INTEGRATION_NAFATH: 'mock',
  INTEGRATION_SMS: 'mock',
  THROTTLE_LIMIT: '1000',
});
