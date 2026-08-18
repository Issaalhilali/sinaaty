import { z } from 'zod';

/**
 * Zod-validated environment. Every variable the API reads is declared here —
 * `process.env` is never read elsewhere. Keep in sync with CLAUDE.md §7 and .env.example.
 */
const integrationMode = z.enum(['mock', 'live']).default('mock');

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_ENV: z.enum(['dev', 'staging', 'prod', 'test']).default('dev'),
  PORT: z.coerce.number().int().positive().default(3000),
  API_BASE_URL: z.string().url().default('http://localhost:3000'),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3001')
    .transform((s) => s.split(',').map((o) => o.trim()).filter(Boolean)),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  DATABASE_URL: z.string().min(1),
  DIRECT_DATABASE_URL: z.string().min(1).optional(),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),

  /** 32-byte key, base64 — encrypts national_id / iban / CSIDs (AES-256-GCM). */
  PII_ENC_KEY: z.string().refine((s) => Buffer.from(s, 'base64').length === 32, 'PII_ENC_KEY must be 32 bytes base64'),

  THROTTLE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(120),

  INTEGRATION_NAFATH: integrationMode,
  INTEGRATION_NAFEZ: integrationMode,
  INTEGRATION_ZATCA: z.enum(['mock', 'sandbox', 'live']).default('mock'),
  INTEGRATION_PSP: integrationMode,
  INTEGRATION_ESCROW: integrationMode,
  INTEGRATION_SMS: integrationMode,
  INTEGRATION_AI: integrationMode,
});

export type Env = z.infer<typeof envSchema>;

/** Used by ConfigModule.validate — throws a readable error listing every bad variable. */
export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
