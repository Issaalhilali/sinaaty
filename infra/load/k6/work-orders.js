import http from 'k6/http';
import { Trend } from 'k6/metrics';
import { BASE, auth, login, ok, orgOf, randomPhone, randomVin, think } from './lib.js';

/**
 * The workshop's busiest path: a car arrives, is received, inspected, and sent to the customer for
 * approval. Every step writes history + audit + outbox in one transaction, so this exercises the
 * heaviest write path in the product.
 *
 *   k6 run -e BASE_URL=http://localhost:3000/v1 infra/load/k6/work-orders.js
 */
export const options = {
  scenarios: {
    intake: { executor: 'ramping-vus', startVUs: 1, stages: [
      { duration: __ENV.RAMP || '20s', target: Number(__ENV.VUS || 10) },
      { duration: __ENV.HOLD || '40s', target: Number(__ENV.VUS || 10) },
      { duration: '10s', target: 0 },
    ] },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{step:create}': ['p(95)<800'],
    'http_req_duration{step:transition}': ['p(95)<500'],
    'http_req_duration{step:timeline}': ['p(95)<500'],
    wo_full_cycle: ['p(95)<3000'],
  },
};

const cycle = new Trend('wo_full_cycle', true);

// الحمل يضرب ورشة الفحص لا ورشة العرض — آلاف الأوامر لا يجوز أن تظهر في شاشة المالك.
export function setup() {
  const token = login(__ENV.WORKSHOP_PHONE || '+966500000009');
  return { token, orgId: orgOf(token) };
}

// Tokens are minted in setup() ONLY — lib.js documents why: every VU shares one workshop phone, and
// in-run re-logins make ten VUs invalidate each other's OTP codes in a self-sustaining storm (soak
// run 3 proved it at minute ten). For any run longer than the 15-minute access TTL, start the API
// with JWT_ACCESS_TTL_SECONDS >= the run length — a load-environment knob, exactly like the raised
// throttle; production keeps 900s.
export default function ({ token, orgId }) {
  const started = Date.now();
  const create = http.post(`${BASE}/work-orders`, JSON.stringify({
    org_id: orgId, customer_phone: randomPhone(), vin: randomVin(), title_ar: 'صيانة دورية + فحص فرامل', payment_terms: 'on_delivery',
    items: [
      { type: 'labor', description_ar: 'تغيير زيت وفلتر', quantity: 1, unit_price: '260' },
      { type: 'part', description_ar: 'فلتر زيت أصلي', quantity: 1, unit_price: '85', warranty_days: 180 },
    ],
  }), { ...auth(token), tags: { step: 'create' } });
  if (!ok(create, 'create work order')) { think(1); return; }   // a failed step pauses too — never a hot loop
  const id = create.json('id');

  for (const to of ['received', 'inspecting']) {
    const t = http.post(`${BASE}/work-orders/${id}/transition`, JSON.stringify({ to }), { ...auth(token), tags: { step: 'transition' } });
    if (!ok(t, `transition → ${to}`)) { think(1); return; }
  }

  const approval = http.post(`${BASE}/work-orders/${id}/request-approval`, JSON.stringify({}), { ...auth(token), tags: { step: 'transition' } });
  if (!ok(approval, 'request approval')) { think(1); return; }

  const timeline = http.get(`${BASE}/work-orders/${id}/timeline`, { ...auth(token), tags: { step: 'timeline' } });
  ok(timeline, 'timeline');
  think(1);   // a service advisor is not a benchmark: one car at a time, then a pause

  cycle.add(Date.now() - started);
}
