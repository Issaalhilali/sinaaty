# Backlog — أفكار مؤجلة (لا تُبنى في MVP)

كل ميزة تُقترح أثناء التنفيذ ولا تخدم التدفق الأساسي مباشرة تُسجَّل هنا بدل بنائها.

| الفكرة | المصدر | لماذا مؤجلة | المرحلة المقترحة |
|---|---|---|---|
| Service marketplace deferrals (scope doc 2026-08-22): live map view of offers; automatic specialty-based match ranking (badge ships, ranking later); voice problem description (awaits the speech vendor) | service marketplace | distance-as-text covers the pilot; measure before ranking; vendor undecided | after pilot |
| Match cap: a request notifies the CLOSEST 40 workshops (MATCH_LIMIT) — fine for the pilot, needs paging/waves in a dense city | service marketplace | closest-first is the honest order; widen covers quiet cases | Step 30+ |
| الشراء الجماعي للورش | PRD FR-PD-09 | يحتاج كثافة ورش | P5 |
| Core Return | PRD FR-PD-10 | ثانوي | P5 |
| قائمة أسعار السوق المرجعية | عصف ذهني | تحتاج بيانات متراكمة | P5 |
| Car Passport للمعارض/التمويل | عصف ذهني | بعد الحجم | P5 |
| Puppeteer/Chromium PDF-A adapter for `PdfRendererPort` (work-order versions, later invoices/settlements) | Step 7 | HTML RTL renderer ships now; Chromium download blocked on dev machine and heavy in CI — add when infra allows | Step 8/17 |
| Fleet approvers via `fleet_policies` in work-order approval | Step 7 | MVP treats fleet org members as customer; policies come with Fleet Hub | P5 (Step 26) |
| Full OpenAPI → Dart model/client codegen (`openapi-generator`, needs Java) | Step 12 | endpoints-only generator + hand-written DTOs suffice for MVP | Step 13/17 |
| iOS Xcode schemes for customer/partner/fleet flavors | Step 12 | entrypoints + dart-define work today; schemes need Xcode project edits | Step 13 |
| Sentry wiring (`sentry_flutter`) when SENTRY_DSN provided | Step 12 | hook exists in bootstrap.dart | Step 17 |
| ~~Media thumbnails in customer app (presigned GET from storage port)~~ ✅ 2026-08-21 — `MediaThumb`/`MediaStrip` over `GET /v1/media/:id/download` (commits 8f0a498, 3312c7c) | Step 13 | — | done |
| Live PSP: open `redirect_url` in in-app browser + return deep link | Step 13 | mock PSP completes in-app via dev hook | live PSP integration |
| Nafath approval from web page (redirect to Nafath app) — page uses OTP only today | Step 13 | OTP is legally sufficient for MVP pilot; Nafath web flow needs live contract | Step 20+ |
| Customer «اطلب» tab (service/parts/tow requests) | Step 13 | placeholder empty state | Step 23 |
| Offline cache of orders + queue in drift (replace JSON-file `PendingActions`) | Step 14 | queue is small; drift adds codegen weight for MVP | Step 22 |
| Plate/VIN camera scan (OCR) in new order | Step 14 | manual entry works; OCR needs ML Kit | Step 22 |
| ~~Progress-photo capture from order screen via camera~~ ✅ 2026-08-21 — real camera capture through the inspection flow's injectable, real sha256 (was 1KB of zeros with a fake hash); offline path unchanged (7abfeaf) | Step 14 | — | done |
| Group buy fulfilment (reached → orders per participant at group price) | Step 18b | open/join/reached implemented; ordering needs payment UX | Step 22 |
| Trade-account agreement signed by workshop owner via Nafath (`guarantor_signature_id`) | Step 18b | needs live Nafath contract; approval by supplier suffices for mock | Step 20+ |
| InventorySync REST adapter (pull from distributor ERP) | Step 18b | CSV push covers pilot; REST needs a real ERP contract | Step 22 |
| Part-order transport job (supplier → workshop delivery via logistics) | Step 18 | transport_job_id column reserved | Step 19 |
| Bid with photos (supplier attaches media to a bid) | Step 22 | bid DTO has no media yet; add `part_bid_media` link | Step 23 |
| Customer parts request + bids compare + warranty wallet screens | Step 22 | workshop flows first | Step 23 |
| Driver job list/tracking screens | Step 22 | logistics module not built | Step 19 |
| ~~Maker/checker (two-person) approval on escrow refunds~~ ✅ 2026-08-22 — `admin_approvals` table with the two-people rule as a DB CHECK, refund endpoint records a request (202), a different staff member approves (payload revalidated at that moment) or anyone incl. the maker rejects/withdraws, auto-release skips holds under an open request, expiry from `platform_settings`, finance desk notified on request and on money-moving dispute decisions (design: docs/design/maker-checker-refunds.md; admin-web inbox 317ee2f, live-cycle verified: request → inbox → maker withdraw, hold untouched) | Step 15 | — | done |
| Dispute decisions above a `platform_settings` threshold (proposed SAR 5000) route through `admin_approvals` after the pilot | maker/checker arbitration | during the pilot every money-moving decision is broadcast to the finance desk instead — a gate on every dispute would strangle ops | after pilot |
| Outbox integration_requests hardcode provider='nafez' (skews the integrations-by-provider table) | Step 15 | cosmetic in monitor; add an 'internal' provider enum value | Step 17 |
| Admin 2FA beyond OTP (TOTP/WebAuthn for platform staff) | Step 15 | OTP is the second factor today | Step 24 |
| ~~Dispute evidence thumbnails in admin (presigned GET)~~ ✅ 2026-08-21 — shared `MediaThumb` over the download-URL endpoint renders the evidence strip in the dispute room (a8c4d57); needed a `cross-origin` CORP header on mock-download (browsers block :3001 embedding :3000 under helmet's default — real S3 sends no CORP) | Step 16 | — | done |
| ~~Customer/partner dispute screens in the apps (open + chat)~~ ✅ 2026-08-21 — `features/disputes` (open sheet + one conversation screen with photo evidence, behind the `disputes` flag; commit a9bbef2) | Step 16 | — | done |
| ~~`replace_part` / `no_action` decisions leave escrow frozen until a follow-up decision~~ ✅ 2026-08-21 — the dispute room now wears a «بانتظار قرار لاحق — المبلغ ما زال مجمّداً» pill on exactly that state (a8c4d57); the behaviour itself stays intentional | Step 16 | — | done |
| Invite flow for platform staff (email/SMS invite instead of the grant:role CLI) | Step 15 | CLI + in-dashboard role change cover the pilot | Step 24 |
| Build/push the container images (needs a reachable registry) | Step 17 | Docker Hub unreachable from the dev machine; CI builds them | first CI run on main |
| `helm lint` / `helm template` the chart (helm not installed locally) | Step 17 | templates written against the k8s API spec | Step 24 |
| ~~App metrics beyond auto-instrumentation~~ ✅ 2026-08-21 — `MetricsService` (CommonModule) emits the exact names the Grafana panels query: `sinaaty_outbox_pending`, `sinaaty_ledger_imbalance`, `sinaaty_integration_requests_total{provider,status}` + bonus gauges `sinaaty_outbox_stalled`, `sinaaty_integration_dead_letters`; one batched SQL per 30s export, no-op when OTEL is off; e2e proves the values move under a real dispatch (in-memory OTel reader) | Step 17 | — | done |
| Staging deploy workflow (helm upgrade on tag) | Step 17 | images job publishes to GHCR; deploy stays manual for the pilot | Step 25 |
| ~~Transport payment + ledger posting~~ ✅ 2026-08-21 — tow invoice auto-issues on proven delivery and rides the existing payment line; release splits by the job's frozen margin into `platform_revenue:transport_margin` (+VAT); paid-after-proof releases in the same transaction (the receiver's OTP was the confirmation); e2e incl. imbalance 0.00 | Step 19 | mobile «ادفع» button lands with sinaaty-d0 (P1 doc §2) | done |
| Tow rates in `platform_settings` instead of code defaults | Step 19 | margin bps is configurable; base/per-km are constants | Step 25 |
| Driver app screens (offers, active job, tracking, proof capture) | Step 19 | API complete and tested | Step 22/23 |
| Assign a specific provider org (dispatcher flow) instead of first-to-accept | Step 19 | first-to-accept fits the pilot | Step 26 |
| Run the ZATCA SDK validator + sandbox onboarding against the real portal | Step 20 | crypto verified locally; portal needs credentials + network | before pilot |
| Map ZATCA business-rule errors (BR-KSA-*) to Arabic messages in the admin monitor | Step 20 | stored per submission already | Step 24 |
| Move archived `zatca_xml` to cold object storage after N months | Step 20 | kept in the database for the pilot (6-year retention) | Step 30 |
| ~~Credit/debit notes: BillingReference must carry the original invoice number~~ ✅ 2026-08-21 — parent number threaded through both the Phase-2 signing path and the Phase-1 XML endpoint; pinned by e2e | Step 20 | — | done |
| ~~Outbox metrics as OTEL gauges~~ ✅ 2026-08-21 — backlog depth, claimed-but-stalled and dead-letter count all observed by `MetricsService` (same batch callback); alert rules can now bite | Security/concurrency batch | — | done |
| `job_locks` rows for one-shot jobs are never garbage-collected | Security/concurrency batch | a handful of fixed names, rows are reused in place | — |
| Rotate the production secrets through KMS instead of env vars | Security/concurrency batch | boot now refuses dev defaults in prod; rotation is still manual | Step 24 |
| Live منجز/تقدير adapter (provider + API unconfirmed) | Step 21 | port + mock only; module refuses INTEGRATION_ACCIDENTS=live | after the agreement is signed |
| ~~Accept `suggested_items` into the work order in one tap~~ ✅ 2026-08-21 — «أضفها لأمر العمل» with per-line pricing sheet (the report carries no prices), riding the normal addItem path so versioning/re-approval behave as if typed (14907b1) | Step 21 | — | done |
| Attach check-out photos to the accident claim file | Step 21 | photo count is sent; upload needs the provider's attachment API | after the agreement is signed |
| Scheduled refresh of open accident files (assessment lands days later) | Step 21 | manual refresh endpoint exists | Step 25 |
| Tow: «استخدم موقعي الحالي» + map picker (needs a location plugin + platform permissions) | Step 23 | pasted maps link / coordinates covers the pilot | Step 25 |
| Tow: pick the destination workshop from the nearby list instead of typing it | Step 23 | discovery API exists; mobile has no orgs repository yet | Step 23b/26 |
| Live tow tracking on a map (the API already streams `transport:{id}`) | Step 23 | status timeline + refresh for now | Step 30 |
| Warranty claim from the wallet (open a claim on a warranty) | Step 23 | API supports claims; screen lists warranties only | Step 26 |
| External penetration test before the pilot | Step 24 | internal review + 14 regression tests done | before pilot |
| PITR restore rehearsal on a real Supabase project (steps written, never executed here) | Step 24 | logical dump/restore drill passes locally | before pilot |
| Soak test (1h) on the work-order path to watch memory + outbox depth | Step 24 | 60s ramp/hold runs pass with 0% failures | Step 25 |
| Re-run k6 against production-like infra (managed DB + 2 API replicas) | Step 24 | numbers so far are one dev machine | Step 25 |
| ~~Admin-web page for zones/flags/funnel~~ ✅ 2026-08-21 — shipped as «المناطق والميزات» (`/pilot`: funnel KPIs, zones + backfill, flag toggles behind `ReasonDialog`, activation table) | Step 25 | — | done |
| Mobile: consume `/v1/config` to hide disabled features (today the app shows everything it can do) | Step 25 | flags are enforced by the API regardless | Step 26 |
| Analytics retention/rollup (analytics_events grows unbounded) | Step 25 | small during the pilot | Step 30 |
| ~~Fleet screens in the mobile app~~ ✅ 2026-08-21 — «أسطولك اليوم» (6add95d) + monthly statements: month list, idempotent generate, month screen with per-asset lines and CSV copy (7abfeaf); file-share via share_plus stays open below | Step 26 | — | done |
| Fleet statement «مشاركة كملف» (needs `share_plus`; CSV copy-to-clipboard shipped) | Step 26 | one package + platform perms | Step 30 |
| Fleet statement PDF (`fleet_statements.pdf_media_id` is unused; CSV + JSON exist) | Step 26 | accountants asked for CSV first | Step 30 |
| Part orders under fleet policy (only work orders are gated today) | Step 26 | fleet_approvals.part_order_id column already exists | Step 27 |
| e2e fixtures use fixed plates/CR numbers, so a long-lived dev DB eventually collides | Step 26 | `test:e2e:clean` runs against a scratch DB like CI | Step 30 |
| Flutter audio recording for voice-to-invoice (no `record`-style package in pubspec yet) | Step 27 | the API accepts a typed `hint_ar`, so the flow works end to end without audio | Step 30 |
| Choose the speech provider (Saudi dialect, workshop noise, KSA residency) and write the live adapter | Step 27 | mock only; the module refuses INTEGRATION_SPEECH=live | before pilot |
| Measure extraction accuracy on real pilot recordings before enabling INTEGRATION_AI=live widely | Step 27 | prices are verified against the transcript either way | Step 30 |
| ~~Intermittent whole-suite e2e failure~~ ✅ 2026-08-21 — **root-caused and fixed**: supertest's per-request ephemeral listeners bind the wildcard address, and macOS lets any process bind `127.0.0.1` on the same port and steal loopback traffic (proved with an isolated two-server script; the port range here is crowded with Flutter/dart listeners). Every symptom was a foreign listener answering: 401 on a just-minted token, 404 on a just-created dispute, 403 on a super_admin token, 405, and a "ghost 200" with no DB write behind it. Fix: each suite binds once in `beforeAll` to `127.0.0.1` (`app.listen(0, '127.0.0.1')`) — a specific bind is not hijackable. Linux refuses the dual bind, so CI was never exposed. Three order-dependence bugs found in the hunt also fixed (admin audit probe, vision reserved-zone suggestion, zatca ICV `>= 3n`). 12 consecutive clean-DB full runs green (2232 test executions). Diagnosis instrumentation kept (E2E-DIAG hook, guard/token reasons) | done |
| Vision live adapter — needs a data-residency decision + ADR before any customer photo leaves | Step 28 | mock only; module refuses INTEGRATION_AI=live | before pilot |
| Measure false-positive rate on real pilot photos before enabling ai_inspection widely | Step 28 | a wrong suggestion costs the workshop trust, so precision matters more than recall | Step 30 |
| Abandoned notices stored on work_orders.metadata rather than their own table | Step 29 | three rows per car, read only in this flow; promote to a table if ops needs cross-car reporting | Step 30 |
| ~~Abandoned-vehicle screens (workshop: notice timeline + declare; customer: the warning)~~ ✅ 2026-08-21 — admin queue (e69aa0b) + mobile: notice timeline, storage fees, declare button built only from the server's `can_declare` (client counts no days), customer warning cards (14907b1) | Step 29 | — | done |
| Storage rate per workshop in platform_settings / plan instead of per work order | Step 29 | work_orders.storage_fee_per_day is set per car today | Step 30 |
| ~~Dispute parties viewing evidence photos from the apps~~ ✅ 2026-08-21 — a `media_links` row of type `dispute` now grants download to the dispute's parties (`isDisputeParty` shared from the disputes domain); pinned by e2e (respondent 200, stranger 403) | media download | — | done |
| Point INTEGRATION_STORAGE=live at the production KSA object store and set S3_* secrets (adapter proven vs AWS vectors + real MinIO round-trip) | storage | local MinIO: brew services start minio, endpoint http://localhost:9000 | deployment |
| Meilisearch ranking tuning (a typo query can surface an extra hit above the intended one; findability is pinned by tests, ordering is not) | Step 30 | measure on real pilot queries before tuning rules | after pilot |
| Index parts catalog in Meilisearch for part-name search (organizations only today) | Step 30 | fit-by-VIN covers the main path | after pilot |
| Analytics rollup + media lifecycle rules (cost tuning items from Step 30) | Step 30 | small volumes during the pilot | after pilot |

