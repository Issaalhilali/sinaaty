# CLAUDE.md — Sinaaty (صناعتي)

Guidance for Claude Code when working in this repository. Read this fully before touching code.

## 1. What this project is

**Sinaaty (صناعتي)** is a three-sided platform for the Saudi automotive service sector: customers & fleets ↔ workshops/factories ↔ parts dealers/scrapyards, plus tow trucks/logistics. Its core differentiator is the **legal + financial layer**:

- Work orders are digitally signed by the customer via **Nafath (نفاذ)**.
- Deferred/unpaid amounts become an **electronic promissory note (سند لأمر)** issued through **Nafez (نافذ)**, enforceable via **Najiz (ناجز)**.
- Payments (Mada / Apple Pay) go through a licensed PSP into an **escrow hold**; funds are released to the provider only after delivery/confirmation.
- Paying the invoice **automatically closes the note** and issues a digital **settlement/clearance (مخالصة)**.
- Invoices are **ZATCA** compliant (Phase 1 now, Phase 2 Fatoora in P3).
- Parts are sourced by **VIN + reverse auction** and, from **parts distributors/brand agents**, via a **VIN-fitment catalog with live inventory (Buy Now)**; workshops buy from distributors on a **Nafez-secured trade account** (every deferred invoice = promissory note); genuine parts carry a **QR serial (anti-counterfeit)** and used/new parts carry a **digital warranty** (part + labor).

Authoritative documents (read the relevant one before implementing a feature):

| Doc | Purpose |
|---|---|
| `docs/01-PRD.md` | Product requirements, personas, FR/NFR IDs (e.g. `FR-PAY-04`), phases |
| `docs/02-ARCHITECTURE.md` | Modules, sequence diagrams, state machines, integrations, API map |
| `docs/03-TECH-STACK.md` | Chosen technologies, packages, monorepo layout |
| `docs/04-DATABASE.md` + `docs/db/schema.sql` | Data model (79 tables). `schema.sql` is the human source of truth; Prisma migrations must match it |
| `docs/06-DASHBOARDS.md` | Dashboard specs: admin back-office (roles, screens, KPIs, critical screens), workshop dashboard, distributor/scrapyard dashboards, fleet portal. Build Step 14/15/22/26 UIs from it |
| `docs/05-USER-FLOWS.md` | Day-in-the-life flows, screen maps, edge cases per party (workshop, customer, parts distributor, scrapyard, driver, admin). Build Flutter screens from these maps; turn edge cases into acceptance tests |
| `docs/adr/` | Architecture Decision Records — add one for every non-trivial decision |

When PRD/Architecture and code disagree, **stop and ask** (or write an ADR) — do not silently diverge.

## 2. Repository layout (target monorepo)

```
sinaaty/
├── CLAUDE.md
├── docs/                      # PRD, architecture, DB, ADRs
├── apps/
│   ├── mobile/                # Flutter — customer | partner | fleet flavors  (currently the root Flutter template; see §8 step 0)
│   ├── api/                   # NestJS modular monolith (REST + WebSocket + BullMQ workers)
│   └── admin-web/             # Next.js back-office
├── packages/
│   ├── shared-types/          # TS enums/DTOs; OpenAPI → Dart codegen source
│   ├── zatca-ubl/             # UBL 2.1 XML + XAdES + QR TLV
│   ├── ledger/                # double-entry posting helpers
│   └── ui-tokens/             # design tokens (colors, spacing, Arabic fonts)
├── infra/                     # docker-compose, terraform, helm
└── .github/workflows/
```

**Current state (2026-08-17, after Step 2):** monorepo in place (Step 0); `apps/api` scaffolded — NestJS 11, Clean Architecture layers with lint-enforced dependency rule, `/v1/health`, Swagger `/docs`, bilingual error envelope, pino, throttler (Step 1); Prisma schema with 79 models generated from `docs/db/schema.sql` via the init migration, idempotent seed, drift check (Step 2); shared kernel — `packages/shared-types` (46 enums generated from schema.prisma, `gen:check` in CI), `packages/ledger` (balanced entries, chart of accounts, posting templates, 11 tests incl. property test), `apps/api/src/common/` (Money, VAT per-line, UUIDv7, AES-256-GCM `PiiCryptoService`, PII redaction, `AuditLogWriter` hash chain + advisory lock, `OutboxWriter`) all in `CommonModule` (Step 3); identity module — Nafath port + mock (auto-approve, forced states via callback), OTP (6-digit, hashed, 3/10min, 5 attempts), EdDSA access JWT (15 min) + opaque refresh with rotation & family reuse detection, devices, global `JwtAuthGuard` (default deny, `@Public()`), `RolesGuard` (`@Roles({platform, org, nafath})`), `@CurrentUser()`, `assertOwnership()`; 16 e2e tests (Step 4). `apps/admin-web`, `packages/zatca-ubl|ui-tokens` still empty. Local DB without Docker: `apps/api/tools/dev-db.sh start` (PostgreSQL 17 + PostGIS via Homebrew — Docker Hub is unreachable on the dev machine).

**Schema workflow (Step 2 decision):** `docs/db/schema.sql` → `pnpm --filter api schema:sync` (copies it verbatim into `prisma/migrations/00000000000000_init/migration.sql`) → `prisma migrate deploy` → `prisma db pull` → `pnpm --filter api prisma:normalize` (PascalCase models / camelCase fields + `@map`) → `prisma generate`. `pnpm --filter api db:verify` = sync-check + migrate + seed + drift-check (CI). Any later schema change = a new SQL migration file **and** the same edit in `docs/db/schema.sql`.

## 3. Tech stack (summary — details in docs/03-TECH-STACK.md)

- **Mobile/Web apps:** Flutter 3.x / Dart ≥3.13, Riverpod (codegen), go_router, dio+retrofit, freezed, drift (offline), socket_io_client, ARB i18n (Arabic default, RTL first).
- **API:** NestJS 11 on Node 22, TypeScript strict, Prisma 6 + raw `pg` for ledger, Zod validation (`nestjs-zod`), BullMQ on Redis 7, Socket.IO gateway, pino logs, OpenTelemetry.
- **DB:** PostgreSQL 16 + PostGIS + pg_trgm + pgcrypto. Redis 7. S3-compatible object storage. Meilisearch.
- **Admin:** Next.js 15 App Router, shadcn/ui, TanStack Table/Query.
- **Tooling:** pnpm workspaces + Turborepo, ESLint/Prettier, Husky + commitlint (Conventional Commits), Vitest/Jest + Supertest + Testcontainers, flutter_test + integration_test.

## 4. Commands

```bash
# ---- Backend (apps/api) ----
pnpm install
pnpm --filter api dev                 # nest start --watch
pnpm --filter api test                # unit
pnpm --filter api test:e2e            # supertest + testcontainers (needs Docker)
pnpm --filter api lint
pnpm --filter api prisma:migrate      # prisma migrate dev
pnpm --filter api db:verify           # schema sync-check + migrate deploy + seed + drift-check (CI)
pnpm --filter api prisma:generate
pnpm --filter api seed                # dev seed (makes, categories, plans, demo orgs)
pnpm --filter api openapi:export      # writes packages/shared-types/openapi.json

# ---- Infra ----
docker compose -f infra/docker/docker-compose.yml up -d   # postgres(postgis), redis, minio, meilisearch, mailpit

# ---- Mobile (apps/mobile) ----
flutter pub get
dart run build_runner build --delete-conflicting-outputs
flutter run --flavor customer --dart-define-from-file=env/dev.json -t lib/main_customer.dart
flutter run --flavor partner  --dart-define-from-file=env/dev.json -t lib/main_partner.dart
flutter test
flutter analyze
dart run tool/gen_api.dart            # OpenAPI → lib/core/api/generated

# ---- Admin (apps/admin-web) ----
pnpm --filter admin-web dev

# ---- Whole repo ----
pnpm turbo lint test build
```

Until step 0 is done, the only working commands are the plain Flutter ones at repo root (`flutter pub get`, `flutter analyze`, `flutter test`).

## 5. Engineering rules (non-negotiable)

### 5.0 Simplicity charter (overrides everything below when in conflict)

The owner's directive: **no distraction, no complexity — simple flows, calm high-quality design, one integrated product.** The platform is large underneath; the surface must feel small.

1. **One primary action per screen.** Every screen answers one question and has one big obvious button. Secondary actions go behind a "more" menu.
2. **Three to four tabs, never more.** Customer app: `سياراتي · اطلب · محفظتي · حسابي`. Partner app: `اليوم · الأوامر · القطع · المحفظة` (role decides what's inside). Scrapyard sees only `طلبات · مبيعاتي · محفظتي`.
3. **Progressive disclosure.** Advanced features (trade accounts, group buys, analytics, fleet policies, voice, AI) are hidden until the user actually needs them or their role/plan enables them. Default screens show only MVP essentials.
4. **Two-tap rule for daily tasks:** create work order, update status, approve, pay, submit bid, scan QR — each reachable in ≤ 2 taps from the home tab.
5. **Copy is short and human.** Arabic first, plain words, no jargon on screen (never "escrow"/"outbox"/"snapshot" — say "المبلغ محفوظ حتى تستلم"). One sentence of explanation max under any legal action.
6. **Calm visuals.** One accent color (seal green) + one secondary (brass) used sparingly; semantic colors only for state; generous spacing; no decorative animation; no dense dashboards on mobile (charts live in web only).
7. **Empty states teach**, errors say what to do next, loading never blocks the whole screen.
8. **Consistency over cleverness.** Same components everywhere (`packages/ui-tokens` + a shared Flutter component library `lib/core/ui/`): cards, badges, buttons, timeline, list rows. No one-off widgets.
9. **Cut before you add.** When a step asks for a feature, ship the minimal version that completes the flow end-to-end; log extras in `docs/backlog.md` instead of building them.
10. **Design review gate:** each Flutter step must include screenshots (light/dark, RTL) and pass the checklist above before it is marked ✅.

### 5.1 Money, time, IDs, text
- Money: DB `NUMERIC(14,2)`; TS `Decimal` (`decimal.js`); Dart `Decimal` (package `decimal`). **Never** `number`/`double` for amounts. Rates in basis points (`_bps`) or `NUMERIC(5,2)` percentages.
- VAT default 15%; compute per line, round half-up to 2 dp per line, sum lines (ZATCA rule).
- Time: store `timestamptz` UTC; display `Asia/Riyadh`; Hijri only at presentation layer.
- IDs: UUIDv7 generated in app (`uuidv7` pkg / Dart `uuid` v7). Human numbers via SQL `next_number('WO')`.
- Text: `_ar` mandatory, `_en` optional. UI strings in ARB files, never hard-coded Arabic in widgets.

### 5.2 Domain integrity
- State transitions go through the module service's `transition()` only (work orders, promissory notes, escrow, part orders, transport). Every transition writes a history row + audit log + outbox event in the **same DB transaction**.
- Approval snapshots (`work_order_versions`) are immutable; the customer signs the `snapshot_sha256`. Changing scope after approval = new version + new signature.
- Ledger: every financial effect is a balanced `ledger_entries` + `ledger_lines` posting via `packages/ledger`. Never mutate balances directly. Never post outside a transaction.
- Append-only tables (audit_log, ledger_entries, work_order_versions, work_order_signatures, settlements, promissory_note_events): no UPDATE/DELETE, ever — the DB trigger will reject it; do not remove the trigger.
- Idempotency: every outbound integration call and every inbound webhook carries an idempotency key persisted in `integration_requests` / `webhook_events`.

### 5.3 Integrations (Anti-Corruption Layer)
- Each provider lives in `apps/api/src/modules/integrations/<provider>/` with: `<provider>.port.ts` (interface), `<provider>.adapter.ts` (real), `<provider>.mock.adapter.ts` (dev/test), `<provider>.mapper.ts`.
- Domain modules depend on the **port**, never on the adapter or provider SDK.
- Provider selection by env: `INTEGRATION_NAFATH=mock|live` etc. Default in dev/test = `mock`. CI must pass with all mocks.
- Never log PII or secrets from provider payloads; use the redaction helper before persisting `request_payload`.
- Nafath / Nafez / Najiz / Monjez APIs are contractual and may differ from assumptions — implement against the port, keep the adapter thin, and document the assumed contract in `docs/integrations/<provider>.md`.

### 5.4 Security & privacy
- Nafath (OIDC) for individuals; OTP for operational roles. Access JWT 15 min, refresh rotation with family reuse detection.
- Encrypt `national_id`, `iban`, CSIDs with AES-256-GCM (`packages/../crypto` helper); keys from env/KMS, never in repo.
- RBAC guards + resource ownership checks in every controller. Default deny.
- No PII in logs, URLs, or analytics. Redact in pino serializers.
- Data residency: no external SaaS that stores PII outside KSA without an ADR.

### 5.5 Clean Architecture (mandatory in both apps)

**Dependency rule:** source code dependencies point inward only: `presentation/interface → application → domain`; `infrastructure` implements domain/application ports and is wired only at the composition root (Nest module / Riverpod provider overrides). Domain never imports Nest, Prisma, Dio, Flutter, or any provider SDK.

**Backend — every NestJS module (`apps/api/src/modules/<name>/`) is a bounded context with 4 layers:**
```
<name>/
├── domain/            # pure TS: entities, value objects (Money, Vin), enums, domain events,
│                      #   state machines (transition tables), domain errors, repository PORTS (interfaces)
├── application/       # use cases (one class per command/query, e.g. approve-work-order.use-case.ts),
│                      #   DTOs (Zod schemas), application ports (NafathPort, ClockPort, IdGeneratorPort, OutboxPort)
├── infrastructure/    # Prisma repositories implementing domain ports, provider adapters (+ .mock.adapter.ts),
│                      #   mappers (Prisma row ⇄ entity), BullMQ processors, event subscribers
├── interface/         # http/ (controllers, guards, request/response mappers), ws/ (gateways), cli/
├── <name>.module.ts   # composition root: binds ports → adapters based on env (INTEGRATION_*=mock|live)
└── __tests__/         # domain + use-case tests run without DB (in-memory repos); infra tests use Testcontainers
```
Rules: controllers contain no business logic (parse → use case → map response). Use cases own the transaction boundary (`UnitOfWork` port). Cross-module calls go through the other module's **application service/port**, never its repository or tables. `packages/ledger`, `packages/zatca-ubl` are pure domain/application libraries with zero framework imports.

**Mobile — every Flutter feature (`apps/mobile/lib/features/<feature>/`) has 3 layers:**
```
<feature>/
├── domain/        # entities (freezed), value objects, repository interfaces, use cases (plain Dart)
├── data/          # DTOs (json_serializable), remote (generated API client) & local (drift) data sources,
│                  #   repository implementations, mappers DTO ⇄ entity
└── presentation/  # Riverpod controllers/notifiers (call use cases), screens, widgets (no logic)
lib/core/          # shared: api client, auth, theme, l10n, routing, error mapping, DI overrides per flavor
```
Rules: widgets never call Dio/drift directly; state lives in Riverpod notifiers; use cases return `Result<T, Failure>` (no throwing across layers); the generated OpenAPI client is used only inside `data/`.

**Enforcement:** ESLint `import/no-restricted-paths` (api) and `dart_code_metrics`/`import_lint` (mobile) forbid inward-layer violations; CI fails on violation. Add an ADR (`docs/adr/0007-clean-architecture.md`) in Step 0.

### 5.6 Code style
- TypeScript `strict: true`, no `any` (use `unknown` + Zod). ESLint + Prettier. Files kebab-case; classes PascalCase; DB snake_case (Prisma `@map`).
- NestJS module layout follows §5.5 (`domain/ application/ infrastructure/ interface/`), plus `<name>.module.ts` and `__tests__/`.
- Flutter: feature-first per §5.5, Riverpod providers with codegen, `freezed` models, no business logic in widgets. `very_good_analysis` lints.
- Commits: Conventional Commits (`feat(work-orders): …`, `fix(payments): …`). Small PRs, one module at a time.
- Tests are mandatory for: state transitions, ledger postings, VAT math, ZATCA QR/XML, escrow release rules, note close-on-payment. Aim ≥ 80% on `payments`, `promissory-notes`, `invoicing`, `work-orders`.

### 5.7 What NOT to do
- Don't add a Go/other-language service without an ADR.
- Don't call provider SDKs from domain services.
- Don't store amounts as floats or strings.
- Don't hardcode fees/limits — read from `platform_settings` / `subscription_plans`.
- Don't ship UI that is LTR-only or has English as the default locale.
- Don't create tables outside `docs/db/schema.sql` — update the SQL and the Prisma schema together.

## 6. Domain glossary (AR ↔ EN ↔ code)

| عربي | English | Code |
|---|---|---|
| أمر عمل / أمر إصلاح | Work order | `work_orders`, `WorkOrder` |
| فحص الاستلام / التسليم | Check-in / check-out inspection | `inspections.type = check_in/check_out` |
| اعتماد عبر نفاذ | Nafath approval/signature | `work_order_signatures.method = nafath` |
| سند لأمر إلكتروني | Electronic promissory note | `promissory_notes` (Nafez) |
| مخالصة | Settlement / clearance | `settlements` |
| تنفيذ (ناجز) | Enforcement | `enforcement_cases` |
| حساب ضامن | Escrow hold | `escrow_holds` |
| فاتورة ضريبية / مبسطة | Standard / simplified tax invoice | `invoices.type` |
| طلب قطعة / مزاد عكسي | Part request / reverse auction | `part_requests`, `part_bids` |
| تشليح | Scrapyard | `org_type = scrapyard`, `part_condition = used_scrapyard` |
| وكيل / موزّع قطع | Parts distributor / brand agent | `org_type = parts_distributor | parts_brand_agent`, `parts_catalog`, `part_fitments`, `supplier_inventory` |
| حساب آجل مضمون | Nafez-secured trade account | `trade_accounts` (+ `promissory_notes` per deferred order) |
| مصادقة القطعة | Genuine part check (QR serial) | `part_serials` |
| ضمان ثلاثي (قطعة + تركيب) | Part + labor warranty | `warranties.covers = part_and_labor`, `part_serial_id`, `installer_org_id` |
| شراء جماعي | Group buy | `group_buys` |
| ضمان رقمي | Digital warranty | `warranties` |
| سطحة | Tow truck | `transport_jobs.type = flatbed_tow` |
| سجل المركبة (Car Passport) | Vehicle passport | `vehicle_events` |
| أسطول | Fleet | `org_type = fleet_company`, `fleet_*` |
| المركبة المهجورة | Abandoned vehicle | `work_orders.status = abandoned`, `enforcement_cases.is_abandoned_vehicle` |

## 7. Environment variables (apps/api/.env.example — keep in sync)

```
DATABASE_URL, REDIS_URL, S3_ENDPOINT/S3_BUCKET_MEDIA/S3_BUCKET_DOCS/S3_KEY/S3_SECRET,
MEILI_HOST/MEILI_KEY, JWT_PRIVATE_KEY/JWT_PUBLIC_KEY, PII_ENC_KEY (32B base64),
INTEGRATION_NAFATH=mock|live, NAFATH_APP_ID, NAFATH_APP_KEY, NAFATH_CALLBACK_URL,
INTEGRATION_NAFEZ=mock|live, NAFEZ_BASE_URL, NAFEZ_CLIENT_ID, NAFEZ_CLIENT_SECRET,
INTEGRATION_ZATCA=mock|sandbox|live, ZATCA_BASE_URL,
INTEGRATION_PSP=mock|live, PSP_PROVIDER, PSP_API_KEY, PSP_WEBHOOK_SECRET,
INTEGRATION_ESCROW=mock|live, ESCROW_PROVIDER, ESCROW_API_KEY,
INTEGRATION_SMS=mock|live, SMS_PROVIDER, SMS_API_KEY, FCM_SERVICE_ACCOUNT_JSON,
INTEGRATION_AI=mock|live, ANTHROPIC_API_KEY, SPEECH_PROVIDER, MAPS_API_KEY, VIN_DECODER_KEY,
ESCROW_AUTO_RELEASE_HOURS=72, BIDDING_DEFAULT_MINUTES=60, ABANDONED_NOTICE_DAYS=15
```

## 8. Build plan — execute step by step, in order

Each step is a self-contained prompt for Claude Code. Do **one step per session/PR**, run its checks, then stop and report. Do not skip ahead. Mark a step done by appending `✅ <date>` to its line here.

### Phase 1 — Foundation
- **Step 0 — Restructure into monorepo.** Move the current Flutter template into `apps/mobile/` (keep git-less files intact), create `pnpm-workspace.yaml`, `turbo.json`, root `package.json`, `.editorconfig`, `.gitignore`, `infra/docker/docker-compose.yml` (postgis/postgis:16, redis:7, minio, meilisearch, mailpit), `.env.example`, `docs/adr/0001-modular-monolith.md` … `0007-clean-architecture.md`, and `git init` with an initial commit. Verify: `flutter analyze` inside `apps/mobile` passes; `docker compose up -d` starts. ✅ 2026-08-17
- **Step 1 — Scaffold `apps/api` (NestJS).** Nest CLI project, strict TS, module skeleton generator/template following §5.5 layers (`domain/ application/ infrastructure/ interface/`) + ESLint `import/no-restricted-paths` layer rules, ConfigModule with Zod-validated env, pino logger, health endpoint, Swagger at `/docs`, global exception filter with Arabic/English error envelope `{code, message_ar, message_en, details}`, request-id middleware, Throttler. Prisma init pointing to `DATABASE_URL`. Verify: `pnpm --filter api dev` serves `/health`. ✅ 2026-08-17
- **Step 2 — Prisma schema = docs/db/schema.sql.** Translate `schema.sql` into `prisma/schema.prisma` (all 79 tables, enums, `@map`s), plus a raw SQL migration for triggers/functions/views/extensions Prisma can't express (`next_number`, `assert_entry_balanced`, `audit_log_guard`, `ledger_balances`, PostGIS columns). Add materialized views `mv_org_daily_stats`, `mv_platform_daily_stats` (dashboard summaries, refreshed by a scheduled worker) in the raw migration. Add `prisma/seed.ts` (makes/models, service & part categories, plans, platform_settings, one demo workshop/scrapyard/customer). Verify: `prisma migrate dev` on fresh DB + seed; a CI script diffs Prisma vs `schema.sql`. ✅ 2026-08-17
- **Step 3 — Shared kernel.** `packages/shared-types` (enums mirrored from DB), `packages/ledger` (post(entry) with balance assertion, account resolver `escrow_liability:{org}` etc., unit tests), `apps/api/src/common/` (Decimal helpers, VAT calc, UUIDv7, crypto AES-GCM helper, PII redaction, audit-log writer with hash chain, outbox writer, `Money` value object). Verify: unit tests green. ✅ 2026-08-17
- **Step 4 — Identity module.** Nafath port + mock adapter (simulates initiate → random number → callback), OTP flow, JWT issue/refresh rotation, devices, RBAC guard + `@Roles()`, `@CurrentUser()`, ownership helper. Endpoints from Architecture §10. Verify: e2e login via mock Nafath and OTP. ✅ 2026-08-18
- **Step 5 — Organizations module.** CRUD, members/roles, locations (PostGIS), specialties, KYB documents (media upload presigned URLs → `media_assets`), bank accounts (encrypted IBAN), subscription plans/subscriptions. Admin approve/suspend endpoints. Verify: e2e create workshop → upload CR → admin approves.

### Phase 2 — MVP
- **Step 6 — Vehicles module.** Add by VIN/plate, VIN decoder port + mock, ownership, `vehicle_events` writer (Car Passport), public passport token endpoint. Verify: e2e + unit.
- **Step 7 — Work orders module (core).** Create/edit items, versions & snapshots with sha256, transition() with the state machine from Architecture §5.1, status history, inspections (check-in/out with media links), change orders, Nafath signing of a version (mock), auto-generate WO number, PDF rendering of the approved version (Puppeteer, RTL). Realtime gateway channel `work-order:{id}`. Verify: full happy path e2e; illegal transitions rejected; snapshot immutability test.
- **Step 8 — Invoicing module (ZATCA Phase 1).** Invoice from work order, per-org sequential numbering, line VAT math, `packages/zatca-ubl` QR TLV (base64) + PDF/A-3 with embedded XML placeholder, void/credit note. Verify: QR decoding test vectors; totals match WO snapshot.
- **Step 9 — Payments + Escrow + Ledger.** PSP port + mock (intent → webhook), payments, `escrow_holds` (held → auto release after `ESCROW_AUTO_RELEASE_HOURS` or on customer confirmation; frozen on dispute), ledger postings for capture/release/fee/refund, payouts scheduler + org wallet endpoints. Verify: ledger always balanced (property test), release rules e2e, idempotent webhook replay.
- **Step 10 — Promissory notes (Nafez) + settlement.** Nafez port + mock, create note on approval when `payment_terms=deferred` (outbox → worker), events, close-on-payment worker (`InvoicePaid` → close note → generate settlement PDF → notify) — must complete in one job with retries; partial settlement; dunning schedule; enforcement case bundle builder (zip of note/invoice/signatures/inspection photos). Verify: e2e "approve deferred → note issued → pay → note closed + settlement PDF ≤ 60s in mock".
- **Step 11 — Notifications module.** Templates (AR/EN), FCM/SMS/WhatsApp ports + mocks, in-app inbox, event subscribers for all WO/PN/payment events. Verify: each transition emits the right template.
- **Step 12 — Flutter foundation (apps/mobile).** Feature/layer skeleton per §5.5 (`features/<f>/{domain,data,presentation}`, `core/`) with import-lint rules, `Result/Failure` types, flavors (customer/partner/fleet) with separate entrypoints, env via dart-define, theme + Arabic fonts + RTL, go_router with auth guard, dio client with token refresh interceptor, OpenAPI-generated client, Riverpod setup, l10n (ar/en), error handling, secure storage, Sentry. Verify: `flutter analyze`, golden test of RTL scaffold.
- **Step 13 — Customer app MVP screens.** Lightweight **web approval page** (no app install: SMS link → review → Nafath approve; see docs/05-USER-FLOWS.md §2.1), Nafath login (mock deep link), vehicles list/add by VIN, work order list/detail with live tracking timeline + media gallery, approve version (Nafath flow), invoice view + pay (PSP mock sheet), promissory note & settlement view, notifications inbox, profile. Verify: integration tests for approve + pay flow against mock API.
- **Step 14 — Partner app MVP screens (workshop).** Org dashboard, create work order (vehicle lookup, items, estimate), check-in inspection with camera (8 angles), status transitions, request approval, upload progress photos, issue invoice, wallet/payouts, offline queue (drift) for status/media. Verify: offline → online sync test.
- **Step 15 — Admin back-office MVP (apps/admin-web).** Per docs/06-DASHBOARDS.md §A: auth (platform roles + 2FA), Overview KPIs (from materialized views), org list/profile, KYB queue (approve/reject with reason), integrations monitor (`integration_requests`, `webhook_events`, DLQ retry, "pending notes" screen), payments/escrow/payouts/ledger views (freeze/release with reason, maker/checker on refunds), disputes room, `platform_settings` editor, audit log browser with export. All sensitive actions require a reason and write `audit_log`. Verify: builds; Playwright smoke (login → KYB approve → retry integration → dispute decision).
- **Step 16 — Disputes module.** Open dispute → freeze escrow, evidence, messages, ops resolution → ledger split/refund; reviews after close. Verify: e2e.
- **Step 17 — CI/CD + observability.** GitHub Actions (lint/test/build for api, admin, mobile analyze/test), Docker images, Helm chart skeleton, OpenTelemetry wiring, dashboards JSON. Verify: green pipeline on a clean clone.

### Phase 3 — Marketplace & compliance
- **Step 18 — Parts marketplace.** part categories, supplier inventory, part requests with PostGIS matching worker (`part_request_recipients`), bids (upsert), bidding window expiry job, accept → part order → escrow → confirm/auto-confirm, digital warranty issuance (QR token, certificate PDF), warranty claims. Realtime channel `part-request:{id}`. Verify: e2e reverse auction with 3 mock suppliers.
- **Step 18b — Parts distributors hub.** `part_brands`/`parts_catalog`/`part_fitments` CRUD + CSV import, `InventorySyncPort` (CSV + generic REST adapters, mock) → `supplier_inventory` upsert by `external_sku` with `inventory_sync_runs`, `GET /parts/fit?vin=` (VIN decode → fitments → live offers sorted by price/distance/ETA), Buy Now `part_orders(source=catalog_buy_now)` with `part_order_items`, `trade_accounts` (request → approve → Nafath-signed agreement → credit check on every deferred order → promissory note via Step 10 engine → pay → close), `part_serials` issue/verify/install endpoints + duplicate-scan alert, warranties `part_and_labor`, `group_buys` (join → reached → orders). Verify: e2e "distributor imports CSV → workshop finds part by VIN → buys deferred → note issued → scans QR at install → pays → note closed"; credit-limit rejection test; duplicate-serial alert test.
- **Step 19 — Logistics.** Transport jobs, driver profiles, quote by distance (maps port + mock), assignment, tracking ingestion (rate-limited), proof of delivery (photo + OTP), fee/margin postings. Verify: e2e tow request.
- **Step 20 — ZATCA Phase 2.** `packages/zatca-ubl` full UBL 2.1 XML, XAdES signing, CSID onboarding flow (compliance → production), clearance/reporting adapter against ZATCA sandbox, PIH chain per device, submission logging. Verify: passes ZATCA SDK validator on sample invoices.
- **Step 21 — Accident reports (Monjez/Taqdeer) port + mock** and linkage to work orders. Verify: unit.
- **Step 22 — Partner app: scrapyard/parts dealer/distributor & driver flows** (incoming requests, bid with media, orders, warranty issue; distributor: inventory import status, trade-account approvals & aging, serial batches; workshop: VIN parts search, Buy Now cart, trade-account balance, QR install scan; driver job list + tracking).
- **Step 23 — Customer app: parts request, bids compare, warranty wallet, tow request.**

### Phase 4 — Pilot hardening
- **Step 24 — Security review, pen-test fixes, load test (k6) on WO + bidding, backup/PITR drills, runbooks in `docs/runbooks/`.**
- **Step 25 — Pilot config: industrial-zone tagging, onboarding scripts, analytics events, feature flags.**

### Phase 5 — Scale features
- **Step 26 — Fleet Hub** (policies, approvals, bulk vehicle import, monthly statements, reports export).
- **Step 27 — Voice-to-Invoice** (record → speech port → Claude extraction to line items → review UI).
- **Step 28 — AI Inspection** (vision port → damages JSON on inspections; check-in vs check-out diff).
- **Step 29 — Abandoned vehicle flow** (notice schedule, storage fees, enforcement bundle with `is_abandoned_vehicle`).
- **Step 30 — Multi-city rollout, Meilisearch discovery, performance & cost tuning.**

## 9. Working agreement with Claude Code

1. Start each session by reading this file and the doc relevant to the step. State which step you are executing.
2. Before writing code for a step, list the files you will create/modify. Keep to the step's scope.
3. Write tests alongside code; run the step's "Verify" commands and paste real output in your summary. If something fails, say so.
4. Never modify append-only tables, ledger invariants, or security guards to make a test pass.
5. When an external contract (Nafath/Nafez/ZATCA/PSP) is unknown, implement the port + mock, document the assumption in `docs/integrations/`, and flag it — do not invent a live API.
6. Update `docs/db/schema.sql` and Prisma together; add an ADR for any architectural change; append `✅` to the completed step in §8.
7. Arabic-first: every user-facing string must have an `ar` value; RTL layouts must be verified.
