# مزود الدفع (PSP) + الحساب الضامن — assumed contract

> Status: **assumed** (mock only). Candidates: Moyasar / HyperPay / Tap / PayTabs (SAMA-licensed, Mada + Apple Pay). Escrow itself must sit with a licensed partner (bank / PSP split-payout) — see PRD §9 R2.
> Port: `apps/api/src/modules/payments/application/ports/psp.port.ts` · Mock: `infrastructure/psp/psp.mock.adapter.ts`

## Flows
1. `createIntent(paymentId, amount, method)` → `{intentId, clientSecret|redirectUrl}` → app shows Mada/Apple Pay sheet.
2. Provider webhook → `POST /v1/webhooks/psp` (raw body + `x-psp-signature` HMAC in mock; provider-specific in live) → `parseWebhook` verifies → inbox `webhook_events(provider='psp', provider_event_id='<vendor>:<id>')` (unique → replays are no-ops) → payment captured → `escrow_holds` + ledger `psp_clearing → escrow_liability:{org}` → invoice paid → outbox `InvoicePaid` (Step 10 closes the note).
3. Release (customer confirm / 72h auto / dispute decision) → ledger `escrow_liability → org_available + platform_revenue:commission + vat_payable`.
4. Payout batches (`payouts` + `payout_items`) → `psp.payout()` → ledger `org_available → bank`.
5. Refund before release → ledger `escrow_liability → refunds_payable` then `psp.refund(chargeId)`.

## Assumptions to verify with the chosen provider
- Intent/charge object names, webhook signature scheme and replay semantics, refund/payout APIs and settlement reports (for `psp_settlement` reconciliation).
- Whether the provider offers a compliant escrow/split account or we contract a bank; the ledger design is provider-agnostic.
