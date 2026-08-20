# صناعتي — Sinaaty

منصة رقمية وقانونية ثلاثية الأطراف لقطاع السيارات في السعودية: العملاء والأساطيل ↔ الورش والمصانع ↔ التشاليح ومحلات القطع، مع طبقة مالية/قانونية (نفاذ، نافذ، ناجز، ZATCA، Escrow).

- ابدأ من [`CLAUDE.md`](./CLAUDE.md) (تعليمات Claude Code + خطة البناء خطوة بخطوة).
- الوثائق في [`docs/`](./docs/README.md) — قرارات المعمارية في [`docs/adr/`](./docs/adr/README.md).

## هيكل المستودع (Monorepo)

```
apps/mobile      Flutter (customer | partner | fleet)
apps/api         NestJS modular monolith        ← Step 1
apps/admin-web   Next.js back-office            ← Step 15
packages/*       shared-types, ledger, zatca-ubl, ui-tokens
infra/docker     docker-compose (postgis, redis, minio, meilisearch, mailpit)
docs/            PRD, architecture, tech stack, DB schema, flows, dashboards, ADRs
```

## التشغيل المحلي

```bash
# البنية التحتية
docker compose -f infra/docker/docker-compose.yml up -d

# Flutter
cd apps/mobile && flutter pub get && flutter analyze && flutter test

# TypeScript workspaces (تُفعَّل من Step 1)
corepack enable && pnpm install && pnpm turbo lint test build
```

Node 22 (`.nvmrc`)، pnpm 10 (`packageManager` في `package.json`)، Flutter 3.x / Dart ≥ 3.13.

## الحالة الحالية

مكتملة: **الخطوات 0–25** — الخلفية كاملة (هوية/نفاذ، منشآت وKYB، مركبات وسجل السيارة، أوامر عمل موقّعة، فواتير ZATCA،
دفع وضمان ودفتر أستاذ مزدوج، سندات نافذ ومخالصات وتنفيذ، إشعارات، سوق القطع ومركز الوكلاء، نزاعات، لوجستيات، ZATCA المرحلة الثانية، تقارير الحوادث) + تطبيق Flutter
(عميل وورشة وموردون) + لوحة إدارة Next.js + خط CI/CD ومراقبة. التالي في `CLAUDE.md`: **الخطوة 26 (مركز الأساطيل)**.

## التشغيل السريع

```bash
./dev.sh start                      # قاعدة البيانات + الـ API على :3000
pnpm --filter admin-web dev         # لوحة الإدارة على :3001
cd apps/mobile && flutter run --flavor customer -t lib/main_customer.dart --dart-define-from-file=env/dev.json
```

منح رقمك صلاحية الدخول للوحة الإدارة (بيئة التطوير):

```bash
pnpm --filter api grant:role -- 05xxxxxxxx super_admin "اسمك"
```

تشغيل اختبارات e2e (أوقف خادم التطوير أولاً حتى لا تتزاحم مهامه المجدولة مع الاختبارات):

```bash
./dev.sh stop && ./apps/api/tools/dev-db.sh start
pnpm --filter api test:e2e
```

## النشر إلى GitHub

```bash
git remote add origin https://github.com/Issaalhilali/sinaaty.git
git push -u origin main
```

يعمل خط `CI` تلقائياً على كل دفع/طلب دمج — التفاصيل في [`docs/runbooks/ci-cd.md`](./docs/runbooks/ci-cd.md).
