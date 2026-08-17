# ADR 0003 — Prisma 6 for the domain schema, raw SQL (`pg`) for ledger and DB-enforced invariants

- **Status:** Accepted
- **Date:** 2026-08-17
- **Related:** docs/04-DATABASE.md, docs/db/schema.sql, [ADR 0004](./0004-internal-double-entry-ledger.md)

## Context

`docs/db/schema.sql` (79 tables) is the human source of truth. It relies on PostgreSQL features an ORM cannot model:
PostGIS geography columns, `next_number()` sequences for human-readable numbers, `assert_entry_balanced()` and
`audit_log_guard` triggers, append-only enforcement, materialized views for dashboards, `pgcrypto`, `pg_trgm` indexes.
The financial core (double-entry ledger, escrow) needs exact `NUMERIC(14,2)` arithmetic, `SELECT … FOR UPDATE`, and
multi-statement transactions where an ORM's abstraction gets in the way.

Options considered: Prisma only · Drizzle · TypeORM · Knex/raw only · **Prisma + raw `pg` where precision matters**.

## Decision

- **Prisma 6** owns `prisma/schema.prisma` mirroring `schema.sql` (all tables, enums, `@map`/`@@map` to snake_case)
  and generates the typed client used by module repositories (infrastructure layer).
- Everything Prisma cannot express lives in a **raw SQL migration** committed alongside (`prisma/migrations/*/migration.sql`
  hand-edited): extensions, functions, triggers, views/materialized views, PostGIS columns and GiST indexes.
- **Ledger postings, balance reads and escrow holds use raw SQL through `pg`** inside the same Prisma interactive
  transaction (`prisma.$transaction(async tx => …)` + `tx.$executeRaw`) via `packages/ledger`. Amounts cross the
  boundary as strings/`Decimal`, never `number`.
- A CI script diffs `prisma migrate diff` output against `docs/db/schema.sql`; a mismatch fails the build. Tables are
  never created outside `schema.sql` (CLAUDE.md §5.6).
- Prisma `Decimal` (decimal.js) is the only allowed type for money in TS.

## Consequences

**Positive** — type-safe CRUD for 90% of the code, exact SQL control for the 10% that carries legal/financial risk;
DB triggers protect invariants even from buggy application code.

**Negative / mitigations** — two sources of truth to keep in sync → the CI diff script and the rule "update
`schema.sql` and Prisma together"; raw SQL is less refactor-safe → covered by Testcontainers integration tests
(ledger balance property test, append-only rejection test).
