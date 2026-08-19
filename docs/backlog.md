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
