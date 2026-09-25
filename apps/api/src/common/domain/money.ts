import Decimal from 'decimal.js';

/**
 * Money value object — SAR, 2dp, ROUND_HALF_UP. Immutable. Never construct from float arithmetic;
 * pass strings/Decimals from the DB or user input.
 */
export class Money {
  static readonly CURRENCY = 'SAR';
  static readonly ZERO = new Money(new Decimal(0));

  private constructor(private readonly value: Decimal) {}

  static of(v: Decimal | string | number): Money {
    const d = new Decimal(v);
    if (!d.isFinite()) throw new RangeError('invalid money amount');
    return new Money(d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP));
  }
  static sum(items: Money[]): Money {
    return items.reduce((a, b) => a.plus(b), Money.ZERO);
  }

  plus(o: Money): Money {
    return new Money(this.value.plus(o.value));
  }
  minus(o: Money): Money {
    return new Money(this.value.minus(o.value));
  }
  times(factor: Decimal | string | number): Money {
    return Money.of(this.value.mul(new Decimal(factor)));
  }
  /** percentage, e.g. 15 → ×0.15, rounded half-up */
  percent(pct: Decimal | string | number): Money {
    return Money.of(this.value.mul(new Decimal(pct)).div(100));
  }
  isZero(): boolean {
    return this.value.isZero();
  }
  isNegative(): boolean {
    return this.value.lt(0);
  }
  gt(o: Money): boolean {
    return this.value.gt(o.value);
  }
  gte(o: Money): boolean {
    return this.value.gte(o.value);
  }
  equals(o: Money): boolean {
    return this.value.eq(o.value);
  }
  compare(o: Money): -1 | 0 | 1 {
    return this.value.comparedTo(o.value) as -1 | 0 | 1;
  }
  /** Decimal for Prisma / ledger interop */
  toDecimal(): Decimal {
    return this.value;
  }
  /** "1368.50" — canonical DB/API string */
  toString(): string {
    return this.value.toFixed(2);
  }
  toJSON(): string {
    return this.toString();
  }
  /** Arabic-friendly display: 1,368.50 ر.س */
  format(locale: 'ar' | 'en' = 'ar'): string {
    const [int, frac] = this.value.toFixed(2).split('.') as [string, string];
    const withSep = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return locale === 'ar' ? `${withSep}.${frac} ر.س` : `SAR ${withSep}.${frac}`;
  }
}
