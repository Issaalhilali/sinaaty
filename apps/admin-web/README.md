# apps/admin-web — صناعتي · الإدارة

Next.js 15 (App Router) back-office. Arabic RTL, tokens from `docs/design/sinaaty-ui-v2.html`.

## Run
```bash
pnpm --filter admin-web dev          # http://localhost:3001 (API must run on :3000)
pnpm --filter admin-web build
pnpm --filter admin-web test:e2e     # Playwright smoke (needs API + seed + a running admin-web)
```
`NEXT_PUBLIC_API_BASE_URL` selects the API (default `http://localhost:3000`).

## من يستطيع الدخول؟
الدخول مقصور على أصحاب **دور منصة** (`support | ops | finance | compliance | super_admin`). أي رقم آخر يُرفض برسالة صريحة.
- الحساب المزروع في التطوير: `0500000099` (مشرف عام).
- لمنح رقمك دوراً (ينشئ المستخدم إن لم يكن موجوداً):
```bash
pnpm --filter api grant:role -- 0512345678 super_admin "اسمك"
```
  السحب: نفس الأمر بالدور `none`. من داخل اللوحة: **المستخدمون ← تغيير الدور** (لمشرف عام فقط، وبسبب مكتوب).
- صيغ الجوال المقبولة: `05xxxxxxxx` · `+9665xxxxxxxx` · `009665xxxxxxxx` · `5xxxxxxxx` (تظهر لك الصيغة النهائية تحت الحقل قبل الإرسال).

## Rules
- Every sensitive action goes through `ReasonDialog` → the API records the reason in `audit_log`.
- No domain writes here beyond settings/roles/DLQ retry: KYB, escrow and payouts call the owning module's admin endpoints.
- Money is always `fmtMoney` (Western digits, tabular figures, `ر.س`); dates render in Asia/Riyadh.
