#!/usr/bin/env bash
# One command for local dev.  Usage:  ./dev.sh start | stop | restart | status
set -uo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
DB="$ROOT/apps/api/tools/dev-db.sh"

stop_all() {
  echo "⏹  stopping API…";  pkill -f "nest start" 2>/dev/null; pkill -f "apps/api/dist/main.js" 2>/dev/null; pkill -f "node dist/main.js" 2>/dev/null; sleep 1
  echo "⏹  stopping database…"; "$DB" stop 2>/dev/null || true
  echo "✓ everything stopped"
}
start_all() {
  echo "▶  starting database…"; "$DB" start 2>/dev/null | tail -1
  echo "▶  starting API (Ctrl+C to stop)…  → http://localhost:3000/docs"
  cd "$ROOT" && exec pnpm --filter api dev
}
status_all() {
  pgrep -f "postgres -D" >/dev/null && echo "database: running" || echo "database: stopped"
  curl -s -m 2 localhost:3000/v1/health >/dev/null && echo "api: running (http://localhost:3000/docs)" || echo "api: stopped"
}
case "${1:-start}" in
  start)   start_all;;
  stop)    stop_all;;
  restart) stop_all; start_all;;
  status)  status_all;;
  *) echo "usage: ./dev.sh start|stop|restart|status"; exit 1;;
esac
