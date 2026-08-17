# صناعتي — البنية التقنية الموصى بها (Tech Stack)

> الإصدار 1.0 — 2026-08-17

## 1. ملخص القرار

| الطبقة | الاختيار | البديل المدروس | سبب الاختيار |
|---|---|---|---|
| **Mobile / Web Apps (الأطراف)** | **Flutter 3.x (Dart 3.13+)** — codebase واحد بثلاث Flavors: `customer`, `partner`, `fleet` | React Native / Native | مشروع Flutter قائم؛ أداء RTL ممتاز؛ Web للأسطول |
| **Admin Back-office** | **Next.js 15 (App Router) + TypeScript + shadcn/ui + TanStack Table** | Flutter Web | جداول/تقارير كثيفة، سرعة بناء لوحات داخلية |
| **Backend API** | **NestJS 11 (Node 22 LTS, TypeScript)** — Modular Monolith | Go (Fiber/Chi), Django | إنتاجية عالية، DI وModules مدمجة، تكامل ممتاز مع BullMQ/Prisma؛ الأجزاء عالية التزامن (Realtime/Matching) قابلة للنقل إلى Go لاحقاً |
| **ORM / DB Access** | **Prisma 6** + `pg` Raw SQL للـ Ledger والاستعلامات المعقدة | Drizzle, TypeORM | Type-safety وMigrations؛ Raw SQL حيث تلزم الدقة المالية |
| **Database** | **PostgreSQL 16 + PostGIS + pg_trgm + pgcrypto** | MySQL, Mongo | العلاقات المعقدة، JSONB للـ Snapshots، PostGIS للمطابقة الجغرافية |
| **Cache / Queue** | **Redis 7** + **BullMQ** | RabbitMQ, SQS | Cache + Rate limit + Queues بمكوّن واحد |
| **Realtime** | Socket.IO (NestJS Gateway) مع Redis Adapter | Pusher/Ably | تحديثات المراحل والعروض لحظياً |
| **Search** | **Meilisearch** | Elasticsearch, Typesense | بحث عربي جيد وخفيف |
| **Object Storage** | S3-compatible داخل المملكة (Buckets للوسائط والمستندات مع Object Lock) | — | صور/فيديو/PDF/XML للفواتير |
| **PDF / Documents** | Puppeteer (Chromium) لتوليد PDF عربي RTL + `pdf-lib` لتوقيع/دمج، PDF/A-3 لفواتير ZATCA | wkhtmltopdf | دعم RTL والخطوط العربية |
| **ZATCA XML** | مكتبة داخلية `zatca-ubl` (UBL 2.1 + XAdES + QR TLV) مبنية على `xmlbuilder2` + `node-forge` | مكتبات جاهزة | التحكم الكامل بالامتثال |
| **Auth** | نفاذ (OIDC) + OTP؛ JWT (jose) + Refresh rotation؛ Passport strategies | Keycloak/Auth0 | لا وسيط خارجي للـ PII |
| **Payments** | مزود مرخّص من ساما يدعم Mada/Apple Pay/Split-Escrow (مرشحون: Moyasar, HyperPay, Tap, PayTabs — يُحسم بعد RFP) | Stripe (غير متاح محلياً) | امتثال محلي |
| **AI** | Claude API (Vision + الاستدلال) لكشف الأضرار وتحويل النص المفرّغ إلى بنود فاتورة؛ Speech-to-Text عربي (Whisper-large-v3 أو مزود سحابي) | — | جودة عالية بالعربية |
| **Maps / Geo** | Google Maps Platform أو HERE + PostGIS | Mapbox | تغطية جيدة للمملكة |
| **Notifications** | FCM/APNs، مزود SMS سعودي (Unifonic/Msegat)، WhatsApp Business API | — | قوالب معتمدة محلياً |
| **Infra** | Kubernetes managed (أو ECS) داخل المملكة، Terraform، Helm | — | Data residency |
| **CI/CD** | GitHub Actions + ArgoCD (GitOps) | GitLab CI | — |
| **Observability** | OpenTelemetry، Prometheus/Grafana/Loki/Tempo، Sentry (Flutter + Node) | Datadog | تكلفة/تحكم |
| **Secrets** | HashiCorp Vault أو KMS السحابي | .env | PII/مفاتيح ZATCA |
| **Monorepo** | **pnpm workspaces + Turborepo** للـ TS، ومجلد `apps/mobile` لـ Flutter (Melos اختياري لاحقاً) | Nx | بساطة |
| **Testing** | Backend: Vitest/Jest + Supertest + Testcontainers (Postgres/Redis)؛ Flutter: flutter_test + integration_test + mocktail؛ Contract tests للـ Adapters | — | — |
| **Code Quality** | ESLint + Prettier + Biome (اختياري)، dart analyze + very_good_analysis، Husky + commitlint (Conventional Commits) | — | — |

## 2. حزم Flutter الرئيسية (apps/mobile)

| الغرض | الحزمة |
|---|---|
| State management | `flutter_riverpod` (+ `riverpod_generator`) |
| Routing | `go_router` |
| Networking | `dio` + `retrofit` (مولّد) + `pretty_dio_logger` (dev فقط) |
| Models | `freezed` + `json_serializable` |
| Local DB / Offline | `drift` (SQLite) + `flutter_secure_storage` |
| Realtime | `socket_io_client` |
| Media | `image_picker`, `camera`, `video_compress`, `flutter_image_compress` |
| Maps | `google_maps_flutter`, `geolocator` |
| Auth/Bio | `local_auth`, `app_links` (Deep links لنفاذ/الدفع) |
| Payments | SDK مزود الدفع + `pay` (Apple Pay) |
| i18n / RTL | `flutter_localizations`, `intl`, ARB files (ar الافتراضي، en) |
| Voice | `record`, `speech_to_text` (fallback محلي) |
| Push | `firebase_messaging`, `flutter_local_notifications` |
| Env/Flavors | `flutter_flavorizr` أو `--dart-define-from-file` |
| Testing | `mocktail`, `integration_test`, `golden_toolkit` |

## 3. حزم Backend الرئيسية (apps/api)

`@nestjs/core`, `@nestjs/config`, `@nestjs/swagger`, `@nestjs/bullmq`, `@nestjs/websockets`, `@nestjs/throttler`, `@nestjs/schedule`, `prisma`/`@prisma/client`, `pg`, `ioredis`, `bullmq`, `zod` + `nestjs-zod` (validation), `jose`, `argon2`, `class-transformer`, `pino`/`nestjs-pino`, `@opentelemetry/sdk-node`, `puppeteer`, `pdf-lib`, `xmlbuilder2`, `node-forge`, `sharp`, `dayjs` (تقويم هجري عبر `@umalqura/core` عند الحاجة), `libphonenumber-js`, `decimal.js` (كل الحسابات المالية بـ Decimal لا Float).

## 4. هيكل Monorepo المستهدف

```
sinaaty/
├── CLAUDE.md
├── README.md
├── docs/                         # هذه الوثائق + ADRs
│   ├── 01-PRD.md  02-ARCHITECTURE.md  03-TECH-STACK.md  04-DATABASE.md
│   ├── db/schema.sql
│   └── adr/
├── apps/
│   ├── mobile/                   # Flutter (customer | partner | fleet flavors)  ← المشروع الحالي يُنقل هنا
│   ├── api/                      # NestJS Core API + Workers + Realtime
│   └── admin-web/                # Next.js back-office
├── packages/
│   ├── shared-types/             # DTOs/Enums مشتركة (TS) + مولّد OpenAPI → Dart
│   ├── zatca-ubl/                # مكتبة فواتير ZATCA
│   ├── ledger/                   # منطق القيد المزدوج
│   └── ui-tokens/                # ألوان/خطوط/مسافات مشتركة (Design tokens)
├── infra/
│   ├── docker/  docker-compose.yml
│   ├── terraform/
│   └── k8s/ (helm charts)
├── .github/workflows/
├── pnpm-workspace.yaml  turbo.json  package.json
└── .env.example
```

## 5. مبادئ الكود المشتركة
- كل المبالغ المالية: `NUMERIC(14,2)` في DB، `Decimal` في TS، `Decimal` (package `decimal`) في Dart. **ممنوع** `double/float` للمال.
- كل الوقت بـ UTC في DB (`timestamptz`)، والعرض بتوقيت الرياض (`Asia/Riyadh`) مع تاريخ هجري اختياري.
- كل المعرفات `UUID v7` (ترتيب زمني) — عبر `uuidv7` في TS.
- الحقول العربية/الإنجليزية: `name_ar`, `name_en` (لا JSON للترجمة في الجداول الأساسية).
- API عقود عبر OpenAPI 3.1 مولّد من NestJS، ويُولَّد منه Dart client (`openapi-generator`) داخل `apps/mobile/lib/core/api/generated`.
