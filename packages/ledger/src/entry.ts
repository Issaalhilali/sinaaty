import { type AccountRef } from './accounts';
import { Decimal, type AmountInput, round2 } from './money';

export interface LedgerLineDraft {
  account: AccountRef;
  debit: Decimal;
  credit: Decimal;
}

export interface LedgerEntryDraft {
  entryType: string; // payment_captured | escrow_release | fee | payout | refund | subscription | adjustment
  idempotencyKey: string;
  refTable?: string;
  refId?: string;
  description?: string;
  lines: LedgerLineDraft[];
}

export class UnbalancedEntryError extends Error {
  constructor(public readonly debit: Decimal, public readonly credit: Decimal, public readonly entryType: string) {
    super(`ledger entry "${entryType}" is unbalanced: debit=${debit.toFixed(2)} credit=${credit.toFixed(2)}`);
    this.name = 'UnbalancedEntryError';
  }
}

export function totals(lines: LedgerLineDraft[]): { debit: Decimal; credit: Decimal } {
  return lines.reduce(
    (acc, l) => ({ debit: acc.debit.plus(l.debit), credit: acc.credit.plus(l.credit) }),
    { debit: new Decimal(0), credit: new Decimal(0) },
  );
}

/** Throws unless Σdebit === Σcredit (to the cent) and every line is well-formed. */
export function assertBalanced(entry: LedgerEntryDraft): void {
  if (entry.lines.length < 2) throw new Error(`ledger entry "${entry.entryType}" needs at least 2 lines`);
  for (const l of entry.lines) {
    if (l.debit.lt(0) || l.credit.lt(0)) throw new Error('ledger line amounts must be >= 0');
    if (l.debit.gt(0) && l.credit.gt(0)) throw new Error('a ledger line cannot be both debit and credit');
    if (l.debit.eq(0) && l.credit.eq(0)) throw new Error('a ledger line must move money');
    if (!l.debit.eq(round2(l.debit)) || !l.credit.eq(round2(l.credit))) throw new Error('ledger amounts must have 2 decimals');
  }
  const { debit, credit } = totals(entry.lines);
  if (!debit.eq(credit)) throw new UnbalancedEntryError(debit, credit, entry.entryType);
}

/** Fluent builder: `entry('x', key).debit(acc, 10).credit(acc2, 10).build()` — build() asserts balance. */
export class EntryBuilder {
  private readonly lines: LedgerLineDraft[] = [];
  private meta: Omit<LedgerEntryDraft, 'lines'>;

  constructor(entryType: string, idempotencyKey: string) {
    if (!idempotencyKey) throw new Error('idempotencyKey is required');
    this.meta = { entryType, idempotencyKey };
  }
  ref(refTable: string, refId: string): this {
    this.meta = { ...this.meta, refTable, refId };
    return this;
  }
  describe(description: string): this {
    this.meta = { ...this.meta, description };
    return this;
  }
  debit(account: AccountRef, amt: AmountInput): this {
    const a = round2(amt);
    if (a.gt(0)) this.lines.push({ account, debit: a, credit: new Decimal(0) });
    return this;
  }
  credit(account: AccountRef, amt: AmountInput): this {
    const a = round2(amt);
    if (a.gt(0)) this.lines.push({ account, debit: new Decimal(0), credit: a });
    return this;
  }
  build(): LedgerEntryDraft {
    const e: LedgerEntryDraft = { ...this.meta, lines: [...this.lines] };
    assertBalanced(e);
    return e;
  }
}
export const entry = (entryType: string, idempotencyKey: string) => new EntryBuilder(entryType, idempotencyKey);
