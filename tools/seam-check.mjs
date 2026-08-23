#!/usr/bin/env node
/**
 * فاحص الوصلة — يقود المنتج كما يستعمله الناس الثلاثة، لا كما تفترضه الاختبارات.
 *
 * لماذا يوجد: في يوم واحد كسرت ثلاثة أعطال صامتة الميزة الرئيسية (vehicle_id إلزامي والتطبيق يظنه
 * اختيارياً؛ nearby=true تعيد قائمة فارغة والـAPI يفهرس على org_id؛ offer يشترط org_id والتطبيق
 * لا يرسله). كل طرف كان أخضر: اختبارات الموبايل تستعمل مستودعاً وهمياً لا يلمس HTTP، واختبارات
 * الـAPI تنادي بحمولاتها الصحيحة — ولا أحد يختبر **الوصلة** بينهما. هذا الملف يختبرها:
 * ينادي نقاط النهاية الحقيقية **بنفس المسارات وأشكال الحمولات التي يرسلها التطبيق فعلاً**،
 * ويسقط عند أول 4xx أو نتيجة فارغة حيث يجب ألا تكون.
 *
 *   node tools/seam-check.mjs                 # ضد http://127.0.0.1:3000
 *   API=https://staging/... node tools/seam-check.mjs
 *
 * يتطلب: بيئة تطوير ببذرة (mock SMS يعيد الرمز)، وحساب ورشة مزروع.
 */

const API = process.env.API ?? 'http://127.0.0.1:3000';
const CUSTOMER = process.env.SEAM_CUSTOMER ?? '+966555000001';
const WORKSHOP = process.env.SEAM_WORKSHOP ?? '+966500000001';

let failures = 0;
const pass = (m) => console.log(`  ✓ ${m}`);
const fail = (m, detail) => { failures++; console.log(`  ✗ ${m}\n      ${detail}`); };

async function call(method, path, { token, body } = {}) {
  const res = await fetch(`${API}/v1${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json; try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: res.status, body: json };
}

async function login(phone) {
  const req = await call('POST', '/auth/otp/request', { body: { phone } });
  const code = req.body?.debug_code;
  if (!code) throw new Error(`no debug_code for ${phone} — is INTEGRATION_SMS=mock?`);
  const v = await call('POST', '/auth/otp/verify', { body: { phone, code } });
  if (!v.body?.accessToken) throw new Error(`login failed for ${phone}: ${JSON.stringify(v.body)}`);
  return v.body.accessToken;
}

/** Exactly the shape the mobile repository sends — copy changes here only when the app changes. */
const asApp = {
  createServiceRequest: (vehicleId) => ({
    vehicle_id: vehicleId, title_ar: 'فحص وصلة آلي', description_ar: 'طلب من فاحص الوصلة — يُلغى فوراً',
    lat: 24.632, lng: 46.792, radius_km: 15, preferred_time: 'today',
  }),
  offer: (orgId) => ({
    org_id: orgId, offer_type: 'estimate', diagnosis_ar: 'فحص وصلة آلي', price_min: '100', price_max: '200', availability: 'today',
  }),
};

async function main() {
  console.log(`فاحص الوصلة → ${API}\n`);
  const customer = await login(CUSTOMER);
  const workshop = await login(WORKSHOP);
  const me = await call('GET', '/me', { token: workshop });
  const orgId = me.body?.orgs?.[0]?.org_id;
  if (!orgId) throw new Error('the workshop account has no organization — seed first');

  console.log('العميل:');
  const vehicles = await call('GET', '/vehicles', { token: customer });
  const vehicleId = Array.isArray(vehicles.body) ? vehicles.body[0]?.id : undefined;
  if (!vehicleId) { fail('عميل الفحص بلا سيارة', 'أضف سيارة للحساب التجريبي أولاً'); process.exit(1); }

  const created = await call('POST', '/service-requests', { token: customer, body: asApp.createServiceRequest(vehicleId) });
  created.status === 201
    ? pass(`يرسل طلب إصلاح (${created.body.number}) — وصل ${created.body.recipients_notified} ورشة`)
    : fail('إرسال طلب إصلاح', `${created.status} ${JSON.stringify(created.body)}`);
  const srId = created.body?.id;

  console.log('الورشة:');
  // The break that started this file: the app calls ?nearby=true; the API indexed on org_id.
  const nearby = await call('GET', '/service-requests?nearby=true', { token: workshop });
  Array.isArray(nearby.body) && nearby.body.some((r) => r.id === srId)
    ? pass('ترى الطلب عبر ?nearby=true (كما ينادي التطبيق)')
    : fail('الورشة لا ترى الطلب عبر ?nearby=true', `أعادت ${nearby.status} بـ${Array.isArray(nearby.body) ? nearby.body.length : '؟'} عنصراً — بطاقة «طلبات قريبة» ستختفي بصمت`);

  const byOrg = await call('GET', `/service-requests?org_id=${orgId}`, { token: workshop });
  Array.isArray(byOrg.body) && byOrg.body.some((r) => r.id === srId)
    ? pass('ترى الطلب عبر ?org_id (المسار الصريح)')
    : fail('الورشة لا ترى الطلب عبر ?org_id', `${byOrg.status} ${JSON.stringify(byOrg.body).slice(0, 160)}`);

  // The app omits org_id today; a fix on either side must keep BOTH shapes working.
  const bare = await call('PUT', `/service-requests/${srId}/offer`, { token: workshop, body: { ...asApp.offer(orgId), org_id: undefined } });
  bare.status === 200
    ? pass('تقدّم عرضاً بلا org_id (يُشتق من العضوية)')
    : fail('تقديم عرض بلا org_id', `${bare.status} ${JSON.stringify(bare.body).slice(0, 160)} — التطبيق لا يرسل org_id`);

  const withOrg = await call('PUT', `/service-requests/${srId}/offer`, { token: workshop, body: asApp.offer(orgId) });
  withOrg.status === 200 ? pass('تقدّم عرضاً مع org_id') : fail('تقديم عرض مع org_id', `${withOrg.status} ${JSON.stringify(withOrg.body).slice(0, 160)}`);

  console.log('العميل يقارن ويقبل:');
  const detail = await call('GET', `/service-requests/${srId}`, { token: customer });
  const offers = detail.body?.offers ?? [];
  offers.length ? pass(`يرى ${offers.length} عرضاً`) : fail('العميل لا يرى أي عرض', JSON.stringify(detail.body).slice(0, 160));
  offers[0]?.where_text ? pass(`المكان يصل نصاً جاهزاً: «${offers[0].where_text}»`) : fail('where_text غائب', 'الشاشة تعرضه كما يصل — غيابه يفرغ سطر المكان');
  offers[0]?.badges?.length ? pass(`الحُجج تصل جاهزة: ${offers[0].badges.join('، ')}`) : fail('badges غائبة', 'المقارنة تفقد سبب فوز كل عرض');

  if (offers[0]) {
    const accepted = await call('POST', `/service-requests/${srId}/accept`, { token: customer, body: { offer_id: offers[0].id } });
    accepted.status === 200 && accepted.body?.work_order_id
      ? pass(`القبول ينشئ أمر عمل (${accepted.body.work_order?.number ?? accepted.body.work_order_id})`)
      : fail('القبول لا ينشئ أمر عمل', `${accepted.status} ${JSON.stringify(accepted.body).slice(0, 160)}`);
  }

  console.log('الإدارة:');
  const admin = await login(process.env.SEAM_ADMIN ?? '+966500000099');
  const funnel = await call('GET', '/admin/pilot/funnel', { token: admin });
  funnel.body?.service
    ? pass(`القُمع يرى السوق: ${funnel.body.service.requested} طلباً · ${funnel.body.service.offer_rate}% نال عرضاً`)
    : fail('كتلة service غائبة عن القُمع', 'الإدارة عمياء عن السوق');

  console.log(`\n${failures ? `✗ ${failures} كسر في الوصلة` : '✓ الوصلة سليمة — الأطراف الثلاثة تتكلم اللغة نفسها'}`);
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error('فشل الفاحص:', e.message); process.exit(2); });
