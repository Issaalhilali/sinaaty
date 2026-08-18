import { Money } from '../domain/money';
import { computeLine, computeTotals } from '../domain/vat';
import { isUuid, newId } from '../domain/ids';

describe('Money', () => {
  it('rounds half-up and formats', () => {
    expect(Money.of('1.005').toString()).toBe('1.01');
    expect(Money.of('1368.5').format('ar')).toBe('1,368.50 ر.س');
    expect(Money.of('1368.5').format('en')).toBe('SAR 1,368.50');
  });
  it('arithmetic is exact (no float drift)', () => {
    const m = Money.of('0.1').plus(Money.of('0.2'));
    expect(m.toString()).toBe('0.30');
    expect(Money.of('10').times('0.15').toString()).toBe('1.50');
    expect(Money.of('57.50').percent(15).toString()).toBe('8.63');
  });
  it('rejects invalid input', () => {
    expect(() => Money.of('abc')).toThrow();
  });
});

describe('VAT (ZATCA per-line rounding)', () => {
  it('computes per line and sums lines', () => {
    const t = computeTotals([
      { quantity: 1, unitPrice: Money.of('650') },
      { quantity: 1, unitPrice: Money.of('420') },
      { quantity: 1, unitPrice: Money.of('120') },
    ]);
    expect(t.subtotal.toString()).toBe('1190.00');
    expect(t.vatTotal.toString()).toBe('178.50');
    expect(t.total.toString()).toBe('1368.50');
  });
  it('per-line rounding differs from total rounding (the ZATCA case)', () => {
    // three lines of 0.03 → each VAT 0.0045 → 0.00 per line (half-up on 0.0045 → 0.00), sum 0.00
    // versus total-based: 0.09 × 15% = 0.0135 → 0.01
    const t = computeTotals([1, 2, 3].map(() => ({ quantity: 1, unitPrice: Money.of('0.03') })));
    expect(t.vatTotal.toString()).toBe('0.00');
    const line = computeLine({ quantity: 3, unitPrice: Money.of('0.03') });
    expect(line.vat.toString()).toBe('0.01');
  });
  it('rejects discount > line and qty <= 0', () => {
    expect(() => computeLine({ quantity: 1, unitPrice: Money.of('10'), discount: Money.of('11') })).toThrow(RangeError);
    expect(() => computeLine({ quantity: 0, unitPrice: Money.of('10') })).toThrow(RangeError);
  });
});

describe('ids', () => {
  it('generates time-ordered UUIDv7', () => {
    const a = newId(), b = newId();
    expect(isUuid(a)).toBe(true);
    expect(a.charAt(14)).toBe('7');
    expect(a < b || a === b).toBe(true);
  });
});
