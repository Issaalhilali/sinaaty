# apps/api — Sinaaty Core API

NestJS 11 modular monolith. Layers per module: `domain/ application/ infrastructure/ interface/` (CLAUDE.md §5.5, lint-enforced).

## Run locally
```bash
pnpm install
# DB: docker compose (infra/docker) — or, without Docker: tools/dev-db.sh start  (PostgreSQL 17 + PostGIS via Homebrew)
cp .env.example .env
pnpm prisma migrate deploy && pnpm seed && pnpm prisma:generate
pnpm dev            # http://localhost:3000/v1/health · Swagger: /docs
```

## Schema workflow
`docs/db/schema.sql` is the source of truth. `pnpm schema:sync` copies it into the init migration;
`pnpm db:verify` = sync-check + migrate + seed + drift-check. After DB changes: `prisma db pull` → `pnpm prisma:normalize` → `pnpm prisma:generate`.

## Scripts
`dev · build · lint · typecheck · test · test:e2e · prisma:* · schema:sync|check · db:verify · seed · openapi:export · new:module <name>`
