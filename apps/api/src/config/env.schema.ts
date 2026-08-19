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

  /** Ed25519 PEM keys, base64-encoded (see tools/gen-jwt-keys.mjs). */
  JWT_PRIVATE_KEY: z.string().min(40),
  JWT_PUBLIC_KEY: z.string().min(40),
  JWT_ISSUER: z.string().default('sinaaty'),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),
  OTP_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  OTP_MAX_REQUESTS_PER_10MIN: z.coerce.number().int().positive().default(3),
  NAFATH_MOCK_AUTO_APPROVE_MS: z.coerce.number().int().nonnegative().default(1500),
  NAFATH_CALLBACK_SECRET: z.string().min(8).default('dev-nafath-callback-secret'),

  S3_BUCKET_MEDIA: z.string().default('sinaaty-media'),
  S3_BUCKET_DOCS: z.string().default('sinaaty-docs'),
  INTEGRATION_STORAGE: z.enum(['mock', 'live']).default('mock'),
  INTEGRATION_VIN: z.enum(['mock', 'live']).default('mock'),

  PSP_PROVIDER: z.string().default('mock'),
  PSP_WEBHOOK_SECRET: z.string().min(8).default('dev-psp-webhook-secret'),
  ESCROW_AUTO_RELEASE_HOURS: z.coerce.number().int().positive().default(72),
  VAT_RATE_PCT: z.coerce.number().min(0).max(100).default(15),
  NOTE_DEFAULT_TERMS_DAYS: z.coerce.number().int().positive().default(30),
  DUNNING_SCHEDULE_DAYS: z.string().default('1,3,7,10').transform((s) => s.split(',').map((x) => Number(x.trim())).filter((n) => Number.isInteger(n) && n > 0)),
  DUNNING_FORMAL_STEP: z.coerce.number().int().positive().default(4),
  APPROVAL_LINK_SECRET: z.string().min(16).default('dev-approval-link-secret-change-me'),
  WEB_APPROVAL_BASE_URL: z.string().url().default('http://localhost:3000'),
  TRANSPORT_MARGIN_BPS: z.coerce.number().int().min(0).max(5000).default(1500),
  TRANSPORT_TRACK_MIN_SECONDS: z.coerce.number().int().min(1).max(300).default(10),
  BIDDING_DEFAULT_MINUTES: z.coerce.number().int().positive().default(60),
  PART_ORDER_AUTO_CONFIRM_HOURS: z.coerce.number().int().positive().default(72),
  JOBS_ENABLED: z.coerce.boolean().default(true),

  /** Observability — off by default; CI/staging/prod set OTEL_ENABLED=true (see infra/helm). */
  OTEL_ENABLED: z.enum(['true', 'false']).default('false'),
  OTEL_SERVICE_NAME: z.string().default('sinaaty-api'),
  OTEL_EXPORTER: z.enum(['otlp', 'console']).default('otlp'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().default('http://localhost:4318'),

  THROTTLE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(120),

  INTEGRATION_NAFATH: integrationMode,
  INTEGRATION_NAFEZ: integrationMode,
  INTEGRATION_ZATCA: z.enum(['mock', 'sandbox', 'live']).default('mock'),
  ZATCA_BASE_URL: z.string().url().default('https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal'),
  INTEGRATION_PSP: integrationMode,
  INTEGRATION_ESCROW: integrationMode,
  INTEGRATION_SMS: integrationMode,
  INTEGRATION_AI: integrationMode,
  INTEGRATION_MAPS: integrationMode,
});

export type Env = z.infer<typeof envSchema>;

/** Used by ConfigModule.validate — throws a readable error listing every bad variable. */
/**
 * Secrets that ship with a development default. Anyone can read them in the repository, so a production
 * deployment that still carries one is a live vulnerability — e.g. the approval-link secret would let an
 * attacker mint a valid "approve this work order" link for any work order id. Booting is refused instead.
 */
const DEV_DEFAULT_SECRETS: Array<{ key: keyof Env; devDefault: string; risk: string }> = [
  { key: 'APPROVAL_LINK_SECRET', devDefault: 'dev-approval-link-secret-change-me', risk: 'anyone could forge customer approval links' },
  { key: 'PSP_WEBHOOK_SECRET', devDefault: 'dev-psp-webhook-secret', risk: 'anyone could forge payment webhooks' },
  { key: 'NAFATH_CALLBACK_SECRET', devDefault: 'dev-nafath-callback-secret', risk: 'anyone could forge Nafath callbacks' },
];

export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  const env = parsed.data;
  if (env.APP_ENV === 'prod' || env.NODE_ENV === 'production') {
    const insecure = DEV_DEFAULT_SECRETS.filter((s) => env[s.key] === s.devDefault).map((s) => `  - ${String(s.key)} still holds the development default → ${s.risk}`);
    if (env.PII_ENC_KEY === Buffer.alloc(32).toString('base64')) insecure.push('  - PII_ENC_KEY is all zeros → encrypted national ids and IBANs would be trivially readable');
    if (insecure.length) throw new Error(`Refusing to start in production with development secrets:\n${insecure.join('\n')}`);
  }
  return env;
}
