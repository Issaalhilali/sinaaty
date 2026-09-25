# نفاذ (Nafath) — assumed integration contract

> Status: **assumed** (mock only). Replace with the real contract once the NIC/SDAIA agreement and API docs are in hand.
> Port: `apps/api/src/modules/identity/application/ports/nafath.port.ts` · Mock: `infrastructure/nafath/nafath.mock.adapter.ts`

## Flows we rely on
1. **Login (SSO-like):** `initiate(nationalId, 'login')` → provider returns `transactionId` + a **2-digit random number**; the user opens the Nafath app and taps the matching number → `status(transactionId)` becomes `approved` with claims `{nationalId, sub, fullNameAr?, phone?}` → we upsert the user (`users.national_id_hash/enc`, `user_identities(provider='nafath')`, `nafath_verified_at`) and open a session.
2. **Sign a document (Step 7):** `initiate(nationalId, 'sign')` with our document hash bound to the transaction; on approval we store `work_order_signatures{method='nafath', provider_tx_ref, signed_hash}`.

## Assumptions to verify with the provider
- Random-number confirmation model (2 digits) and a ~3-minute expiry.
- Whether status is polled (`GET status`) or pushed (webhook) — we support both: `GET /v1/auth/nafath/status/:tx` and `POST /v1/auth/nafath/callback` (secured by `NAFATH_CALLBACK_SECRET`; live adapter must verify the provider signature instead).
- Claims available on approval (name, phone) and their Arabic/English forms.
- Sandbox availability; per-request idempotency (`integration_requests`).

## Mock behaviour (dev/test)
- Auto-approves after `NAFATH_MOCK_AUTO_APPROVE_MS` (default 1500ms; tests use 0).
- Callback endpoint can force `approved|rejected|expired` for demos and tests.
- Claims: `fullNameAr='مستخدم نفاذ (تجريبي)'`, `sub='nafath:<nationalId>'`.
