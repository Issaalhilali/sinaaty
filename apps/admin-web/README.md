# admin-web — لوحة إدارة صناعية (Angular + PrimeNG)

- `pnpm --filter admin-web dev` → http://localhost:3001 (يخاطب الخادم على `API_BASE_URL`، افتراضياً `http://localhost:3000`).
- `pnpm --filter admin-web build` → `dist/` ساكن؛ `pnpm --filter admin-web start` يقدّمه على 3001 بلا اعتماديات (`tools/serve.mjs`).
- عنوان الخادم يُحقن عند البناء: `ng build --define API_BASE_URL="'https://api.example'"` (انظر Dockerfile).
- `pnpm --filter admin-web test` وحدات (Vitest) · `test:e2e` فحص Playwright ضد خادمٍ حقيقي مبذور.

المسارات والعناوين والانتقاء في الفحص هي نفسها التي كانت في نسخة Next.js — التحويل لم يغيّر عقداً مع الخادم ولا مع المشغّل.
