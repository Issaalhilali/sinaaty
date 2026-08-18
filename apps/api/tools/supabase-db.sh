#!/usr/bin/env bash
# Runs Prisma against the Supabase project using apps/api/.env.supabase (never the local .env).
#   tools/supabase-db.sh deploy   → migrate deploy + seed + drift-check
#   tools/supabase-db.sh status   → migration status + extension check
#   tools/supabase-db.sh psql     → open psql on the direct connection
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env.supabase ] || { echo "missing apps/api/.env.supabase"; exit 1; }
set -a; # export everything from the file
# shellcheck disable=SC1091
source .env.supabase; set +a
# SUPABASE_DB_PASSWORD=<raw password> → we URL-encode it and BUILD the connection URLs ourselves
# from SUPABASE_PROJECT_REF (special characters like @ # : / % are fine). Any DATABASE_URL /
# DIRECT_DATABASE_URL lines in .env.supabase are then ignored.
if [ -n "${SUPABASE_DB_PASSWORD:-}" ]; then
  : "${SUPABASE_PROJECT_REF:?SUPABASE_PROJECT_REF missing in .env.supabase}"
  ENC="$(node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$SUPABASE_DB_PASSWORD")"
  DIRECT_DATABASE_URL="postgresql://postgres:${ENC}@db.${SUPABASE_PROJECT_REF}.supabase.co:5432/postgres?sslmode=require"
  if [ -n "${SUPABASE_POOLER_HOST:-}" ]; then
    DATABASE_URL="postgresql://postgres.${SUPABASE_PROJECT_REF}:${ENC}@${SUPABASE_POOLER_HOST}:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"
  else
    DATABASE_URL="$DIRECT_DATABASE_URL"
  fi
  export DIRECT_DATABASE_URL DATABASE_URL
elif [[ "${DIRECT_DATABASE_URL:-}" == *"[YOUR-PASSWORD]"* || -z "${DIRECT_DATABASE_URL:-}" ]]; then
  echo "✗ Add SUPABASE_DB_PASSWORD=<your db password> to apps/api/.env.supabase"; exit 1
fi
node -e 'try{new URL(process.argv[1])}catch(e){console.error("✗ connection URL invalid — set SUPABASE_DB_PASSWORD (raw) instead of editing the URL");process.exit(1)}' "$DIRECT_DATABASE_URL"
case "${1:-status}" in
  deploy)
    pnpm schema:check
    pnpm exec prisma migrate deploy
    pnpm seed
    pnpm exec prisma migrate diff --from-url "$DIRECT_DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --exit-code && echo "✓ no drift";;
  status)
    pnpm exec prisma migrate status || true
    psql "$DIRECT_DATABASE_URL" -tAc "select extname||' '||extversion from pg_extension where extname in ('postgis','pg_trgm','pgcrypto','citext') order by 1";;
  psql) psql "$DIRECT_DATABASE_URL";;
  *) echo "usage: $0 deploy|status|psql"; exit 1;;
esac
