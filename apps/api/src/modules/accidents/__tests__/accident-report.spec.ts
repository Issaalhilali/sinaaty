import { customerShare, isActionable, isFinal, suggestItems, type Damage } from '../domain/accident-report';
import { MonjezMockAdapter } from '../infrastructure/monjez/monjez.mock.adapter';

describe('accident report domain', () => {
  const damages: Damage[] = [
    { partCode: 'FRONT_BUMPER', labelAr: 'الصدام الأمامي', severity: 'severe', action: 'replace' },
    { partCode: 'HOOD', labelAr: 'غطاء المحرك', severity: 'moderate', action: 'paint' },
    { partCode: 'HEADLIGHT_LEFT', labelAr: 'الكشاف الأيسر', severity: 'minor', action: 'repair' },
  ];

  it('turns the assessor damage list into draft work-order items, Arabic first and unpriced', () => {
    const items = suggestItems(damages);
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({ type: 'part', descriptionAr: 'استبدال — الصدام الأمامي', partCode: 'FRONT_BUMPER', quantity: '1' });
    expect(items[1]).toMatchObject({ type: 'paint', descriptionAr: 'سمكرة ودهان — غطاء المحرك' });
    expect(items[2]).toMatchObject({ type: 'labor', descriptionAr: 'إصلاح — الكشاف الأيسر' });
    // No prices: the workshop quotes its own labour, the insurer's approved amount is only a ceiling.
    for (const i of items) expect(i).not.toHaveProperty('unitPrice');
  });

  it('only a priced file may be acted on; rejected/closed are final', () => {
    expect(isActionable('under_assessment')).toBe(false);
    expect(isActionable('reported')).toBe(false);
    expect(isActionable('assessed')).toBe(true);
    expect(isActionable('approved')).toBe(true);
    expect(isFinal('closed')).toBe(true);
    expect(isFinal('rejected')).toBe(true);
    expect(isFinal('assessed')).toBe(false);
  });

  describe('customer share', () => {
    it('is the deductible alone when the customer is not at fault', () => {
      expect(customerShare('4000.00', '500.00', '0.00')).toEqual({ deductible: '500.00', fault_share: '0.00', estimated_customer_total: '500.00' });
    });
    it('adds the fault percentage of what remains after the deductible', () => {
      // 4000 − 500 deductible = 3500 × 50% = 1750 → customer pays 2250.
      expect(customerShare('4000.00', '500.00', '50.00')).toEqual({ deductible: '500.00', fault_share: '1750.00', estimated_customer_total: '2250.00' });
    });
    it('never exceeds the repair total, and treats missing figures as zero', () => {
      expect(customerShare('300.00', '500.00', '100.00')).toEqual({ deductible: '300.00', fault_share: '0.00', estimated_customer_total: '300.00' });
      expect(customerShare('1000.00', null, null)).toEqual({ deductible: '0.00', fault_share: '0.00', estimated_customer_total: '0.00' });
    });
  });
});

describe('Monjez mock adapter', () => {
  const a = new MonjezMockAdapter();

  it('returns null for a reference the provider does not know (a mistyped ref is not an error)', async () => {
    expect(await a.fetchByRef('12345')).toBeNull();
  });

  it('is deterministic: the same reference always yields the same report', async () => {
    const [x, y] = await Promise.all([a.fetchByRef('ACC-2026-000123'), a.fetchByRef('acc-2026-000123')]);
    expect(x).toEqual(y);
    expect(x!.damages.length).toBeGreaterThan(0);
    expect(x!.approvedAmount).toMatch(/^\d+\.\d{2}$/);
  });

  it('a pending file carries no figures — there is nothing to quote against yet', async () => {
    const r = await a.fetchByRef('ACC-2026-PEND-1');
    expect(r!.status).toBe('under_assessment');
    expect(r!.approvedAmount).toBeNull();
    expect(r!.deductibleAmount).toBeNull();
    expect(isActionable(r!.status)).toBe(false);
  });

  it('a rejected claim is reported as such', async () => {
    const r = await a.fetchByRef('ACC-2026-REJ-9');
    expect(r!.status).toBe('rejected');
    expect(isFinal(r!.status)).toBe(true);
  });

  it('the same (report, work order) pair always gets the same submission reference', async () => {
    const s = { externalRef: 'ACC-2026-000123', workOrderNumber: 'WO-2026-000045', workshopName: 'ورشة', workshopCrNumber: null, completedAt: '2026-08-20T09:00:00.000Z', invoiceNumber: null, invoiceTotal: null, itemsSummaryAr: [], photoCount: 0 };
    const first = await a.submitRepairReport(s);
    const second = await a.submitRepairReport(s);
    expect(first.submissionRef).toBe(second.submissionRef);
    expect(first.submissionRef).toMatch(/^RPT-[0-9A-F]{10}$/);
    // A different repair on the same accident file is a different submission.
    const other = await a.submitRepairReport({ ...s, workOrderNumber: 'WO-2026-000046' });
    expect(other.submissionRef).not.toBe(first.submissionRef);
  });
});
