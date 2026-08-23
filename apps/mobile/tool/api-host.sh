#!/usr/bin/env bash
# يضبط عنوان الخادم في env/dev.json على عنوان هذا الماك في الشبكة المحلية.
#
# لماذا: `localhost` على **جهاز حقيقي** يعني الجهاز نفسه لا حاسوب المطوّر — فيعلق كل طلب حتى تنتهي
# مهلة الاتصال (١٥ ثانية) ثم يفشل، فيبدو التطبيق جامداً في كل شاشة وهو سليم تماماً. والعنوان يتغير
# بتغير الشبكة، فلا يصلح تثبيته يدوياً — يُقرأ في كل تشغيل.
#
#   tool/api-host.sh            # اضبطه على عنوان الشبكة (للجوال الحقيقي والمحاكي معاً)
#   tool/api-host.sh localhost  # أعده إلى localhost (محاكي فقط، أو عمل بلا شبكة)
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
ENV_FILE="env/dev.json"
PORT="${API_PORT:-3000}"

if [ "${1:-lan}" = "localhost" ]; then
  HOST="localhost"
else
  HOST="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
  [ -n "$HOST" ] || { echo "تعذّر معرفة عنوان الماك في الشبكة — تحقق من اتصال الواي فاي"; exit 1; }
fi

python3 - "$ENV_FILE" "http://$HOST:$PORT" <<'PY'
import json, sys
path, url = sys.argv[1], sys.argv[2]
cfg = json.load(open(path, encoding='utf-8'))
was = cfg.get('API_BASE_URL')
cfg['API_BASE_URL'] = url
json.dump(cfg, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print(f"▸ عنوان الخادم: {was} ← {url}" if was != url else f"▸ عنوان الخادم كما هو: {url}")
PY

# التحقق مبكراً خير من اكتشافه بعد عشر دقائق حيرة أمام شاشة جامدة.
if [ "$HOST" != "localhost" ] && ! nc -z "$HOST" "$PORT" 2>/dev/null; then
  echo "  ⚠ لا شيء يستمع على $HOST:$PORT — شغّل الـ API واجعله يستمع على 0.0.0.0 لا 127.0.0.1،"
  echo "    وتأكد أن الجوال على نفس شبكة الواي فاي."
fi
