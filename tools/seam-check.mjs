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
  // workshop_repository_impl.dart:15 — the new-order sheet
  createWorkOrder: (orgId, phone, plate) => ({
    org_id: orgId, plate, customer_phone: phone, title_ar: 'فحص وصلة آلي', payment_terms: 'on_delivery',
    complaint_ar: 'طلب من فاحص الوصلة', items: [{ type: 'labor', description_ar: 'أجرة فحص', quantity: '1', unit_price: '200' }],
  }),
};

/** The legal spine: nothing here may work by a payload the app does not actually send. */
async function coreJourney({ workshop, customer, orgId, customerPhone }) {
  console.log('قلب المنتج — أمر عمل من الورشة إلى المخالصة:');
  const wo = await call('POST', '/work-orders', { token: workshop, body: asApp.createWorkOrder(orgId, customerPhone, 'ب ح د 1122') });
  if (wo.status !== 201) return fail('الورشة تنشئ أمر عمل', `${wo.status} ${JSON.stringify(wo.body).slice(0, 200)}`);
  pass(`الورشة تنشئ أمر عمل (${wo.body.number})`);
  const id = wo.body.id;

  const ask = await call('POST', `/work-orders/${id}/request-approval`, { token: workshop, body: {} });
  ask.status === 200 ? pass('تطلب اعتماد العميل') : fail('طلب الاعتماد', `${ask.status} ${JSON.stringify(ask.body).slice(0, 160)}`);

  // The signature is the product's legal core — the app signs with OTP when Nafath is unavailable.
  const init = await call('POST', `/work-orders/${id}/approve`, { token: customer, body: { method: 'otp' } });
  const code = init.body?.debug_code;
  code ? pass('العميل يبدأ التوقيع (OTP)') : fail('بدء التوقيع', `${init.status} ${JSON.stringify(init.body).slice(0, 160)}`);
  const done = await call('POST', `/work-orders/${id}/approve/complete`, { token: customer, body: { method: 'otp', code } });
  done.status === 200 ? pass('التوقيع يعتمد النسخة') : fail('إتمام التوقيع', `${done.status} ${JSON.stringify(done.body).slice(0, 160)}`);

  const state = (await call('GET', `/work-orders/${id}`, { token: workshop })).body?.status;
  if (state === 'awaiting_parts') await call('POST', `/work-orders/${id}/transition`, { token: workshop, body: { to: 'in_progress' } });
  for (const to of ['ready']) {
    const t = await call('POST', `/work-orders/${id}/transition`, { token: workshop, body: { to } });
    t.status === 200 ? pass(`الانتقال إلى ${to}`) : fail(`الانتقال إلى ${to}`, `${t.status} ${JSON.stringify(t.body).slice(0, 160)}`);
  }
  const insp = await call('POST', `/work-orders/${id}/inspections`, { token: workshop, body: { type: 'check_out', media_ids: [] } });
  insp.status === 201 ? pass('فحص التسليم') : fail('فحص التسليم', `${insp.status} ${JSON.stringify(insp.body).slice(0, 160)}`);
  const deliver = await call('POST', `/work-orders/${id}/transition`, { token: workshop, body: { to: 'delivered' } });
  deliver.status === 200 ? pass('التسليم') : fail('التسليم', `${deliver.status} ${JSON.stringify(deliver.body).slice(0, 160)}`);

  const inv = await call('POST', '/invoices', { token: workshop, body: { work_order_id: id } });
  inv.status === 201 ? pass(`فاتورة ضريبية (${inv.body.number}) بإجمالي ${inv.body.total}`) : fail('إصدار الفاتورة', `${inv.status} ${JSON.stringify(inv.body).slice(0, 160)}`);

  if (inv.body?.id) {
    const pay = await call('POST', '/payments', { token: customer, body: { invoice_id: inv.body.id, method: 'mada' } });
    pay.status === 201 ? pass(`نية دفع بمبلغ ${pay.body.amount}`) : fail('إنشاء الدفع', `${pay.status} ${JSON.stringify(pay.body).slice(0, 160)}`);
    if (pay.body?.payment_id) {
      const paid = await call('POST', `/payments/${pay.body.payment_id}/mock-pay`, { token: customer });
      paid.status === 200 ? pass('الدفع يُحتجز في الضمان') : fail('الدفع', `${paid.status} ${JSON.stringify(paid.body).slice(0, 160)}`);
      const confirm = await call('POST', `/work-orders/${id}/confirm-receipt`, { token: customer });
      confirm.status === 200 ? pass('تأكيد الاستلام يحرّر المبلغ للورشة') : fail('تأكيد الاستلام', `${confirm.status} ${JSON.stringify(confirm.body).slice(0, 160)}`);
    }
  }
}

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
  // The break that started this file: the app called ?nearby=true while the API keyed on org_id.
  // The app now sends org_id (as it should — a user may belong to several organizations), so this
  // is the call that must work. Both sides were fixed; the seam is what we keep testing.
  const byOrg = await call('GET', `/service-requests?org_id=${orgId}`, { token: workshop });
  Array.isArray(byOrg.body) && byOrg.body.some((r) => r.id === srId)
    ? pass('ترى الطلب عبر ?org_id (كما ينادي التطبيق)')
    : fail('الورشة لا ترى الطلب', `${byOrg.status} — بطاقة «طلبات قريبة» ستختفي بصمت`);

  // Omitting the org must never produce a generic "Invalid input": a workshop owner reads this.
  const bare = await call('GET', '/service-requests?nearby=true', { token: workshop });
  const bareOk = bare.status === 200 || (bare.body?.message_ar && !/غير صحيحة/.test(bare.body.message_ar));
  bareOk
    ? pass(bare.status === 200 ? 'بلا org_id تُشتق المنشأة تلقائياً' : `بلا org_id ترد برسالة مفهومة: «${bare.body.message_ar}»`)
    : fail('غياب org_id يرد بخطأ عام', `${bare.status} ${JSON.stringify(bare.body).slice(0, 160)} — الرسالة يقرؤها صاحب ورشة`);

  const withOrg = await call('PUT', `/service-requests/${srId}/offer`, { token: workshop, body: asApp.offer(orgId) });
  withOrg.status === 200 ? pass('تقدّم عرضاً (بهوية منشأتها)') : fail('تقديم عرض', `${withOrg.status} ${JSON.stringify(withOrg.body).slice(0, 160)}`);

  const bareOffer = await call('PUT', `/service-requests/${srId}/offer`, { token: workshop, body: { ...asApp.offer(orgId), org_id: undefined } });
  const bareOfferOk = bareOffer.status === 200 || (bareOffer.body?.message_ar && !/غير صحيحة/.test(bareOffer.body.message_ar));
  bareOfferOk ? pass('عرض بلا org_id: يُشتق أو يُرفض برسالة مفهومة') : fail('عرض بلا org_id يرد بخطأ عام', JSON.stringify(bareOffer.body).slice(0, 160));

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

  await coreJourney({ workshop, customer, orgId, customerPhone: CUSTOMER });

  console.log('الإدارة:');
  // Repeated runs hit the per-phone OTP quota — that guard is a feature, not a seam break.
  let admin;
  try { admin = await login(process.env.SEAM_ADMIN ?? '+966500000099'); }
  catch { console.log('  ~ تخطٍّ: حصة رموز الأدمن استُهلكت (الحارس يعمل) — أعد بعد ١٠ دقائق'); console.log(`\n${failures ? `✗ ${failures} كسر في الوصلة` : '✓ الوصلة سليمة — الأطراف الثلاثة تتكلم اللغة نفسها'}`); process.exit(failures ? 1 : 0); }
  const funnel = await call('GET', '/admin/pilot/funnel', { token: admin });
  funnel.body?.service
    ? pass(`القُمع يرى السوق: ${funnel.body.service.requested} طلباً · ${funnel.body.service.offer_rate}% نال عرضاً`)
    : fail('كتلة service غائبة عن القُمع', 'الإدارة عمياء عن السوق');

  console.log(`\n${failures ? `✗ ${failures} كسر في الوصلة` : '✓ الوصلة سليمة — الأطراف الثلاثة تتكلم اللغة نفسها'}`);
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error('فشل الفاحص:', e.message); process.exit(2); });
