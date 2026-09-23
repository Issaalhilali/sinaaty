#!/usr/bin/env bash
# مشغّل التطوير المحلي للخادم: يصدّر أسرار التشغيل من ملفاتها المحجوبة عن المستودع ثم يبدأ nest في وضع المراقبة.
#
# لماذا: `.env` يضبط INTEGRATION_PUSH=live، والمحوّل يرفض الإقلاع بلا حساب خدمة FCM — والحساب سرٌّ يعيش في
# `.secrets/fcm.json` (gitignored) لا في `.env`. تشغيل `pnpm dev` مباشرةً كان يُسقط الخادم بـ«FCM_SERVICE_ACCOUNT_JSON مفقود».
# السرّ يُقرأ من الملف إلى بيئة العملية فقط؛ لا يُطبع ولا يُكتب في أي مكان.
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ -z "${FCM_SERVICE_ACCOUNT_JSON:-}" && -r .secrets/fcm.json ]]; then
  FCM_SERVICE_ACCOUNT_JSON="$(base64 < .secrets/fcm.json | tr -d '\n')"
  export FCM_SERVICE_ACCOUNT_JSON
fi
exec pnpm exec nest start --watch "$@"
