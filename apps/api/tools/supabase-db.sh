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
if [[ "$DIRECT_DATABASE_URL" == *"[YOUR-PASSWORD]"* ]]; then
  echo "✗ Put your Supabase database password into apps/api/.env.supabase first (replace [YOUR-PASSWORD])."; exit 1
fi
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
