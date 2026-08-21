/**
 * Chart of accounts — codes are stable strings persisted in ledger_accounts.code.
 * Platform-level accounts have no org; per-org accounts embed the org UUID.
 * See docs/04-DATABASE.md §4.2.
 */
export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export interface AccountRef {
  code: string;
  type: AccountType;
  orgId?: string;
}

const org = (prefix: string, type: AccountType) => (orgId: string): AccountRef => {
  if (!/^[0-9a-f-]{36}$/i.test(orgId)) throw new RangeError(`invalid orgId for account ${prefix}: ${orgId}`);
  return { code: `${prefix}:${orgId}`, type, orgId };
};

export const Accounts = {
  /** Money captured by the PSP but not yet settled to our bank (asset). */
  pspClearing: { code: 'psp_clearing', type: 'asset' } satisfies AccountRef,
  /** Our bank account (asset). */
  bank: { code: 'bank', type: 'asset' } satisfies AccountRef,
  /** VAT collected on platform fees (liability). */
  vatPayable: { code: 'vat_payable', type: 'liability' } satisfies AccountRef,
  /** Refunds owed back to a payer, before PSP executes them (liability). */
  refundsPayable: { code: 'refunds_payable', type: 'liability' } satisfies AccountRef,
  /** Platform revenue by stream. */
  revenue: (stream: 'commission' | 'note_fee' | 'logistics' | 'subscription' | 'serial_fee' | 'transport_margin'): AccountRef => ({
    code: `platform_revenue:${stream}`,
    type: 'revenue',
  }),
  /** Funds held in escrow on behalf of an org (liability to that org, not yet earned). */
  escrowLiability: org('escrow_liability', 'liability'),
  /** Funds released and available for payout to an org (liability). */
  orgAvailable: org('org_available', 'liability'),
  /** Amounts an org owes the platform (e.g. cash-paid note fees) (asset). */
  orgReceivable: org('org_receivable', 'asset'),
} as const;

/** Parse an account code back into its parts (for admin views / seeding ledger_accounts). */
export function parseAccountCode(code: string): { base: string; orgId?: string } {
  const [base, orgId] = code.split(':') as [string, string | undefined];
  if (base.startsWith('platform_revenue')) return { base: code };
  return orgId ? { base, orgId } : { base };
}
