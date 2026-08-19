# apps/admin-web — صناعتي · الإدارة

Next.js 15 (App Router) back-office. Arabic RTL, tokens from `docs/design/sinaaty-ui-v2.html`.

## Run
```bash
pnpm --filter admin-web dev          # http://localhost:3001 (API must run on :3000)
pnpm --filter admin-web build
pnpm --filter admin-web test:e2e     # Playwright smoke (needs API + seed + a running admin-web)
```
`NEXT_PUBLIC_API_BASE_URL` selects the API (default `http://localhost:3000`). Sign in with a seeded platform-staff phone (`+966500000099` in dev); accounts without a platform role are refused.

## Rules
- Every sensitive action goes through `ReasonDialog` → the API records the reason in `audit_log`.
- No domain writes here beyond settings/roles/DLQ retry: KYB, escrow and payouts call the owning module's admin endpoints.
- Money is always `fmtMoney` (Western digits, tabular figures, `ر.س`); dates render in Asia/Riyadh.
