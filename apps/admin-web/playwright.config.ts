import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './e2e', timeout: 60_000, use: { baseURL: process.env.ADMIN_URL ?? 'http://localhost:3001', locale: 'ar-SA' }, webServer: process.env.ADMIN_URL ? undefined : { command: 'pnpm start', port: 3001, reuseExistingServer: true } });
