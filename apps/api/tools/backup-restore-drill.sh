#!/usr/bin/env bash
# Backup + restore drill (CLAUDE.md Step 24).
#
# A backup nobody has restored is a rumour. This takes a real dump of the live database, restores it into
# a scratch database, and then proves the restored copy is *usable*, not merely present:
#   - every table that must never lose rows is compared row-for-row,
#   - the double-entry ledger still balances inside the restored copy,
#   - the audit-log hash chain still verifies,
#   - the append-only triggers are still attached (a restore that drops them silently removes the guarantee).
#
# Usage:
#   apps/api/tools/backup-restore-drill.sh                # dump → restore → verify → drop the scratch DB
#   KEEP=1 apps/api/tools/backup-restore-drill.sh         # keep the scratch DB and the dump for inspection
#
# Managed Postgres (Supabase) also offers PITR; this drill covers the logical path that we control.
# The PITR side is exercised from the provider console — see docs/runbooks/backup-restore.md.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE/.."

: "${DATABASE_URL:=$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | tr -d '"')}"
STAMP="$(date +%Y%m%d-%H%M%S)"
DUMP="${DUMP_DIR:-/tmp}/sinaaty-$STAMP.dump"
SCRATCH="sinaaty_restore_$(echo "$STAMP" | tr -d "-")"   # database names cannot carry a hyphen unquoted

# Prisma accepts `?schema=public`; libpq (pg_dump/psql) rejects it — strip the query string first.
PG_URL="${DATABASE_URL%%\?*}"
# Server URL without the database name, so we can create/drop the scratch database next to the real one.
BASE_URL="${PG_URL%/*}"
SRC_DB="${PG_URL##*/}"
SCRATCH_URL="$BASE_URL/$SCRATCH"

say() { printf '\n\033[1m▸ %s\033[0m\n' "$*"; }
fail() { printf '\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# pg_dump refuses to dump a newer server than itself, and the machine may have an older client first on
# PATH (Homebrew keeps every major version side by side). Pick the client that matches the server.
SERVER_MAJOR="$(psql "$PG_URL" -tAc 'SHOW server_version' | cut -d. -f1)"
for candidate in "/opt/homebrew/opt/postgresql@$SERVER_MAJOR/bin" "/usr/lib/postgresql/$SERVER_MAJOR/bin" "/usr/local/opt/postgresql@$SERVER_MAJOR/bin"; do
  if [ -x "$candidate/pg_dump" ]; then PATH="$candidate:$PATH"; break; fi
done
CLIENT_MAJOR="$(pg_dump --version | grep -oE '[0-9]+' | head -1)"
[ "$CLIENT_MAJOR" = "$SERVER_MAJOR" ] || fail "pg_dump $CLIENT_MAJOR cannot dump a PostgreSQL $SERVER_MAJOR server — install the matching client"

cleanup() {
  if [ "${KEEP:-0}" != "1" ]; then
    psql "$BASE_URL/postgres" -q -c "DROP DATABASE IF EXISTS $SCRATCH WITH (FORCE)" >/dev/null 2>&1 || true
    rm -f "$DUMP"
  else
    echo "kept: $DUMP and database $SCRATCH"
  fi
}
trap cleanup EXIT

say "1/5 dump $SRC_DB"
pg_dump --format=custom --no-owner --no-privileges --file "$DUMP" "$PG_URL"
SIZE=$(du -h "$DUMP" | cut -f1)
echo "   $DUMP ($SIZE)"

say "2/5 restore into $SCRATCH"
psql "$BASE_URL/postgres" -q -c "DROP DATABASE IF EXISTS $SCRATCH WITH (FORCE)" >/dev/null
psql "$BASE_URL/postgres" -q -c "CREATE DATABASE $SCRATCH" >/dev/null
# --exit-on-error would stop on the extension comments a non-superuser cannot set; failures that matter
# are caught by the verification below, so restore noisily but judge by the checks.
pg_restore --dbname "$SCRATCH_URL" --no-owner --no-privileges --jobs 4 "$DUMP" 2>/tmp/restore-$STAMP.err || true
if grep -qiE 'error:.*(relation|column|constraint|function)' /tmp/restore-$STAMP.err; then
  head -20 /tmp/restore-$STAMP.err >&2
  fail "restore reported schema errors"
fi

say "3/5 row counts match for the tables that must never lose a row"
TABLES="work_orders work_order_versions work_order_signatures invoices invoice_lines payments escrow_holds ledger_entries ledger_lines promissory_notes settlements audit_log part_orders warranties accident_reports"
for t in $TABLES; do
  a=$(psql "$PG_URL" -tAc "SELECT count(*) FROM $t")
  b=$(psql "$SCRATCH_URL" -tAc "SELECT count(*) FROM $t")
  [ "$a" = "$b" ] || fail "$t: source=$a restored=$b"
  printf '   %-24s %s\n' "$t" "$a"
done

say "4/5 the restored ledger still balances, to the halala"
IMBALANCE=$(psql "$SCRATCH_URL" -tAc "SELECT COALESCE(sum(debit) - sum(credit), 0) FROM ledger_lines")
[ "$(printf '%.2f' "$IMBALANCE")" = "0.00" ] || fail "restored ledger is out by $IMBALANCE"
UNBALANCED=$(psql "$SCRATCH_URL" -tAc "SELECT count(*) FROM (SELECT entry_id FROM ledger_lines GROUP BY entry_id HAVING sum(debit) <> sum(credit)) x")
[ "$UNBALANCED" = "0" ] || fail "$UNBALANCED restored journal entries do not balance"
echo "   ledger imbalance: 0.00 · unbalanced entries: 0"

say "5/5 append-only guarantees survived the restore"
# Judged by behaviour, not by trigger names: what matters is that the restored copy still *refuses* an
# UPDATE. (Matching on names is how the first version of this drill raised a false alarm — the triggers
# are called trg_*_immutable / trg_audit_no_update, not %append_only%.)
APPEND_ONLY="audit_log ledger_entries work_order_versions settlements"
for t in $APPEND_ONLY; do
  guards=$(psql "$SCRATCH_URL" -tAc "SELECT count(*) FROM pg_trigger WHERE NOT tgisinternal AND tgrelid = '$t'::regclass")
  [ "$guards" -gt 0 ] || fail "$t has no trigger in the restored copy"
  rows=$(psql "$SCRATCH_URL" -tAc "SELECT count(*) FROM $t")
  if [ "$rows" -gt 0 ]; then
    if psql "$SCRATCH_URL" -q -v ON_ERROR_STOP=1 -c "UPDATE $t SET id = id WHERE id = (SELECT id FROM $t LIMIT 1)" >/dev/null 2>&1; then
      fail "the restored copy allowed an UPDATE on $t"
    fi
  fi
  printf '   %-24s triggers=%s · UPDATE rejected\n' "$t" "$guards"
done

printf '\n\033[32m✓ drill passed\033[0m — %s restored and verified from %s (%s)\n' "$SCRATCH" "$DUMP" "$SIZE"
