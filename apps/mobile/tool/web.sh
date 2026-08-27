#!/usr/bin/env bash
# يبني تطبيق العميل للوِب ويقدّمه محلياً.
#
#   tool/web.sh [flavor] [port]     # الافتراضي customer 8080
#
# نفس شيفرة Flutter لا نسخةٌ ثانية: هويةٌ واحدة وشاشاتٌ واحدة، وما يُصلَح في الجوال يُصلَح هنا.
# ومنفذ 8080 مسموحٌ به في `CORS_ORIGINS` عند الخادم — بدونه يفشل الطلب قبل أن يبدأ.
set -euo pipefail
cd "$(dirname "$0")/.."
FLAVOR="${1:-customer}"; PORT="${2:-8080}"
tool/api-host.sh ip >/dev/null
flutter build web -t "lib/main_$FLAVOR.dart" --dart-define-from-file=env/dev.json
echo "▶ http://localhost:$PORT"
cd build/web && exec python3 -m http.server "$PORT"
