#!/usr/bin/env bash
# يُنزّل ملفات إعداد Firebase للنكهات الثلاث. غير تفاعلي، وآمن الإعادة.
#
#   tool/firebase-setup.sh [project-id]     # الافتراضي snayah-5f07b
#
# لماذا هذا بدل `flutterfire configure`: الأخير تفاعلي ويسجّل تطبيقاً واحداً لكل منصة، وعندنا
# ثلاث نكهات بثلاثة معرّفات. وهذا يُنشئ الناقص فقط ويترك الموجود.
#
# الملفات أسرارٌ لا تُثبَّت في المستودع (.gitignore) — يُعيد كل مطوّر تشغيل هذا عنده.
set -euo pipefail
cd "$(dirname "$0")/.."
PROJECT="${1:-snayah-5f07b}"
BASE="$(grep -oE 'applicationId = "[^"]*"' android/app/build.gradle.kts | head -1 | cut -d'"' -f2)"
[ -n "$BASE" ] || { echo "تعذّرت قراءة applicationId من build.gradle.kts"; exit 1; }
echo "▸ المشروع $PROJECT · المعرّف الأساس $BASE"

apps="$(firebase apps:list --project="$PROJECT" 2>/dev/null)"
for f in customer partner fleet; do
  case $f in customer) N='صناعتي';; partner) N='صناعتي للشركاء';; fleet) N='صناعتي للأساطيل';; esac
  for plat in android ios; do
    # نبحث بالمعرّف لا بالاسم: الأسماء تتكرّر، والمعرّف هو الهوية.
    id="$(firebase apps:list --project="$PROJECT" 2>/dev/null | grep -oE "1:[0-9]+:$plat:[a-f0-9]+" | while read -r a; do
      pkg="$(firebase apps:sdkconfig "$plat" "$a" --project="$PROJECT" 2>/dev/null | grep -oE "$BASE\.$f" | head -1)"
      [ "$plat" = ios ] && [ -n "$pkg" ] && { echo "$a"; break; }
    done | head -1)"
    if [ "$plat" = android ]; then
      # أندرويد: ملف واحد يحوي كل الجاذبين، والمُلحق يختار المطابق لمعرّف النكهة وقت البناء.
      [ -f android/app/google-services.json ] && continue
      any="$(firebase apps:list --project="$PROJECT" 2>/dev/null | grep -oE '1:[0-9]+:android:[a-f0-9]+' | head -1)"
      [ -n "$any" ] || { echo "  ✗ لا تطبيق أندرويد في المشروع — أنشئه من الكونسول"; continue; }
      firebase apps:sdkconfig android "$any" --project="$PROJECT" 2>/dev/null | sed -n '/^{/,$p' > android/app/google-services.json
      echo "  ✓ android/app/google-services.json"
    else
      [ -n "$id" ] || { echo "  ✗ لا تطبيق iOS لـ$BASE.$f — أنشئه: firebase apps:create ios \"$N\" --bundle-id $BASE.$f --project=$PROJECT"; continue; }
      mkdir -p "ios/config/$f"
      firebase apps:sdkconfig ios "$id" --project="$PROJECT" 2>/dev/null | sed -n '/<?xml/,$p' > "ios/config/$f/GoogleService-Info.plist"
      echo "  ✓ ios/config/$f/GoogleService-Info.plist"
    fi
  done
done
