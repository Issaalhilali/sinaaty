import Decimal from 'decimal.js';

/** All ledger math is 2dp SAR with ROUND_HALF_UP (ZATCA rule). Never use JS numbers for amounts. */
export const SCALE = 2;
export type AmountInput = Decimal | string | number;

export function amount(v: AmountInput): Decimal {
  return new Decimal(v);
}
export function round2(v: AmountInput): Decimal {
  return new Decimal(v).toDecimalPlaces(SCALE, Decimal.ROUND_HALF_UP);
}
export function isPositive(v: AmountInput): boolean {
  return new Decimal(v).gt(0);
}
/** basis points → fraction, e.g. 500 → 0.05 */
export function bpsToRate(bps: number): Decimal {
  if (!Number.isInteger(bps) || bps < 0 || bps > 10_000) throw new RangeError(`invalid bps: ${bps}`);
  return new Decimal(bps).div(10_000);
}
/** Split `total` into shares that sum exactly to total (largest-remainder), all 2dp. */
export function allocate(total: AmountInput, weights: number[]): Decimal[] {
  const t = round2(total);
  const w = weights.map((x) => new Decimal(x));
  const sum = w.reduce((a, b) => a.plus(b), new Decimal(0));
  if (sum.lte(0)) throw new RangeError('weights must sum to > 0');
  const raw = w.map((x) => t.mul(x).div(sum));
  const floored = raw.map((x) => x.toDecimalPlaces(SCALE, Decimal.ROUND_DOWN));
  let remainder = t.minus(floored.reduce((a, b) => a.plus(b), new Decimal(0)));
  const order = raw.map((x, i) => ({ i, frac: x.minus(floored[i]!) })).sort((a, b) => b.frac.comparedTo(a.frac));
  const cent = new Decimal(1).div(10 ** SCALE);
  for (const { i } of order) {
    if (remainder.lte(0)) break;
    floored[i] = floored[i]!.plus(cent);
    remainder = remainder.minus(cent);
  }
  return floored;
}
export { Decimal };
