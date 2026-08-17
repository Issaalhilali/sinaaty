// Runs before test files are loaded so ConfigModule sees test values (not apps/api/.env).
process.env['NODE_ENV'] = 'test';
process.env['APP_ENV'] = 'test';
process.env['LOG_LEVEL'] = 'silent';
process.env['DATABASE_URL'] ??= 'postgresql://sinaaty:sinaaty@localhost:5432/sinaaty';
