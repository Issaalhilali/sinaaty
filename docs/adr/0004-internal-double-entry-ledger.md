# ADR 0004 — Internal double-entry ledger as the source of truth for money

- **Status:** Accepted
- **Date:** 2026-08-17
- **Related:** docs/02-ARCHITECTURE.md (payments/escrow), docs/04-DATABASE.md (`ledger_*`, `escrow_holds`), [ADR 0003](./0003-prisma-plus-raw-sql-ledger.md)

## Context

Every rial on the platform is somebody's liability: customer payments are captured by a licensed PSP into an
**escrow hold**, released to the provider after delivery/confirmation, minus platform fees and VAT; refunds, disputes
(split), payouts, dunning and promissory-note settlements all move value between parties. Regulators (SAMA-licensed
PSP, ZATCA) and future audits require that any balance be reconstructible from immutable postings, and that org
wallets never disagree with the PSP settlement reports.

Options considered:

1. Store balances as mutable columns on `organizations` / `escrow_holds`.
2. Outsource the ledger entirely to the PSP/escrow provider's reports.
3. **Own an internal double-entry ledger**; the PSP is a bank-side mirror reconciled against it.

## Decision

- Tables `ledger_accounts`, `ledger_entries` (append-only header: reference type/id, idempotency key, posted_at),
  `ledger_lines` (account, debit/credit `NUMERIC(14,2)`, currency SAR). Balances are a view/materialized view
  (`ledger_balances`), never a stored column that code mutates.
- **Every financial effect is a balanced entry** posted through `packages/ledger` (`post(entry)`), which asserts
  Σdebit = Σcredit in code, and the DB trigger `assert_entry_balanced` asserts it again on commit.
- Chart of accounts is resolved by helper, e.g. `escrow_liability:{org}`, `wallet:{org}`, `platform_fee_revenue`,
  `vat_payable`, `psp_clearing`, `refunds_pending`, so account creation is lazy and deterministic.
- Postings happen **inside the same DB transaction** as the domain state change (escrow release, refund, payout) and
  carry the outbox event; never posted from a webhook handler without idempotency (`webhook_events` unique key).
- Append-only guarantee is enforced by trigger; no UPDATE/DELETE on `ledger_entries`/`ledger_lines`. Corrections are
  reversing entries.
- Reconciliation job compares PSP/escrow provider settlement reports to `psp_clearing` daily; discrepancies raise
  ops alerts in the admin back-office.

## Consequences

**Positive** — provable balances, dispute/refund/split math is just more entries, org wallet and payout screens read
one view; auditors get an immutable trail.

**Negative / mitigations** — more code per money movement → the `packages/ledger` helper and a fixed posting
catalogue (docs/02-ARCHITECTURE.md) keep entries declarative; property tests assert the ledger is always balanced.
