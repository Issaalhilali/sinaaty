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
| promissory-notes e2e order-dependent flake when run after parts suites (once) | Step 18b | investigate outbox timing in full-suite runs | Step 17 CI |
| Bid with photos (supplier attaches media to a bid) | Step 22 | bid DTO has no media yet; add `part_bid_media` link | Step 23 |
| Customer parts request + bids compare + warranty wallet screens | Step 22 | workshop flows first | Step 23 |
| Driver job list/tracking screens | Step 22 | logistics module not built | Step 19 |
