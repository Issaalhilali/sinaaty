import Decimal from 'decimal.js';
import { Money } from './money';

export const DEFAULT_VAT_RATE_PCT = 15;

export interface VatLineInput {
  quantity: Decimal | string | number;
  unitPrice: Money;
  discount?: Money;
  vatRatePct?: number;
}
export interface VatLineResult {
  net: Money; // (qty × unit) − discount, excl. VAT
  vat: Money; // rounded half-up per line (ZATCA)
  gross: Money;
}
export interface VatTotals {
  subtotal: Money;
  discountTotal: Money;
  vatTotal: Money;
  total: Money;
  lines: VatLineResult[];
}

/** ZATCA rule: compute VAT per line, round each line to 2dp, then sum lines. */
export function computeLine(input: VatLineInput): VatLineResult {
  const qty = new Decimal(input.quantity);
  if (qty.lte(0)) throw new RangeError('quantity must be > 0');
  const discount = input.discount ?? Money.ZERO;
  const net = input.unitPrice.times(qty).minus(discount);
  if (net.isNegative()) throw new RangeError('discount exceeds line amount');
  const vat = net.percent(input.vatRatePct ?? DEFAULT_VAT_RATE_PCT);
  return { net, vat, gross: net.plus(vat) };
}

export function computeTotals(lines: VatLineInput[]): VatTotals {
  const results = lines.map(computeLine);
  const subtotal = Money.sum(results.map((r) => r.net));
  const discountTotal = Money.sum(lines.map((l) => l.discount ?? Money.ZERO));
  const vatTotal = Money.sum(results.map((r) => r.vat));
  return { subtotal, discountTotal, vatTotal, total: subtotal.plus(vatTotal), lines: results };
}
