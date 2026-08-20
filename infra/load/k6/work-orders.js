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

export function setup() {
  const token = login(__ENV.WORKSHOP_PHONE || '+966500000001');
  return { token, orgId: orgOf(token) };
}

export default function ({ token, orgId }) {
  const started = Date.now();
  const create = http.post(`${BASE}/work-orders`, JSON.stringify({
    org_id: orgId, customer_phone: randomPhone(), vin: randomVin(), title_ar: 'صيانة دورية + فحص فرامل', payment_terms: 'on_delivery',
    items: [
      { type: 'labor', description_ar: 'تغيير زيت وفلتر', quantity: 1, unit_price: '260' },
      { type: 'part', description_ar: 'فلتر زيت أصلي', quantity: 1, unit_price: '85', warranty_days: 180 },
    ],
  }), { ...auth(token), tags: { step: 'create' } });
  if (!ok(create, 'create work order')) return;
  const id = create.json('id');

  for (const to of ['received', 'inspecting']) {
    const t = http.post(`${BASE}/work-orders/${id}/transition`, JSON.stringify({ to }), { ...auth(token), tags: { step: 'transition' } });
    if (!ok(t, `transition → ${to}`)) return;
  }

  const approval = http.post(`${BASE}/work-orders/${id}/request-approval`, JSON.stringify({}), { ...auth(token), tags: { step: 'transition' } });
  if (!ok(approval, 'request approval')) return;

  const timeline = http.get(`${BASE}/work-orders/${id}/timeline`, { ...auth(token), tags: { step: 'timeline' } });
  ok(timeline, 'timeline');
  think(1);   // a service advisor is not a benchmark: one car at a time, then a pause

  cycle.add(Date.now() - started);
}
