#!/usr/bin/env node
// إيقاف منشآت الاختبار المزروعة في قاعدة التطوير — عبر المسار الرسمي لا بحذف خام.
//
//   node tools/dev-tidy-fixtures.mjs           # عرض ما سيوقف (بلا تنفيذ)
//   node tools/dev-tidy-fixtures.mjs --apply   # التنفيذ
//
// لماذا: جولات الحمل والاختبارات زرعت عشرات «ورشة القريبة 6932614» وأخواتها. هذه ليست
// زينة زائدة — إنها تُفسد السوق نفسه: مصفوفة المطابقة تُشبع مقاعدها الأربعين بأشباحٍ على
// بعد كيلومترين، فلا يصل طلب العميل إلى الورشة الحقيقية على بعد ١٥ كم (شوهد حياً:
// SR-2026-000144 لم يصل «ورشة النور» لأن ٤٠ شبحاً التقطوه). والمطابقة تستثني الموقوفة،
// فإيقافها يعيد السوق للحقيقيين — ويبقى أثرها التاريخي (أوامر، دفاتر) سليماً.
//
// التعرّف بالاسم: الأسماء المزروعة تحمل ٦ أرقام متتالية أو أكثر («ورشة الاختبار 8623438»)،
// ولا اسم تجاري حقيقي كذلك. ومنشآت العرض الحيّ (النور، التشليح…) لا تطابق النمط أصلاً.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const BASE = process.env.API_URL ?? 'http://localhost:3000/v1';
const ADMIN = process.env.ADMIN_PHONE ?? '+966500000099';
const APPLY = process.argv.includes('--apply');

const env = readFileSync(new URL('../.env', import.meta.url), 'utf8');
const DB = (process.env.DATABASE_URL ?? env.match(/^DATABASE_URL="?([^"\n]+)/m)?.[1] ?? '').replace(/\?schema=.*$/, '');

const sql = (q) => execSync(`psql "${DB}" -tA -F'|' -c ${JSON.stringify(q)}`, { stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();

async function call(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(data).slice(0, 160)}`);
  return data;
}
async function login(phone) {
  const r = await call('POST', '/auth/otp/request', { body: { phone } });
  if (!r.debug_code) throw new Error('لا رمز تصحيح — الخادم ليس في وضع التطوير؟');
  return (await call('POST', '/auth/otp/verify', { body: { phone, code: r.debug_code } })).accessToken;
}

// المنشآت النشطة التي يحمل اسمها ٦ أرقام متتالية — نمط الزرع لا نمط التجارة.
const rows = sql(`SELECT id, trade_name_ar, type FROM organizations WHERE status = 'active' AND (trade_name_ar ~ '[0-9]{6,}' OR legal_name_ar ~ '[0-9]{6,}') ORDER BY trade_name_ar`).split('\n').filter(Boolean).map((l) => { const [id, name, type] = l.split('|'); return { id, name, type }; });

if (!rows.length) { console.log('لا زرعات نشطة — القاعدة نظيفة.'); process.exit(0); }
console.log(`${APPLY ? 'سيوقَف' : 'سيوقَف (عرض فقط — أضف --apply للتنفيذ)'}: ${rows.length} منشأة\n`);
for (const r of rows) console.log(`  ${r.type.padEnd(18)} ${r.name}`);
if (!APPLY) process.exit(0);

const token = await login(ADMIN);
let done = 0, failed = 0;
for (const r of rows) {
  try {
    await call('POST', `/admin/organizations/${r.id}/suspend`, { token, body: { reason: 'زرعة اختبار حمل/تجارب — تُوقف كي لا تسرق مقاعد المطابقة من الورش الحقيقية (dev-tidy-fixtures)' } });
    done++;
  } catch (e) { failed++; console.error(`  ✗ ${r.name}: ${e.message}`); }
}
console.log(`\n✓ أوقفت ${done}${failed ? ` — وفشل ${failed}` : ''}. المطابقة والبحث يستثنيان الموقوفة تلقائياً.`);
