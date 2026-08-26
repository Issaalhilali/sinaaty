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

# العنوان الرقمي هو الافتراضي لأنه الوحيد الذي يعمل في كل مكان. جرّبتُ اسم Bonjour
# (`<mac>.local`) لأنه لا يشيخ، فوجدتُ **أندرويد لا يحلّه إطلاقاً** — قِسته على جوال حقيقي:
# الاسم 000 والرقم 200. يعمل على iOS وحده، فلا يصلح افتراضاً.
# وشيخوخة الرقم يعالجها `ApiHostProbe` في التطبيق: يمسح شبكة الجهاز ويجد الخادم بنفسه.
#   tool/api-host.sh name        # اسم Bonjour (iOS فقط)
#   tool/api-host.sh localhost   # محاكي فقط، أو عمل بلا شبكة
case "${1:-ip}" in
  localhost) HOST="localhost" ;;
  ip|lan)    HOST="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
             [ -n "$HOST" ] || { echo "تعذّر معرفة عنوان الماك في الشبكة — تحقق من اتصال الواي فاي"; exit 1; } ;;
  name)      HOST="$(scutil --get LocalHostName 2>/dev/null).local"
             # نتحقّق أن الاسم يُحلّ فعلاً؛ بعض الشبكات تحجب mDNS، فنسقط إلى الرقم بدل أن نكسر البناء.
             if ! curl -s -m 3 -o /dev/null "http://$HOST:$PORT/v1/health" 2>/dev/null; then
               ALT="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
               [ -n "$ALT" ] && { echo "  ⚠ الاسم $HOST لا يُحلّ هنا — نسقط إلى $ALT"; HOST="$ALT"; }
             fi ;;
  *)         HOST="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)" ;;
esac

python3 - "$ENV_FILE" "http://$HOST:$PORT" <<'PY'
import json, sys
path, url = sys.argv[1], sys.argv[2]
cfg = json.load(open(path, encoding='utf-8'))
was = cfg.get('API_BASE_URL')
cfg['API_BASE_URL'] = url
json.dump(cfg, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print(f"▸ عنوان الخادم: {was} ← {url}" if was != url else f"▸ عنوان الخادم كما هو: {url}")
PY

# والأمر المجرد `flutter run` لا يمرر ملف البيئة — فيقرأ هذا الثابت المولَّد بدل «localhost».
python3 - "lib/core/config/dev_host.dart" "http://$HOST:$PORT" <<'PY'
import re, sys
path, url = sys.argv[1], sys.argv[2]
src = open(path, encoding='utf-8').read()
open(path, 'w', encoding='utf-8').write(re.sub(r"const String kDevLanHost = '[^']*';", f"const String kDevLanHost = '{url}';", src))
PY

# التحقق مبكراً خير من اكتشافه بعد عشر دقائق حيرة أمام شاشة جامدة.
if [ "$HOST" != "localhost" ] && ! nc -z "$HOST" "$PORT" 2>/dev/null; then
  echo "  ⚠ لا شيء يستمع على $HOST:$PORT — شغّل الـ API واجعله يستمع على 0.0.0.0 لا 127.0.0.1،"
  echo "    وتأكد أن الجوال على نفس شبكة الواي فاي."
fi
