import http from 'k6/http';
import { check, fail, sleep } from 'k6';

export const BASE = __ENV.BASE_URL || 'http://localhost:3000/v1';

/**
 * Log in through the mock OTP channel. Called from setup() only: the per-phone OTP quota is 3 per ten
 * minutes on purpose (Step 24 hardening), so every VU shares the tokens minted here rather than each
 * logging in — which is also how the real apps behave, one login per device.
 */
export function login(phone) {
  const r = http.post(`${BASE}/auth/otp/request`, JSON.stringify({ phone }), { headers: { 'content-type': 'application/json' } });
  if (r.status !== 200) fail(`otp/request ${phone} → ${r.status} ${r.body}`);
  const code = r.json('debug_code');
  if (!code) fail('the API did not return a debug code — run the load test against a mock-SMS environment');
  const v = http.post(`${BASE}/auth/otp/verify`, JSON.stringify({ phone, code }), { headers: { 'content-type': 'application/json' } });
  if (v.status !== 200) fail(`otp/verify ${phone} → ${v.status} ${v.body}`);
  return v.json('accessToken');
}

export function orgOf(token) {
  const me = http.get(`${BASE}/me`, auth(token));
  if (me.status !== 200) fail(`/me → ${me.status}`);
  const orgs = me.json('orgs') || [];
  if (!orgs.length) fail('this account has no organization — seed the database first (pnpm --filter api seed)');
  return orgs[0].org_id;
}

export const auth = (token, extra = {}) => ({ headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...extra } });

const VIN_CHARS = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
export function randomVin() {
  let s = 'JTD';
  for (let i = 0; i < 14; i++) s += VIN_CHARS[Math.floor(Math.random() * VIN_CHARS.length)];
  return s;
}
export const think = (seconds = 1) => sleep(seconds);
export const randomPhone = () => `+9665${Math.floor(10_000_000 + Math.random() * 89_999_999)}`;

/**
 * Records the check and returns false instead of throwing: a failed step must end *this* iteration, not
 * turn the run into a flood of retries (which is what hid the real numbers the first time this ran).
 */
export function ok(res, name) {
  const passed = check(res, { [name]: (r) => r.status >= 200 && r.status < 300 });
  if (!passed) console.warn(`${name} → ${res.status} ${String(res.body).slice(0, 200)}`);
  return passed;
}
