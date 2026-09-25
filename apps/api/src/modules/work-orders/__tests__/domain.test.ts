import { canTransition, WO_TRANSITIONS } from '../domain/state-machine';
import { snapshotHash, type Snapshot } from '../domain/snapshot';
import { isCustomer, isWorkshopMember } from '../domain/work-order';

describe('work-orders domain', () => {
  it('state machine: happy path is legal, shortcuts are not', () => {
    const path = ['draft', 'received', 'inspecting', 'awaiting_approval', 'awaiting_parts', 'in_progress', 'quality_check', 'ready', 'delivered', 'closed'] as const;
    for (let i = 0; i < path.length - 1; i++) expect(canTransition(path[i]!, path[i + 1]!)).toBe(true);
    expect(canTransition('draft', 'in_progress')).toBe(false);
    expect(canTransition('received', 'ready')).toBe(false);
    expect(canTransition('closed', 'in_progress')).toBe(false);
    expect(canTransition('ready', 'abandoned')).toBe(true);
    expect(canTransition('in_progress', 'awaiting_approval')).toBe(true); // change order
    expect(WO_TRANSITIONS.cancelled).toEqual([]);
  });
  it('snapshot hash is canonical (key order irrelevant) and byte-sensitive', () => {
    const base: Snapshot = { work_order_id: 'w', number: 'WO-1', version: 1, org: { id: 'o', name_ar: 'ورشة', vat_number: null }, customer: { user_id: 'u', org_id: null, name_ar: null }, vehicle: { id: 'v', vin: null, plate: null, make_ar: null, model_ar: null, year: null }, items: [{ id: 'i', type: 'labor', description_ar: 'x', description_en: null, part_condition: null, part_number: null, quantity: '1', unit_price: '100.00', discount: '0.00', vat_rate: '15.00', line_total: '100.00', warranty_days: 0 }], totals: { subtotal: '100.00', discount: '0.00', vat: '15.00', total: '115.00' }, payment_terms: 'on_delivery', deposit_required: '0.00', due_date: null, promised_ready_at: null, contract_terms_version: 'v1', reason_ar: null, created_at: '2026-08-18T00:00:00.000Z' };
    const reordered = JSON.parse(JSON.stringify({ ...base, totals: { total: '115.00', vat: '15.00', discount: '0.00', subtotal: '100.00' } })) as Snapshot;
    expect(snapshotHash(reordered)).toBe(snapshotHash(base));
    expect(snapshotHash({ ...base, totals: { ...base.totals, total: '115.01' } })).not.toBe(snapshotHash(base));
  });
  it('access helpers', () => {
    const wo = { orgId: 'o1', customerUserId: 'c1', customerOrgId: null };
    expect(isCustomer(wo, { id: 'c1', orgs: [], platformRole: 'none' })).toBe(true);
    expect(isWorkshopMember(wo, { id: 'x', orgs: [{ orgId: 'o1', role: 'technician' }], platformRole: 'none' }, ['owner'])).toBe(false);
    expect(isWorkshopMember(wo, { id: 'x', orgs: [{ orgId: 'o1', role: 'technician' }], platformRole: 'none' })).toBe(true);
  });
});
