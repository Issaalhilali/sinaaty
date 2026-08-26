#!/usr/bin/env bash
# يُشغّل الخادم ومعه الأسرار المحلّية من ملفاتها — فلا يُكتب سرٌّ في `.env` ولا في المستودع.
#
#   tools/with-secrets.sh node dist/main
#   tools/with-secrets.sh pnpm dev
#
# مفتاح حساب خدمة Firebase في `.secrets/fcm.json` (مستثنى في .gitignore، صلاحياته 600).
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .secrets/fcm.json ] && export FCM_SERVICE_ACCOUNT_JSON="$(cat .secrets/fcm.json)"
exec "$@"
