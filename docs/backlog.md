# Backlog — أفكار مؤجلة (لا تُبنى في MVP)

كل ميزة تُقترح أثناء التنفيذ ولا تخدم التدفق الأساسي مباشرة تُسجَّل هنا بدل بنائها.

| الفكرة | المصدر | لماذا مؤجلة | المرحلة المقترحة |
|---|---|---|---|
| الشراء الجماعي للورش | PRD FR-PD-09 | يحتاج كثافة ورش | P5 |
| Core Return | PRD FR-PD-10 | ثانوي | P5 |
| قائمة أسعار السوق المرجعية | عصف ذهني | تحتاج بيانات متراكمة | P5 |
| Car Passport للمعارض/التمويل | عصف ذهني | بعد الحجم | P5 |
| Puppeteer/Chromium PDF-A adapter for `PdfRendererPort` (work-order versions, later invoices/settlements) | Step 7 | HTML RTL renderer ships now; Chromium download blocked on dev machine and heavy in CI — add when infra allows | Step 8/17 |
| Fleet approvers via `fleet_policies` in work-order approval | Step 7 | MVP treats fleet org members as customer; policies come with Fleet Hub | P5 (Step 26) |
| Full OpenAPI → Dart model/client codegen (`openapi-generator`, needs Java) | Step 12 | endpoints-only generator + hand-written DTOs suffice for MVP | Step 13/17 |
| iOS Xcode schemes for customer/partner/fleet flavors | Step 12 | entrypoints + dart-define work today; schemes need Xcode project edits | Step 13 |
| Sentry wiring (`sentry_flutter`) when SENTRY_DSN provided | Step 12 | hook exists in bootstrap.dart | Step 17 |
| Media thumbnails in customer app (presigned GET from storage port) | Step 13 | mock storage has no bytes; placeholder strip keeps layout | Step 14/17 |
| Live PSP: open `redirect_url` in in-app browser + return deep link | Step 13 | mock PSP completes in-app via dev hook | live PSP integration |
| Nafath approval from web page (redirect to Nafath app) — page uses OTP only today | Step 13 | OTP is legally sufficient for MVP pilot; Nafath web flow needs live contract | Step 20+ |
| Customer «اطلب» tab (service/parts/tow requests) | Step 13 | placeholder empty state | Step 23 |
| Offline cache of orders + queue in drift (replace JSON-file `PendingActions`) | Step 14 | queue is small; drift adds codegen weight for MVP | Step 22 |
| Plate/VIN camera scan (OCR) in new order | Step 14 | manual entry works; OCR needs ML Kit | Step 22 |
| Progress-photo capture from order screen via camera (currently placeholder bytes path; inspection flow has real camera) | Step 14 | — | Step 22 |
| Group buy fulfilment (reached → orders per participant at group price) | Step 18b | open/join/reached implemented; ordering needs payment UX | Step 22 |
| Trade-account agreement signed by workshop owner via Nafath (`guarantor_signature_id`) | Step 18b | needs live Nafath contract; approval by supplier suffices for mock | Step 20+ |
| InventorySync REST adapter (pull from distributor ERP) | Step 18b | CSV push covers pilot; REST needs a real ERP contract | Step 22 |
| Part-order transport job (supplier → workshop delivery via logistics) | Step 18 | transport_job_id column reserved | Step 19 |
| Bid with photos (supplier attaches media to a bid) | Step 22 | bid DTO has no media yet; add `part_bid_media` link | Step 23 |
| Customer parts request + bids compare + warranty wallet screens | Step 22 | workshop flows first | Step 23 |
| Driver job list/tracking screens | Step 22 | logistics module not built | Step 19 |
| Maker/checker (two-person) approval on escrow refunds | Step 15 | single reason-gated action + audit for pilot; needs an approvals table | Step 16 |
| Outbox integration_requests hardcode provider='nafez' (skews the integrations-by-provider table) | Step 15 | cosmetic in monitor; add an 'internal' provider enum value | Step 17 |
| Admin 2FA beyond OTP (TOTP/WebAuthn for platform staff) | Step 15 | OTP is the second factor today | Step 24 |
| Dispute evidence thumbnails in admin (presigned GET) | Step 16 | media ids listed; storage mock has no bytes | Step 17 |
| Customer/partner dispute screens in the apps (open + chat) | Step 16 | API + admin room done; mobile UI pending | Step 23 |
| `replace_part` / `no_action` decisions leave escrow frozen until a follow-up decision | Step 16 | intentional (documented), needs a 'pending follow-up' badge in admin | Step 17 |
| Invite flow for platform staff (email/SMS invite instead of the grant:role CLI) | Step 15 | CLI + in-dashboard role change cover the pilot | Step 24 |
| Build/push the container images (needs a reachable registry) | Step 17 | Docker Hub unreachable from the dev machine; CI builds them | first CI run on main |
| `helm lint` / `helm template` the chart (helm not installed locally) | Step 17 | templates written against the k8s API spec | Step 24 |
| App metrics beyond auto-instrumentation (outbox backlog, ledger imbalance, integration counters as OTEL metrics) | Step 17 | dashboard panels reference them; emit from the jobs | Step 24 |
| Staging deploy workflow (helm upgrade on tag) | Step 17 | images job publishes to GHCR; deploy stays manual for the pilot | Step 25 |
| Transport payment + ledger posting (customer pays the tow; margin split like escrow) | Step 19 | job stores price/margin and audits them; no payment flow yet | Step 23 |
| Tow rates in `platform_settings` instead of code defaults | Step 19 | margin bps is configurable; base/per-km are constants | Step 25 |
| Driver app screens (offers, active job, tracking, proof capture) | Step 19 | API complete and tested | Step 22/23 |
| Assign a specific provider org (dispatcher flow) instead of first-to-accept | Step 19 | first-to-accept fits the pilot | Step 26 |
| Run the ZATCA SDK validator + sandbox onboarding against the real portal | Step 20 | crypto verified locally; portal needs credentials + network | before pilot |
| Map ZATCA business-rule errors (BR-KSA-*) to Arabic messages in the admin monitor | Step 20 | stored per submission already | Step 24 |
| Move archived `zatca_xml` to cold object storage after N months | Step 20 | kept in the database for the pilot (6-year retention) | Step 30 |
| Credit/debit notes: BillingReference must carry the original invoice number, not the note's | Step 20 | single-invoice flows correct; note flow needs the parent number threaded | Step 21 |
| Outbox metrics as OTEL gauges (backlog depth, claimed-but-stalled, dead-letter count) | Security/concurrency batch | admin monitor shows them; alerting needs metrics | Step 24 |
| `job_locks` rows for one-shot jobs are never garbage-collected | Security/concurrency batch | a handful of fixed names, rows are reused in place | — |
| Rotate the production secrets through KMS instead of env vars | Security/concurrency batch | boot now refuses dev defaults in prod; rotation is still manual | Step 24 |
| Live منجز/تقدير adapter (provider + API unconfirmed) | Step 21 | port + mock only; module refuses INTEGRATION_ACCIDENTS=live | after the agreement is signed |
| Accept `suggested_items` into the work order in one tap (API returns them; the app must post them) | Step 21 | avoids cross-module item writes from the accidents module | Step 22/23 |
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
| Admin-web page for zones/flags/funnel (API + runbook exist; ops uses curl today) | Step 25 | endpoints and reasons are enforced server-side | Step 26 |
| Mobile: consume `/v1/config` to hide disabled features (today the app shows everything it can do) | Step 25 | flags are enforced by the API regardless | Step 26 |
| Analytics retention/rollup (analytics_events grows unbounded) | Step 25 | small during the pilot | Step 30 |
| Fleet screens in the mobile app (approvals inbox, statements, budget) — API complete | Step 26 | fleet flavor still shows the customer tabs | Step 27 |
| Fleet statement PDF (`fleet_statements.pdf_media_id` is unused; CSV + JSON exist) | Step 26 | accountants asked for CSV first | Step 30 |
| Part orders under fleet policy (only work orders are gated today) | Step 26 | fleet_approvals.part_order_id column already exists | Step 27 |
| e2e fixtures use fixed plates/CR numbers, so a long-lived dev DB eventually collides | Step 26 | `test:e2e:clean` runs against a scratch DB like CI | Step 30 |
| Flutter audio recording for voice-to-invoice (no `record`-style package in pubspec yet) | Step 27 | the API accepts a typed `hint_ar`, so the flow works end to end without audio | Step 30 |
| Choose the speech provider (Saudi dialect, workshop noise, KSA residency) and write the live adapter | Step 27 | mock only; the module refuses INTEGRATION_SPEECH=live | before pilot |
| Measure extraction accuracy on real pilot recordings before enabling INTEGRATION_AI=live widely | Step 27 | prices are verified against the transcript either way | Step 30 |
| Intermittent 401 in whole-suite e2e runs (~1 run in 3, a different suite each time; every suite passes alone, and on a clean DB) | Step 27 | not reproduced in isolation; token verification fails on a token that was just minted — cause not yet identified, so it is written down rather than guessed at | Step 30 |
| Vision live adapter — needs a data-residency decision + ADR before any customer photo leaves | Step 28 | mock only; module refuses INTEGRATION_AI=live | before pilot |
| Measure false-positive rate on real pilot photos before enabling ai_inspection widely | Step 28 | a wrong suggestion costs the workshop trust, so precision matters more than recall | Step 30 |
| Abandoned notices stored on work_orders.metadata rather than their own table | Step 29 | three rows per car, read only in this flow; promote to a table if ops needs cross-car reporting | Step 30 |
| Abandoned-vehicle screens (workshop: notice timeline + declare; customer: the warning) | Step 29 | API + notifications done | Step 30 |
| Storage rate per workshop in platform_settings / plan instead of per work order | Step 29 | work_orders.storage_fee_per_day is set per car today | Step 30 |
| Dispute parties viewing evidence photos from the apps (staff-only today via back-office) | media download | access rule documented in download-media.use-case.ts; lands with the dispute screens | Step 30 |
| Point INTEGRATION_STORAGE=live at the production KSA object store and set S3_* secrets (adapter proven vs AWS vectors + real MinIO round-trip) | storage | local MinIO: brew services start minio, endpoint http://localhost:9000 | deployment |
| Meilisearch ranking tuning (a typo query can surface an extra hit above the intended one; findability is pinned by tests, ordering is not) | Step 30 | measure on real pilot queries before tuning rules | after pilot |
| Index parts catalog in Meilisearch for part-name search (organizations only today) | Step 30 | fit-by-VIN covers the main path | after pilot |
| Analytics rollup + media lifecycle rules (cost tuning items from Step 30) | Step 30 | small volumes during the pilot | after pilot |

