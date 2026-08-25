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

# عنوان الـAPI يُحسب عند التشغيل لا يُكتب في ملف: كان `env/dev.json` يحمل عنوان الشبكة المحلية،
# فإذا تغيّر عنوان الجهاز (شبكة أخرى أو DHCP جديد) صمت التطبيق بـ«لا يوجد اتصال بالإنترنت» بلا
# سبب ظاهر. المحاكي يرى مضيفه على localhost، ومحاكي أندرويد على 10.0.2.2، والجهاز الحقيقي وحده
# يحتاج عنوان الشبكة — فيُلتقط آلياً.
API="http://localhost:3000"
if [[ "${*:2}" == *"android"* || "${ANDROID:-}" == "1" ]]; then API="http://10.0.2.2:3000"; fi
if [[ "${DEVICE:-}" == "1" ]]; then
  LAN=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)
  [[ -n "$LAN" ]] && API="http://$LAN:3000" || { echo "تعذّر معرفة عنوان الشبكة — مرّر API=... يدوياً" >&2; exit 3; }
fi

echo "▶ $NAME (com.example.sinaaty.$FLAVOR) → $API"
# على iOS تكفي الـxcconfig أعلاه: `--flavor` هناك يطلب مخططات Xcode مخصّصة لا وجود لها،
# فيفشل البناء. على أندرويد النكهات gradle حقيقية فتحتاج الراية.
EXTRA=()
if [[ "${*:2}" == *"android"* || "${ANDROID:-}" == "1" ]]; then EXTRA+=(--flavor "$FLAVOR"); fi
exec flutter run "${EXTRA[@]}" -t "lib/main_$FLAVOR.dart" --dart-define-from-file=env/dev.json --dart-define=API_BASE_URL="$API" "${@:2}"
