#!/usr/bin/env bash
# افتح نكهة بعينها على المحاكي بأمر واحد:
#
#   tool/flavor.sh customer      # تطبيق العميل  — «صناعتي»
#   tool/flavor.sh partner       # تطبيق الشركاء — «صناعتي للشركاء»
#   tool/flavor.sh fleet         # تطبيق الأساطيل — «صناعتي للأساطيل»
#
# النكهات الثلاث كانت تتقاسم معرّفاً واحداً على iOS، فيمحو تنصيبُ إحداها الأخرى من الجهاز
# ويبدو أن «التطبيق اختفى». هذا السكربت يكتب معرّف النكهة واسمها العربي في
# ios/Flutter/Flavor.xcconfig ثم يبني ويشغّل — فتتعايش الثلاثة جنباً إلى جنب.
set -euo pipefail
cd "$(dirname "$0")/.."

FLAVOR="${1:-customer}"
case "$FLAVOR" in
  customer) NAME='صناعتي' ;;
  partner)  NAME='صناعتي للشركاء' ;;
  fleet)    NAME='صناعتي للأساطيل' ;;
  *) echo "نكهة غير معروفة: $FLAVOR (customer | partner | fleet)" >&2; exit 2 ;;
esac

cat > ios/Flutter/Flavor.xcconfig <<CFG
// يُكتب آلياً من tool/flavor.sh — لا تُحرّره يدوياً.
FLAVOR_SUFFIX = .$FLAVOR
FLAVOR_NAME = $NAME
CFG

# عنوان الخادم يُحدَّث في كل تشغيلة عبر `tool/api-host.sh` — هو المصدر الوحيد له (يكتب
# `env/dev.json` و`dev_host.dart` معاً). سبب الإصرار: العنوان يتبدّل بتبدّل الشبكة، وحين يبقى
# قديماً يفشل التطبيق بـ«تعذّر الوصول إلى الخادم» ولا يظهر السبب في أي مكان.
#   HOST=localhost tool/flavor.sh customer   # محاكي فقط، أو عمل بلا شبكة
tool/api-host.sh "${HOST:-lan}"
API=$(python3 -c "import json;print(json.load(open('env/dev.json'))['API_BASE_URL'])")

echo "▶ $NAME (com.example.sinaaty.$FLAVOR) → $API"
# على iOS تكفي الـxcconfig أعلاه: `--flavor` هناك يطلب مخططات Xcode مخصّصة لا وجود لها،
# فيفشل البناء. على أندرويد النكهات gradle حقيقية فتحتاج الراية.
# ونكتشف أندرويد من الأجهزة الموصولة لا من الوسائط: `tool/flavor.sh partner` على جوال أندرويد
# موصول كان يبني بلا الراية فتفشل بـ«Gradle build failed to produce an .apk file» — وهي رسالة
# تُضيّع وقت من يقرؤها لأنها لا تذكر النكهات إطلاقاً.
EXTRA=()
DEVICES="$(flutter devices --machine 2>/dev/null || echo '[]')"
if [[ "${*:2}" == *"android"* || "${ANDROID:-}" == "1" ]] || grep -q '"targetPlatform": *"android' <<<"$DEVICES"; then
  EXTRA+=(--flavor "$FLAVOR")
fi
exec flutter run "${EXTRA[@]}" -t "lib/main_$FLAVOR.dart" --dart-define-from-file=env/dev.json "${@:2}"
