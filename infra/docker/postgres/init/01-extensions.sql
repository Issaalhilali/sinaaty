-- Runs once on first container start (docker-entrypoint-initdb.d).
-- Extensions required by docs/db/schema.sql. Prisma raw migration (Step 2)
-- also issues CREATE EXTENSION IF NOT EXISTS so prod DBs stay in sync.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "btree_gist";
