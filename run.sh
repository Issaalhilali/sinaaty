#!/usr/bin/env bash
# يُشغّل صناعتي كلّها بأمر واحد.
#
#   ./run.sh            # الخادم + لوحة التحكم + الوِب
#   ./run.sh stop       # يوقفها
#
# لماذا: كانت ثلاثة أوامر في ثلاث نوافذ، فيبدو المنتج ثلاثة منتجات وهو واحد — خادمٌ واحد
# وقاعدةٌ واحدة وشيفرةُ واجهةٍ واحدة. والفصل كان تشغيلياً لا معمارياً.
set -euo pipefail
cd "$(dirname "$0")"
PIDS=.run.pids

stop() {
  [ -f "$PIDS" ] && while read -r p; do kill "$p" 2>/dev/null || true; done < "$PIDS"
  rm -f "$PIDS"; pkill -f "http.server 8080" 2>/dev/null || true
  echo "أُوقفت."; exit 0
}
[ "${1:-}" = "stop" ] && stop
: > "$PIDS"

echo "▸ الخادم"
(cd apps/api && pnpm build >/dev/null 2>&1 && JOBS_ENABLED=false tools/with-secrets.sh node dist/main > /tmp/sinaaty-api.log 2>&1 & echo $! >> "../../$PIDS")
until curl -sf -o /dev/null http://localhost:3000/v1/health 2>/dev/null; do sleep 1; done
echo "  ✓ http://localhost:3000  ·  /docs"

echo "▸ الوِب (نفس تطبيق Flutter — رابطٌ واحد يخدم العميل والشريك)"
(cd apps/mobile && tool/api-host.sh ip >/dev/null && flutter build web -t lib/main_customer.dart --dart-define-from-file=env/dev.json >/dev/null 2>&1)
(cd apps/mobile/build/web && python3 -m http.server 8080 > /tmp/sinaaty-web.log 2>&1 & echo $! >> "../../../../$PIDS")
echo "  ✓ http://localhost:8080"

echo "▸ لوحة التحكم"
(cd apps/admin-web && pnpm dev > /tmp/sinaaty-admin.log 2>&1 & echo $! >> "../../$PIDS")
echo "  ✓ http://localhost:3001"

echo
echo "صناعتي تعمل. أوقفها بـ ./run.sh stop"
