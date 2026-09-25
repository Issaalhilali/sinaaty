#!/usr/bin/env node
/**
 * ترتيب مسرح العرض: يُبقي مشهداً حياً واحداً من كل نوع على حساب العميل التجريبي، ويُنهي الباقي
 * عبر نفس المسارات التي يسلكها مستخدم حقيقي — إلغاء قبل الاعتماد، وتسليم ثم إغلاق بعد الجاهزية.
 * لا حذف صفوف: الأوامر الموقّعة والفواتير والدفتر تبقى كما هي، وتنتقل إلى «السجل» بدل «الحالي».
 *
 *   node tools/demo-tidy.mjs [http://localhost:3000]
 *
 * سببه: تشغيلات demo-day القديمة كانت تزرع مشهداً جديداً في كل مرة، فامتلأت شاشة العميل بنسخ
 * متطابقة. صار demo-day آمن الإعادة، وهذه الأداة تنظّف ما خلّفته التشغيلات السابقة.
 */
import { setTimeout as delay } from 'node:timers/promises';
const BASE = (process.argv[2] ?? 'http://localhost:3000') + '/v1';
const CUSTOMER = '+966533000001';
// تشغيلات قديمة زرعت مشاهدها في ورش مختلفة (كان الاختيار «أول عضوية»)، فالورشة التي تُنهي الأمر
// تختلف من صف لآخر — نجمع رموز الورش المعروفة ونستعمل صاحب كل أمر.
const WORKSHOPS = ['+966500000001', '+966533000002', '+966533000003', '+966533000004'];

async function call(method, path, { token, body } = {}) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(BASE + path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (res.status === 429 && attempt <= 6) { await delay(12_000); continue; }
    if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(data).slice(0, 200)}`);
    return data;
  }
}
async function login(phone) {
  const r = await call('POST', '/auth/otp/request', { body: { phone } });
  return (await call('POST', '/auth/otp/verify', { body: { phone, code: r.debug_code } })).accessToken;
}
const newestFirst = (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
/** يُبقي الأحدث من كل مجموعة ويُعيد ما يجب إنهاؤه. */
const extras = (rows, keyOf) => {
  const seen = new Set();
  return [...rows].sort(newestFirst).filter((r) => { const k = keyOf(r); if (seen.has(k)) return true; seen.add(k); return false; });
};

(async () => {
  const cust = await login(CUSTOMER);
  const byOrg = new Map();
  for (const phone of WORKSHOPS) {
    const tok = await login(phone).catch(() => null);
    if (!tok) continue;
    for (const o of await call('GET', '/organizations/mine', { token: tok })) if (!byOrg.has(o.id)) byOrg.set(o.id, tok);
  }
  let ended = 0;

  // ---- أوامر العمل ----------------------------------------------------------
  const wos = await call('GET', '/work-orders', { token: cust });
  const live = wos.filter((w) => !['closed', 'cancelled'].includes(w.status));
  for (const w of extras(live, (w) => w.titleAr ?? w.id)) {
    if (w.status === 'awaiting_approval' || w.status === 'draft') {
      await call('POST', `/work-orders/${w.id}/cancel`, { token: cust, body: { reason_ar: 'نسخة مكررة من مشهد تجريبي' } });
      console.log(`  ✓ أُلغي ${w.number} (${w.titleAr}) — كان قبل الاعتماد`);
    } else if (['ready', 'delivered'].includes(w.status)) {
      const shop = byOrg.get(w.orgId);
      if (!shop) { console.log(`  · تُرك ${w.number} — لا رمز لورشته بين أرقام العرض`); continue; }
      if (w.status === 'ready') {
        // القاعدة تمنع التسليم بلا فحص تسليم — وهي محقّة: هذا ما يحمي الورشة والعميل بعد خروج السيارة.
        // نفعل ما تفعله الورشة: نسجّل فحص الخروج ثم نسلّم.
        await call('POST', `/work-orders/${w.id}/inspections`, { token: shop, body: { type: 'check_out' } }).catch(() => {});
        await call('POST', `/work-orders/${w.id}/transition`, { token: shop, body: { to: 'delivered' } });
      }
      await call('POST', `/work-orders/${w.id}/transition`, { token: cust, body: { to: 'closed' } });
      console.log(`  ✓ أُغلق ${w.number} (${w.titleAr}) — انتقل إلى السجل`);
    } else { console.log(`  · تُرك ${w.number} (${w.status}) — لا مسار إنهاء آمن من هذه الحالة`); continue; }
    ended++;
  }

  // ---- طلبات الإصلاح --------------------------------------------------------
  const srs = (await call('GET', '/service-requests?mine=true', { token: cust })).filter((r) => r.status === 'open');
  for (const r of extras(srs, (r) => r.titleAr)) {
    await call('POST', `/service-requests/${r.id}/cancel`, { token: cust, body: { reason_ar: 'نسخة مكررة من مشهد تجريبي' } });
    console.log(`  ✓ أُغلق طلب ${r.number}`); ended++;
  }

  // ---- مزادات القطع ---------------------------------------------------------
  const prs = (await call('GET', '/parts/requests?as=requester', { token: cust })).filter((r) => r.status === 'open');
  for (const r of extras(prs, (r) => r.partNameAr)) {
    await call('POST', `/parts/requests/${r.id}/cancel`, { token: cust });
    console.log(`  ✓ أُغلق مزاد ${r.number}`); ended++;
  }

  console.log(ended ? `\nانتهى الترتيب: ${ended} مشهداً مكرراً أُنهي بمساره الطبيعي.` : '\nلا نسخ مكررة — المسرح مرتّب.');
})().catch((e) => { console.error('✗ توقف الترتيب:', e.message); process.exit(1); });
