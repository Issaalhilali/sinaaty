#!/usr/bin/env bash
# Run the e2e suite against a *fresh* database, the way CI does.
#
# The suite uses fixed fixtures (plates like «ب ح د 1122», demo CR numbers). Against a long-lived dev
# database those fixtures collide after a few runs and tests fail for reasons that have nothing to do with
# the code — which is exactly what happened while building Step 26. This creates a scratch database beside
# the dev one, applies every migration, seeds it, and runs the suite there. The dev database is untouched.
#
#   apps/api/tools/e2e-clean-db.sh                 # full suite
#   apps/api/tools/e2e-clean-db.sh test/fleet.e2e-spec.ts
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; cd "$HERE/.."

: "${DATABASE_URL:=$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | tr -d '"')}"
PG_URL="${DATABASE_URL%%\?*}"
BASE="${PG_URL%/*}"
SCRATCH="${E2E_DB:-sinaaty_e2e}"

psql "$BASE/postgres" -q -c "DROP DATABASE IF EXISTS $SCRATCH WITH (FORCE)"
psql "$BASE/postgres" -q -c "CREATE DATABASE $SCRATCH"
for m in $(ls -d prisma/migrations/*/ | sort); do
  psql "$BASE/$SCRATCH" -q -v ON_ERROR_STOP=1 -f "$m/migration.sql" >/dev/null
done

export DATABASE_URL="$BASE/$SCRATCH"
npx tsx prisma/seed.ts >/dev/null
echo "▸ running the e2e suite against $SCRATCH"
npx jest --config ./test/jest-e2e.json --runInBand "$@"
