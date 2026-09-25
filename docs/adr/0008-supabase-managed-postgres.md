# ADR-0008 — Supabase as managed PostgreSQL (dev/staging/pilot) and the data-residency constraint

**Status:** Accepted (2026-08-17) — to be re-reviewed before commercial launch.

## Context
The owner chose Supabase (project `gjhhdzrbtiqyzfpkqasb`) as the hosted database. Our stack already
targets plain PostgreSQL 16+ with PostGIS / pg_trgm / pgcrypto / citext, Prisma migrations generated
from `docs/db/schema.sql`, and application-level authorization (RBAC in the NestJS API).

Supabase offers no region inside Saudi Arabia. Sinaaty stores personal data (national IDs, IBANs,
phone numbers) which falls under PDPL data-residency expectations (see PRD §8, CLAUDE.md §5.4).

## Decision
1. **Use Supabase strictly as managed Postgres** (plus, optionally later, Storage as an S3-compatible
   bucket). We do **not** use Supabase Auth (Nafath/OTP + our JWT live in the API), Realtime (we run
   Socket.IO), or PostgREST/anon access to our tables.
2. **Prisma migrations from this repo are the only schema owner.** No Supabase CLI migrations, no
   dashboard schema edits. `docs/db/schema.sql` remains the source of truth.
3. **Connections:** app runtime → Transaction Pooler (6543, `pgbouncer=true`, `connection_limit=1`
   per instance); migrations/seed → Direct (5432). Both with `sslmode=require`.
4. **RLS stays disabled on our schema**; the API connects with a server role and enforces
   authorization itself. The publishable/anon key must never be granted access to our tables.
5. **Data residency:** acceptable for development, staging and a limited pilot with the owner's
   explicit acknowledgement. Before commercial launch we either (a) confirm an in-KSA hosting path
   or (b) migrate to an in-Kingdom Postgres (the schema/migrations are portable — this is a
   `pg_dump`/`migrate deploy` exercise), and record that in a follow-up ADR.
6. Local development keeps using a local Postgres (Docker or `tools/dev-db.sh`) so tests never
   depend on the network.

## Consequences
- `apps/api/.env.supabase` (gitignored) + `tools/supabase-db.sh deploy|status|psql`.
- Env schema already separates `DATABASE_URL` / `DIRECT_DATABASE_URL`.
- Nothing in domain/application code references Supabase.

## تحديث ٢٥ سبتمبر ٢٠٢٦ — موصول فعلاً
- المشروع `gjhhdzrbtiqyzfpkqasb` يعمل في **سيول (ap-northeast-2)**. الاتصال المباشر (`db.<ref>.supabase.co:5432`) **IPv6 فقط**؛ التطبيق يستعمل الـpooler
  `aws-0-ap-northeast-2.pooler.supabase.com:6543` (`SUPABASE_POOLER_HOST` في `.env.supabase`).
- الهجرات الـ١٥ + البذور طُبّقت عبر `tools/supabase-db.sh deploy`؛ الهجرة `org_vat_format` توقّفت أول مرة على صفٍّ قديم برقم ضريبي باطل
  (بذور أغسطس) — أُصلح الصف وأُضيف `tools/supabase-db.sh resolve <migration>` لهذه الحالة.
- المشروع يتوقّف (Paused) بعد أسبوع خمول على الخطة المجانية ويختفي مضيفه من DNS — العرض: «تعذّر الوصول» في كل شيء. الاستعادة من اللوحة بيد المالك.
