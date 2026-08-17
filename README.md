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

الحالة الحالية: **Step 0 مكتمل** (monorepo + infra + ADRs). الخطوة التالية: **Step 1** في `CLAUDE.md`.
