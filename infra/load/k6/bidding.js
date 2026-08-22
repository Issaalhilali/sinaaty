import http from 'k6/http';
import { Trend } from 'k6/metrics';
import { BASE, auth, login, ok, orgOf, randomVin, think } from './lib.js';

/**
 * The reverse auction: a workshop opens a part request, suppliers bid against it, and the workshop
 * accepts one. Bidding is the burstiest read/write mix in the platform — every supplier polls the same
 * request while others write to it — so it is measured separately from the work-order path.
 *
 *   k6 run -e BASE_URL=http://localhost:3000/v1 infra/load/k6/bidding.js
 */
export const options = {
  scenarios: {
    auction: { executor: 'ramping-vus', startVUs: 1, stages: [
      { duration: __ENV.RAMP || '20s', target: Number(__ENV.VUS || 10) },
      { duration: __ENV.HOLD || '40s', target: Number(__ENV.VUS || 10) },
      { duration: '10s', target: 0 },
    ] },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{step:open}': ['p(95)<800'],
    'http_req_duration{step:bid}': ['p(95)<600'],
    'http_req_duration{step:read}': ['p(95)<400'],
    auction_cycle: ['p(95)<3000'],
  },
};

const cycle = new Trend('auction_cycle', true);

export function setup() {
  const buyer = login(__ENV.WORKSHOP_PHONE || '+966500000001');
  const supplier = login(__ENV.SUPPLIER_PHONE || '+966500000004');
  return { buyer, buyerOrg: orgOf(buyer), supplier, supplierOrg: orgOf(supplier) };
}

// Tokens are minted in setup() ONLY (see work-orders.js and lib.js: shared phones + in-run re-login
// = OTP invalidation storm). Long runs: start the API with JWT_ACCESS_TTL_SECONDS >= run length.
export default function ({ buyer, buyerOrg, supplier, supplierOrg }) {
  const started = Date.now();
  const open = http.post(`${BASE}/parts/requests`, JSON.stringify({
    org_id: buyerOrg, vin: randomVin(), part_name_ar: 'مساعد أمامي يمين',
    accepted_conditions: ['oem_new', 'aftermarket_new', 'used_scrapyard'], quantity: 1, bidding_minutes: 60,
  }), { ...auth(buyer), tags: { step: 'open' } });
  if (!ok(open, 'open part request')) { think(1); return; }
  const id = open.json('id');

  const price = (300 + Math.floor(Math.random() * 400)).toFixed(2);
  const bid = http.post(`${BASE}/parts/requests/${id}/bids`, JSON.stringify({
    org_id: supplierOrg, condition: 'aftermarket_new', unit_price: price, quantity: 1, eta_hours: 24, warranty_days: 90,
  }), { ...auth(supplier), tags: { step: 'bid' } });
  if (!ok(bid, 'submit bid')) { think(1); return; }

  const read = http.get(`${BASE}/parts/requests/${id}`, { ...auth(buyer), tags: { step: 'read' } });
  ok(read, 'read request with bids');
  think(1);

  cycle.add(Date.now() - started);
}
