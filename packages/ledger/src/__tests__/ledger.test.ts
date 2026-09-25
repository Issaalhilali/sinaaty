import { describe, expect, it } from 'vitest';
import { Accounts, allocate, computeSplit, Decimal, disputeSplit, entry, escrowReleased, escrowRefunded, paymentCaptured, payoutSent, round2, totals, transportEscrowReleased, UnbalancedEntryError } from '..';

const ORG = '86272482-86d0-43b3-b6b2-4a9191dd492d';

describe('money', () => {
  it('rounds half-up to 2dp', () => {
    expect(round2('1.005').toString()).toBe('1.01');
    expect(round2('1.004').toString()).toBe('1');
    expect(round2(2.675).toString()).toBe('2.68');
  });
  it('allocate sums exactly to total', () => {
    const parts = allocate('100.00', [1, 1, 1]);
    expect(parts.map((p) => p.toFixed(2))).toEqual(['33.34', '33.33', '33.33']);
    expect(parts.reduce((a, b) => a.plus(b), new Decimal(0)).toFixed(2)).toBe('100.00');
  });
});

describe('entry builder', () => {
  it('builds a balanced entry', () => {
    const e = entry('test', 'k1').debit(Accounts.pspClearing, '10.00').credit(Accounts.escrowLiability(ORG), 10).build();
    expect(e.lines).toHaveLength(2);
    const t = totals(e.lines);
    expect(t.debit.eq(t.credit)).toBe(true);
  });
  it('rejects unbalanced entries', () => {
    expect(() => entry('test', 'k2').debit(Accounts.pspClearing, 10).credit(Accounts.bank, 9.99).build()).toThrow(UnbalancedEntryError);
  });
  it('rejects a single-line entry and missing idempotency key', () => {
    expect(() => entry('test', 'k3').debit(Accounts.bank, 5).build()).toThrow(/at least 2 lines/);
    expect(() => entry('test', '')).toThrow(/idempotencyKey/);
  });
  it('rejects bad org ids in per-org accounts', () => {
    expect(() => Accounts.escrowLiability('not-a-uuid')).toThrow(RangeError);
  });
});

describe('postings', () => {
  it('payment captured: psp_clearing → escrow_liability', () => {
    const e = paymentCaptured({ paymentId: 'p1', orgId: ORG, amount: '1150.00' });
    expect(e.idempotencyKey).toBe('payment_captured:p1');
    expect(e.lines[0]!.account.code).toBe('psp_clearing');
    expect(e.lines[1]!.account.code).toBe(`escrow_liability:${ORG}`);
  });
  it('escrow release splits commission + VAT + note fee and stays balanced', () => {
    const e = escrowReleased({ escrowHoldId: 'h1', orgId: ORG, gross: '1150.00', commissionBps: 500, vatRatePct: 15, noteFee: 15 });
    const by = Object.fromEntries(e.lines.map((l) => [l.account.code, l.credit.gt(0) ? l.credit.toFixed(2) : `-${l.debit.toFixed(2)}`]));
    expect(by[`escrow_liability:${ORG}`]).toBe('-1150.00');
    expect(by['platform_revenue:commission']).toBe('57.50');
    expect(by['vat_payable']).toBe('8.63'); // 57.50 * 15% = 8.625 → 8.63
    expect(by['platform_revenue:note_fee']).toBe('15.00');
    expect(by[`org_available:${ORG}`]).toBe('1068.87');
    const t = totals(e.lines);
    expect(t.debit.eq(t.credit)).toBe(true);
  });
  it('transport release takes the job margin (not commission bps) + VAT on it, and stays balanced', () => {
    // Quote 200.00 → margin 30.00 (15%); customer paid 230.00 (price + 15% VAT line).
    const e = transportEscrowReleased({ escrowHoldId: 'h9', orgId: ORG, gross: '230.00', margin: '30.00', vatRatePct: 15 });
    const by = Object.fromEntries(e.lines.map((l) => [l.account.code, l.credit.gt(0) ? l.credit.toFixed(2) : `-${l.debit.toFixed(2)}`]));
    expect(by[`escrow_liability:${ORG}`]).toBe('-230.00');
    expect(by['platform_revenue:transport_margin']).toBe('30.00');
    expect(by['vat_payable']).toBe('4.50');
    expect(by[`org_available:${ORG}`]).toBe('195.50');
    const t = totals(e.lines);
    expect(t.debit.eq(t.credit)).toBe(true);
    expect(() => transportEscrowReleased({ escrowHoldId: 'h9', orgId: ORG, gross: '20.00', margin: '30.00', vatRatePct: 15 })).toThrow(RangeError);
  });
  it('computeSplit rejects fees exceeding gross', () => {
    expect(() => computeSplit('10.00', 500, 15, 20)).toThrow(RangeError);
  });
  it('refund, dispute split and payout are balanced', () => {
    for (const e of [
      escrowRefunded({ escrowHoldId: 'h1', refundId: 'r1', orgId: ORG, amount: '100.00' }),
      disputeSplit({ escrowHoldId: 'h1', disputeId: 'd1', orgId: ORG, gross: '1000.00', toCustomer: '333.33', commissionBps: 400, vatRatePct: 15 }),
      payoutSent({ payoutId: 'po1', orgId: ORG, amount: '5000.00' }),
    ]) {
      const t = totals(e.lines);
      expect(t.debit.eq(t.credit)).toBe(true);
    }
  });
  it('property: escrow release is balanced for many random amounts/rates', () => {
    let seed = 42;
    const rnd = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
    for (let i = 0; i < 2000; i++) {
      const gross = (rnd() * 100000).toFixed(2);
      const bps = Math.floor(rnd() * 1500);
      const e = escrowReleased({ escrowHoldId: `h${i}`, orgId: ORG, gross, commissionBps: bps, vatRatePct: 15, noteFee: rnd() > 0.5 ? 15 : 0 });
      const t = totals(e.lines);
      expect(t.debit.eq(t.credit)).toBe(true);
    }
  });
});
