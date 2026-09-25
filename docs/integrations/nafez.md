# نافذ (Nafez) — assumed integration contract (electronic promissory notes)

> Status: **assumed** (mock only). Requires an agreement with the Ministry of Justice; API shapes are placeholders.
> Port: `apps/api/src/modules/promissory-notes/application/ports/nafez.port.ts` · Mock: `infrastructure/nafez/nafez.mock.adapter.ts`

## Flows we rely on
1. **Issue** on `WorkOrderApproved` (payment_terms=deferred): `createNote(creditor, debtor, amount, dueDate, place, references)` with idempotency key `nafez.create_note:<note_id>` → `{noteRef, status: issued|pending_consent}`. Draft row is written first so retries converge.
2. **Partial settlement** on `InvoicePartiallyPaid`: `updateOutstanding(noteRef, remaining)`.
3. **Close on payment** on `InvoicePaid`: `closeNote(noteRef, {reason:'paid'})` → then the settlement (مخالصة) is created and hashed — **one outbox handler, retried with backoff, dead-lettered after 6 attempts** (`integration_requests` keyed `outbox:<id>:<handler>`).
4. **Cancel** when the work order is cancelled before execution (only `issued`, never partially settled).
5. **Enforcement** (Najiz) is manual for now: we build the evidence bundle (manifest + zip) and track `enforcement_cases`; a live Najiz adapter may file it later.

## Assumptions to verify
- Debtor identification (national id vs Nafath subject), consent model (does the debtor confirm in Nafez/Nafath?), sandbox availability, webhooks vs polling for `pending_consent → issued`, whether outstanding can be updated on an issued note or a replacement note is required, and fee schedule.
- Legal wording of the note/settlement documents (currently Arabic templates in `infrastructure/render`).
