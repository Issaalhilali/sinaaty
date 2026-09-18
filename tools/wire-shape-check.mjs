#!/usr/bin/env node
/**
 * حارس عقد السلك: يقارن **ما يرسله الخادم فعلاً** بما تقرؤه محلّلات التطبيق.
 *
 * سببه عطلٌ وقع فعلاً (2026-09-18): الخادم يرسل `titleAr` والتطبيق يقرأ `title_ar`، فظهرت كل
 * طلبات الإصلاح **بلا عنوان** على الجهاز، ونطاقها الحقيقي يُستبدل بافتراضي. حقولٌ موجودةٌ تماماً
 * تضيع في الترجمة — ولم يمسكها أي اختبار لأن اختبارات الجوال تزيّف المستودعات فتقفز فوق هذه
 * الطبقة بالذات.
 *
 * القاعدة التي كشفها الفحص: **الكيانات camelCase، واللقطة الموقّعة والعروض المركّبة snake_case
 * عمداً** (اللقطة وثيقةٌ قانونية ثابتة الشكل). فالحارس لا يمنع snake، بل يمنع أن يقرأ مُحلِّلٌ
 * صيغةً والخادمُ يرسل الأخرى.
 *
 *   node tools/wire-shape-check.mjs      # يحتاج خادم تطوير يعمل + بيانات البذور
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const API = process.env.API_URL ?? 'http://127.0.0.1:3000/v1';
const MOBILE = resolve(dirname(fileURLToPath(import.meta.url)), '../apps/mobile/lib/features');

const j = async (r) => { try { return await r.json(); } catch { return null; } };
const login = async (phone) => {
  const q = await j(await fetch(`${API}/auth/otp/request`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone }) }));
  const v = await j(await fetch(`${API}/auth/otp/verify`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone, code: q.debug_code }) }));
  return v.accessToken;
};
const keysOf = (o) => { const one = Array.isArray(o) ? o[0] : o; return one && typeof one === 'object' ? Object.keys(one) : []; };
const camel = (s) => s.replace(/_([a-z])/g, (_, x) => x.toUpperCase());
const snake = (s) => s.replace(/[A-Z]/g, (x) => `_${x.toLowerCase()}`);
const twin = (k) => (k.includes('_') ? camel(k) : snake(k));

/** المفاتيح التي يقرؤها ملفٌ من ملفات data/ — نصّاً لا تخميناً، بلا ما له بديلٌ في سطره. */
function readsOf(file) {
  const src = readFileSync(join(MOBILE, file), 'utf8');
  const out = new Set();
  for (const line of src.split('\n')) {
    const inLine = [...line.matchAll(/\[\s*'([a-zA-Z_][a-zA-Z0-9_]*)'\s*\]/g)].map((m) => m[1]);
    // `j['title_ar'] ?? j['titleAr']` يقرأ اللغتين — ليس عطلاً بل الإصلاح نفسه.
    for (const k of inLine) if (!inLine.includes(twin(k))) out.add(k);
  }
  return out;
}

/**
 * `ignore`: مفاتيح تُقرأ في هذا الملف من **نقطةٍ أخرى** تُرسل snake عمداً — تحقّقتُ منها بنفسي
 * على الخادم الحيّ. كل سطرٍ هنا يحمل سببه؛ ومن يضيف سطراً بلا تحقّقٍ يُعطّل الحارس لا يُرضيه.
 */
const CASES = [
  { file: 'service_market/data/service_market_repository_impl.dart', as: 'customer', url: '/service-requests' },
  { file: 'billing/data/billing_repository_impl.dart', as: 'customer', url: '/invoices' },
  { file: 'vehicles/data/vehicles_repository_impl.dart', as: 'customer', url: '/vehicles' },
  { file: 'work_orders/data/work_orders_repository_impl.dart', as: 'customer', url: '/work-orders',
    ignore: { payment_terms: 'من اللقطة الموقّعة /versions/:v — snake عمداً', deposit_required: 'من اللقطة الموقّعة' } },
  { file: 'parts/data/parts_repository_impl.dart', as: 'customer', url: '/parts/requests',
    ignore: { part_number: 'من عروض /parts/fit و/parts/verify — snake عمداً' } },
  { file: 'transport/data/transport_repository_impl.dart', as: 'customer', url: '/transport/jobs',
    ignore: { distance_km: 'من /transport/quote — snake عمداً (تحقّقتُ: distance_km,eta_minutes,…)' } },
];

const tokens = { customer: await login('+966533000001') };
let bad = 0;

for (const c of CASES) {
  const body = await j(await fetch(API + c.url, { headers: { authorization: `Bearer ${tokens[c.as]}` } }));
  const wire = new Set(keysOf(body));
  if (!wire.size) { console.log(`— ${c.url}: لا عيّنة (لا بيانات) — تخطّي`); continue; }
  const missed = [...readsOf(c.file)]
    .filter((k) => !wire.has(k) && wire.has(twin(k)))
    .filter((k) => !(c.ignore ?? {})[k]);
  if (missed.length) {
    bad++;
    console.log(`✗ ${c.file}`);
    for (const k of missed) console.log(`    يقرأ '${k}' والخادم يرسل '${twin(k)}'`);
  } else console.log(`✓ ${c.file}`);
}
if (bad) console.log('\nحقلٌ يضيع صامتاً: الشاشة تعرض فراغاً أو افتراضياً بدل الحقيقة.');
process.exit(bad ? 1 : 0);
