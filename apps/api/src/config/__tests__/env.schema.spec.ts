import { validateEnv } from '../env.schema';
/** Production must never start with the secrets that are committed to this repository. */
describe('environment validation', () => {
  const base = { DATABASE_URL: 'postgresql://x:x@localhost:5432/x', PII_ENC_KEY: Buffer.alloc(32, 7).toString('base64'), JWT_PRIVATE_KEY: 'x'.repeat(50), JWT_PUBLIC_KEY: 'y'.repeat(50) };
  const realSecrets = { APPROVAL_LINK_SECRET: 'a-real-secret-value-32-chars-long', PSP_WEBHOOK_SECRET: 'real-psp-secret', NAFATH_CALLBACK_SECRET: 'real-nafath-secret' };
  it('accepts development defaults outside production', () => { expect(() => validateEnv({ ...base, APP_ENV: 'dev' })).not.toThrow(); });
  it('refuses to boot in production while a development secret is still in place', () => {
    expect(() => validateEnv({ ...base, APP_ENV: 'prod', ...realSecrets, APPROVAL_LINK_SECRET: 'dev-approval-link-secret-change-me' })).toThrow(/forge customer approval links/);
    expect(() => validateEnv({ ...base, NODE_ENV: 'production', ...realSecrets, PSP_WEBHOOK_SECRET: 'dev-psp-webhook-secret' })).toThrow(/forge payment webhooks/);
    expect(() => validateEnv({ ...base, APP_ENV: 'prod', ...realSecrets, NAFATH_CALLBACK_SECRET: 'dev-nafath-callback-secret' })).toThrow(/forge Nafath callbacks/);
  });
  it('refuses an all-zero PII key in production', () => {
    expect(() => validateEnv({ ...base, APP_ENV: 'prod', ...realSecrets, PII_ENC_KEY: Buffer.alloc(32).toString('base64') })).toThrow(/PII_ENC_KEY/);
  });
  it('starts in production once every secret is real', () => { expect(() => validateEnv({ ...base, APP_ENV: 'prod', ...realSecrets })).not.toThrow(); });
});
