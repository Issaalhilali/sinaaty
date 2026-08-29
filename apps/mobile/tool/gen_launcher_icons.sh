#!/usr/bin/env bash
# أيقونة المشغّل تُطبع من الشيفرة لا من ملف تصميم منفصل:
#
#   flutter test --update-goldens test/tool/icon_gen_test.dart   # يرسم icon_1024.png من BrandMark
#   tool/gen_launcher_icons.sh                                   # ينزلها إلى كثافات أندرويد
#
# فإن تغيّرت العلامة يوماً أُعيد الأمران ولا تفترق الأيقونة عن التطبيق.
# (sips أداة macOS مضمّنة — لا ImageMagick ولا حزمة pub إضافية.)
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=test/tool/icon_1024.png
[ -f "$SRC" ] || { echo "أنشئ المصدر أولاً: flutter test --update-goldens test/tool/icon_gen_test.dart"; exit 1; }
RES=android/app/src/main/res
FG=test/tool/icon_fg_1024.png
[ -f "$FG" ] || { echo "أنشئ طبقة المقدمة أولاً (نفس أمر الذهبيات أعلاه)"; exit 1; }
# القانونية (ما قبل أندرويد 8) بكثافات 48dp، والمقدمة التكيفية بكثافات 108dp
for d in mdpi:48:108 hdpi:72:162 xhdpi:96:216 xxhdpi:144:324 xxxhdpi:192:432; do
  IFS=: read -r name px fgpx <<< "$d"; dir="$RES/mipmap-$name"
  sips -z "$px" "$px" "$SRC" --out "$dir/ic_launcher.png" >/dev/null
  sips -z "$fgpx" "$fgpx" "$FG" --out "$dir/ic_launcher_foreground.png" >/dev/null
  echo "✓ $dir (ic_launcher ${px}px · foreground ${fgpx}px)"
done

# iOS: نفس المصدر إلى AppIcon.appiconset — الأسماء والمقاسات كما في Contents.json القالبي
IOSDIR=ios/Runner/Assets.xcassets/AppIcon.appiconset
for e in 1024x1024@1x:1024 20x20@1x:20 20x20@2x:40 20x20@3x:60 29x29@1x:29 29x29@2x:58 29x29@3x:87 \
         40x40@1x:40 40x40@2x:80 40x40@3x:120 60x60@2x:120 60x60@3x:180 76x76@1x:76 76x76@2x:152 83.5x83.5@2x:167; do
  name="Icon-App-${e%%:*}.png"; px="${e##*:}"
  sips -z "$px" "$px" "$SRC" --out "$IOSDIR/$name" >/dev/null
done
echo "✓ $IOSDIR (15 مقاساً)"
