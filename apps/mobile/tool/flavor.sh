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

echo "▶ $NAME (com.example.sinaaty.$FLAVOR)"
# على iOS تكفي الـxcconfig أعلاه: `--flavor` هناك يطلب مخططات Xcode مخصّصة لا وجود لها،
# فيفشل البناء. على أندرويد النكهات gradle حقيقية فتحتاج الراية.
EXTRA=()
if [[ "${*:2}" == *"android"* || "${ANDROID:-}" == "1" ]]; then EXTRA+=(--flavor "$FLAVOR"); fi
exec flutter run "${EXTRA[@]}" -t "lib/main_$FLAVOR.dart" --dart-define-from-file=env/dev.json "${@:2}"
