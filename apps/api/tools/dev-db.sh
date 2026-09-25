#!/usr/bin/env bash
# Local dev database without Docker: PostgreSQL 17 + PostGIS via Homebrew.
#   brew install postgresql@17 postgis
#   apps/api/tools/dev-db.sh start|stop|reset
set -euo pipefail
P=/opt/homebrew/opt/postgresql@17/bin
D="${SINAATY_PGDATA:-$HOME/.sinaaty-pg17}"
export LANG=C LC_ALL=C
case "${1:-start}" in
  start)
    [ -f "$D/PG_VERSION" ] || "$P/initdb" -D "$D" -U postgres --auth=trust -E UTF8 --locale=C >/dev/null
    "$P/pg_ctl" -D "$D" -o "-p 5432 -h 127.0.0.1 -k /tmp" -l "$D/log" start >/dev/null || true
    sleep 1
    "$P/psql" -h 127.0.0.1 -U postgres -qc "DO \$\$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='sinaaty') THEN CREATE ROLE sinaaty LOGIN SUPERUSER PASSWORD 'sinaaty'; END IF; END \$\$;"
    "$P/psql" -h 127.0.0.1 -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='sinaaty'" | grep -q 1 || "$P/psql" -h 127.0.0.1 -U postgres -qc "CREATE DATABASE sinaaty OWNER sinaaty"
    echo "postgres up on 127.0.0.1:5432 (db=sinaaty user=sinaaty)";;
  stop)  "$P/pg_ctl" -D "$D" stop >/dev/null && echo stopped;;
  reset) "$P/psql" -h 127.0.0.1 -U postgres -qc "DROP DATABASE IF EXISTS sinaaty" -c "CREATE DATABASE sinaaty OWNER sinaaty" && echo "database reset";;
  *) echo "usage: $0 start|stop|reset"; exit 1;;
esac
