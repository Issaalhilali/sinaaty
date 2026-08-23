#!/usr/bin/env bash
# شغّل التطبيق بلا أن تتذكر شيئاً:
#
#   ./run.sh              # نسخة العميل
#   ./run.sh partner      # نسخة الورشة/المورد
#   ./run.sh fleet        # نسخة الأسطول
#   ./run.sh customer -d <device>    # أي وسيط إضافي يمر كما هو إلى flutter run
#
# لماذا يوجد هذا الملف: التطبيق ثلاث نكهات (عميل/شريك/أسطول) بمعرّفات تطبيق مختلفة. أمر `flutter run`
# المجرد يبني على أندرويد مهمة `assembleDebug` التي **لا تنتج ملف APK** مع وجود النكهات، فيقول Flutter
# «بنى ولم أجد الملف» — رسالة تُضيّع وقت من يقرؤها. وiOS عكسها تماماً: لا مخططات (schemes) للنكهات بعد،
# فتمرير --flavor عليها يفشل. هذا السكربت يعرف الفرق ويمرر الصواب لكل منصة.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

FLAVOR="${1:-customer}"
case "$FLAVOR" in
  customer|partner|fleet) shift || true ;;
  -*) FLAVOR="customer" ;;                       # بدأ بوسيط: النكهة الافتراضية
  *) echo "نكهة غير معروفة: $FLAVOR — استعمل customer أو partner أو fleet"; exit 2 ;;
esac

ENV_FILE="env/dev.json"
[ -f "$ENV_FILE" ] || { echo "لا يوجد $ENV_FILE — انسخه من env/dev.example.json إن وُجد"; exit 2; }

DEVICES="$(flutter devices --machine 2>/dev/null || echo '[]')"

# أندرويد يحتاج --flavor؛ iOS لا يقبلها حتى تُضاف مخططات Xcode (backlog).
ANDROID=0
grep -q '"targetPlatform": *"android' <<<"$DEVICES" && ANDROID=1
for a in "$@"; do case "$a" in *emulator*|*android*) ANDROID=1 ;; esac; done

# جهاز حقيقي لا يعرف localhost إلا نفسه: لو تُرك كما هو لفتح التطبيق وسجّل الدخول ثم لم يرَ شيئاً —
# يبدو معطلاً وهو سليم. نمرر عنوان الماك على الشبكة، ولا نثبّته نصاً لأنه يتغير مع كل شبكة.
REAL_DEVICE=0
grep -q '"emulator": *false' <<<"$DEVICES" && grep -qE '"targetPlatform": *"(android|ios)' <<<"$DEVICES" && REAL_DEVICE=1

ARGS=(run -t "lib/main_${FLAVOR}.dart" --dart-define-from-file="$ENV_FILE")
[ "$ANDROID" = "1" ] && ARGS+=(--flavor "$FLAVOR")

if [ "$REAL_DEVICE" = "1" ]; then
  LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
  if [ -n "$LAN_IP" ]; then
    ARGS+=(--dart-define=API_BASE_URL="http://$LAN_IP:3000")
    echo "▸ جهاز حقيقي: الخادم عبر الشبكة → http://$LAN_IP:3000"
    nc -z "$LAN_IP" 3000 2>/dev/null || echo "  ⚠ لا شيء يستمع على $LAN_IP:3000 — شغّل الـAPI على 0.0.0.0 (لا 127.0.0.1) وتأكد أن الجوال على نفس الشبكة"
  else
    echo "  ⚠ تعذّر معرفة عنوان الماك على الشبكة — التطبيق سيقصد localhost ولن يرى بيانات على جهاز حقيقي"
  fi
fi

echo "▸ تشغيل نسخة «$FLAVOR»$([ "$ANDROID" = 1 ] && echo ' على أندرويد (مع --flavor)' || echo ' (بلا --flavor — iOS/سطح المكتب)')"
exec flutter "${ARGS[@]}" "$@"
