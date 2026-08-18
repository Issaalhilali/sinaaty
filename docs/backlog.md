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
