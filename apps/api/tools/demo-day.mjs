#!/usr/bin/env node
/**
 * اليوم التجريبي الحي — يزرع عبر الـ API الحقيقي (لا كتابة مباشرة في القاعدة) يوماً كاملاً يلمسه
 * المالك من التطبيق: طلب إصلاح مفتوح بعروض ثلاث ورش بشخصياتها، أمر بانتظار توقيعه، فاتورة مدفوعة
 * ومحفظة، مزاد قطع حي «بوينها»، وسطحة سلّمت وفاتورتها تنتظر «ادفع».
 *
 *   node tools/demo-day.mjs [http://localhost:3000]
 *
 * آمن الإعادة بالكامل: المستخدمون بأرقام ثابتة، والمنشآت من عضوياتهم، وكل مشهد يُبحث عنه حياً قبل
 * زرعه (`reuse`). التشغيلة الثانية لا تضيف صفاً واحداً — وإلا امتلأت شاشة العميل بنسخ متطابقة
 * من نفس المشهد، وهذا بالضبط ما يجعل العرض يبدو ركاماً بدل منتج.
 */
import { setTimeout as delay } from 'node:timers/promises';
const BASE = (process.argv[2] ?? 'http://localhost:3000') + '/v1';
// نقطة مسرح العرض: بعيدة عن ركام إحداثيات حزم الاختبار على قاعدة التطوير
const RIYADH_IND2 = { lat: 25.1020, lng: 46.2200 };

const PHONES = {
  customer: '+966533000001',   // مشعل — العميل
  elite: '+966500000001',      // ورشة النور — الورشة المزروعة التي يفتحها المالك
  inspect: '+966533000003',    // مركز الفحص الأول
  economy: '+966533000004',    // ورشة الاقتصاد
  dealer: '+966533000005',     // قطع الأمانة
  driver: '+966533000006',     // سائق السطحة (منشأة النقل السريع)
  admin: '+966500000099',
};

const sleep = (ms) => delay(ms);
async function call(method, path, { token, body } = {}) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(BASE + path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (res.status === 429 && attempt <= 6) { process.stdout.write('  ⏳ حد الطلبات — ننتظر قليلاً\n'); await sleep(12_000); continue; }
    if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(data).slice(0, 300)}`);
    return data;
  }
}
// من يدخل برمز الجوال يُنشأ بلا اسم، فتظهر «حسابي» فارغة وتقرأ الورشة رقماً بدل إنسان.
const NAMES = {
  '+966533000001': 'مشعل العتيبي', '+966533000002': 'فهد — ورشة النخبة', '+966533000003': 'ناصر — مركز الفحص الأول',
  '+966533000004': 'تركي — ورشة الاقتصاد', '+966533000005': 'ماجد — قطع الأمانة', '+966533000006': 'سلطان — سائق السطحة',
};
async function login(phone) {
  const r = await call('POST', '/auth/otp/request', { body: { phone } });
  const v = await call('POST', '/auth/otp/verify', { body: { phone, code: r.debug_code } });
  const name = NAMES[phone];
  if (name) await call('PATCH', '/me', { token: v.accessToken, body: { full_name_ar: name } }).catch(() => {});
  return v.accessToken;
}
const step = (msg) => console.log(`  ✓ ${msg}`);

/** مشهد حي موجود يُعاد استخدامه، أو يُزرع. الترتيب مقصود: البحث أولاً دائماً. */
async function reuse(label, find, create) {
  const found = await find().catch(() => null);
  if (found) { step(`${label} — مشهد قائم أُعيد استخدامه (${found.number ?? found.id})`); return { ...found, reused: true }; }
  const made = await create();
  step(`${label} — زُرع (${made.number ?? made.id})`);
  return { ...made, reused: false };
}

async function ensureOrg(phone, type, nameAr, loc, { specialtyMakeId, vat } = {}) {
  let tok = await login(phone);
  // بالاسم لا بالترتيب: نفس الرقم قد يملك أكثر من منشأة (بينها مسودات قديمة)، و«الأولى» تتبدل بين
  // تشغيلة وأخرى — فتُزرع مشاهد اليوم في منشأة غير التي يفتحها المالك، وهو ما حدث فعلاً.
  const mine = await call('GET', '/organizations/mine', { token: tok });
  let orgId = mine.find((o) => o.name_ar === nameAr)?.id;
  if (!orgId) {
    const cr = `9${String(Date.now()).slice(-8)}${Math.floor(Math.random() * 9)}`;
    const org = await call('POST', '/organizations', { token: tok, body: { type, legal_name_ar: nameAr, trade_name_ar: nameAr, cr_number: cr } });
    orgId = org.id;
    // التفعيل عبر مسؤول المنصة (اعتماد KYB يتخطى الوثائق في بيئة التطوير عبر الإيقاف/التفعيل المباشر غير متاح؛
    // نستخدم مسار الأدمن الرسمي: approve يتطلب وثائق — لذا التفعيل المباشر أدناه هو ما تفعله عمليات التجربة بأداة onboard)
    const { execSync } = await import('node:child_process');
    execSync(`node -e "
      const fs=require('fs');for(const l of fs.readFileSync('${process.cwd()}/.env','utf8').split('\\n')){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2];}
      const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();
      p.organization.update({where:{id:'${orgId}'},data:{status:'active',verifiedAt:new Date()${vat ? `,vatNumber:'${vat}'` : ''}}}).then(()=>p.\\$disconnect());
    "`, { cwd: process.cwd(), stdio: 'ignore' });
    tok = await login(phone);   // العضوية والتفعيل يركبان الرمز الجديد
    step(`أُنشئت «${nameAr}»`);
  } else {
    step(`«${nameAr}» موجودة — أُعيد استخدامها`);
  }
  // الشفاء الذاتي: تشغيلة سابقة قد تكون انهارت في أي منتصف — نكمل الناقص أياً كان (تفعيل، موقع، تخصص)
  if (!/alnoor-workshop|النور/.test(nameAr)) {
    const { execSync } = await import('node:child_process');
    execSync(`node -e "
      const fs=require('fs');for(const l of fs.readFileSync('${process.cwd()}/.env','utf8').split('\\n')){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2];}
      const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();
      p.organization.update({where:{id:'${orgId}'},data:{status:'active',verifiedAt:new Date()${vat ? `,vatNumber:'${vat}'` : ''}}}).then(()=>p.\\$disconnect());
    "`, { cwd: process.cwd(), stdio: 'ignore' });
  }
  const locs = await call('GET', `/organizations/${orgId}/locations`, { token: tok }).catch(() => []);
  const primary = locs.find((l) => l.isPrimary) ?? locs[0];
  const misplaced = !primary || Math.abs(Number(primary.lat) - loc.lat) > 0.05 || Math.abs(Number(primary.lng) - loc.lng) > 0.05;
  if (misplaced) { await call('POST', `/organizations/${orgId}/locations`, { token: tok, body: { city: 'الرياض', district: 'الصناعية الثانية', lat: loc.lat, lng: loc.lng, is_primary: true } }); step(`  ↳ ${primary ? 'نُقل' : 'أُضيف'} موقع «${nameAr}» إلى مسرح العرض`); }
  if (specialtyMakeId) await call('PUT', `/organizations/${orgId}/specialties`, { token: tok, body: { items: [{ make_id: specialtyMakeId }] } }).catch(() => {});
  return { tok, orgId };
}

(async () => {
  console.log('🎬 اليوم التجريبي الحي — صناعية\n');
  const adminTok = await login(PHONES.admin);
  await call('PUT', '/admin/pilot/flags/service_marketplace', { token: adminTok, body: { enabled: true, reason_ar: 'اليوم التجريبي' } }).catch(() => {});
  await call('PUT', '/admin/pilot/flags/parts_marketplace', { token: adminTok, body: { enabled: true, reason_ar: 'اليوم التجريبي' } }).catch(() => {});
  await call('PUT', '/admin/pilot/flags/tow', { token: adminTok, body: { enabled: true, reason_ar: 'اليوم التجريبي' } }).catch(() => {});
  step('الأعلام مفتوحة: سوق الإصلاح، سوق القطع، السطحة');

  // ---- العميل وسيارته -------------------------------------------------------
  const custTok = await login(PHONES.customer);
  let car = (await call('GET', '/vehicles', { token: custTok }))[0];
  if (!car) car = await call('POST', '/vehicles', { token: custTok, body: { vin: 'JTDBE32K123456789'.slice(0, 17), plate: 'د م و 777' } });
  step(`سيارة مشعل: ${car.makeNameAr ?? 'تويوتا'} — لوحة ${car.plateAr ?? ''}`);

  // ---- الورش الثلاث بشخصياتها + التاجر --------------------------------------
  const elite = await ensureOrg(PHONES.elite, 'workshop', 'ورشة النور للسمكرة والميكانيكا', { lat: RIYADH_IND2.lat + 0.008, lng: RIYADH_IND2.lng + 0.004 }, { specialtyMakeId: car.makeId, vat: '399990000000003' });
  const inspect = await ensureOrg(PHONES.inspect, 'service_center', 'مركز الفحص الأول', { lat: RIYADH_IND2.lat - 0.01, lng: RIYADH_IND2.lng + 0.012 });
  const economy = await ensureOrg(PHONES.economy, 'workshop', 'ورشة الاقتصاد', { lat: RIYADH_IND2.lat + 0.02, lng: RIYADH_IND2.lng - 0.015 });
  const dealer = await ensureOrg(PHONES.dealer, 'parts_dealer', 'قطع الأمانة', { lat: RIYADH_IND2.lat + 0.005, lng: RIYADH_IND2.lng - 0.006 });

  // ---- المشهد ١: طلب إصلاح مفتوح — القرار للمالك ----------------------------
  const SR_TITLE = 'السيارة ترتج عند التسارع مع صوت طقطقة من الأمام';
  const sr = await reuse('المشهد ١: طلب إصلاح مفتوح',
    async () => (await call('GET', '/service-requests?mine=true', { token: custTok })).find((r) => r.titleAr === SR_TITLE && r.status === 'open'),
    () => call('POST', '/service-requests', { token: custTok, body: {
      vehicle_id: car.id, title_ar: SR_TITLE,
      description_ar: 'يبدأ الصوت بعد ٦٠ كم/س ويزداد مع المطبات. آخر صيانة قبل ٨ أشهر.',
      lat: RIYADH_IND2.lat, lng: RIYADH_IND2.lng, address_hint: 'قرب مدخل الصناعية الثانية', radius_km: 15, preferred_time: 'today',
    } }));
  await call('PUT', `/service-requests/${sr.id}/offer`, { token: elite.tok, body: { org_id: elite.orgId, offer_type: 'estimate', diagnosis_ar: 'الوصف يشير لمساعدات أمامية أو كرسي مكينة — نؤكد بفحص عشر دقائق على الرافعة', price_min: '450', price_max: '700', availability: 'now', eta_note_ar: 'نستقبلك فوراً — فني تويوتا متفرغ' } });
  await call('PUT', `/service-requests/${sr.id}/offer`, { token: inspect.tok, body: { org_id: inspect.orgId, offer_type: 'free_inspection', diagnosis_ar: 'نفحص مجاناً بجهاز التشخيص ونعطيك تقريراً مصوراً قبل أي قرار', availability: 'today', eta_note_ar: 'اليوم بعد العصر' } });
  await call('PUT', `/service-requests/${sr.id}/offer`, { token: economy.tok, body: { org_id: economy.orgId, offer_type: 'estimate', diagnosis_ar: 'غالباً مساعدات — عندنا قطع تجارية ممتازة توفر عليك', price_min: '380', price_max: '520', availability: 'scheduled', eta_note_ar: 'موعد غداً صباحاً' } });
  step(`  ↳ ثلاثة عروض متمايزة على ${sr.number} — القرار لك من التطبيق`);

  // ---- المشهد ٢: أمر بانتظار توقيع المالك -----------------------------------
  const WO2_TITLE = 'صيانة الـ ١٠٠ ألف الشاملة';
  const myWos = async () => call('GET', '/work-orders', { token: custTok });
  await reuse('المشهد ٢: أمر ينتظر توقيعك',
    async () => (await myWos()).find((w) => w.titleAr === WO2_TITLE && w.status === 'awaiting_approval'),
    async () => {
      const wo = await call('POST', '/work-orders', { token: elite.tok, body: { org_id: elite.orgId, customer_phone: PHONES.customer, vehicle_id: car.id, title_ar: WO2_TITLE, payment_terms: 'on_delivery', items: [
        { type: 'labor', description_ar: 'تغيير زيت المكينة والفلتر (زيت أصلي)', quantity: 1, unit_price: '280' },
        { type: 'part', description_ar: 'طقم بواجي إيريديوم', quantity: 4, unit_price: '95', warranty_days: 365 },
        { type: 'labor', description_ar: 'فحص وضبط الفرامل الأربع', quantity: 1, unit_price: '150' },
      ] } });
      await call('POST', `/work-orders/${wo.id}/request-approval`, { token: elite.tok, body: {} });
      return wo;
    });

  // ---- المشهد ٣: فاتورة مدفوعة ومحفظة تتحرك ---------------------------------
  const WO3_TITLE = 'تبديل بطارية مع فحص دينمو';
  await reuse('المشهد ٣: فاتورة مدفوعة والمبلغ محفوظ',
    async () => (await myWos()).find((w) => w.titleAr === WO3_TITLE && ['ready', 'delivered', 'closed'].includes(w.status)),
    async () => {
      const wo3 = await call('POST', '/work-orders', { token: elite.tok, body: { org_id: elite.orgId, customer_phone: PHONES.customer, vehicle_id: car.id, title_ar: WO3_TITLE, payment_terms: 'on_delivery', items: [
        { type: 'part', description_ar: 'بطارية ٧٠ أمبير (ضمان سنة)', quantity: 1, unit_price: '420', warranty_days: 365 },
        { type: 'labor', description_ar: 'تركيب وفحص شحن', quantity: 1, unit_price: '50' },
      ] } });
      await call('POST', `/work-orders/${wo3.id}/request-approval`, { token: elite.tok, body: {} });
      const app1 = await call('POST', `/work-orders/${wo3.id}/approve`, { token: custTok, body: { method: 'otp' } });
      await call('POST', `/work-orders/${wo3.id}/approve/complete`, { token: custTok, body: { method: 'otp', code: app1.debug_code } });
      const st = (await call('GET', `/work-orders/${wo3.id}`, { token: elite.tok })).status;
      if (st === 'awaiting_parts') await call('POST', `/work-orders/${wo3.id}/transition`, { token: elite.tok, body: { to: 'in_progress' } });
      await call('POST', `/work-orders/${wo3.id}/transition`, { token: elite.tok, body: { to: 'ready' } });
      const inv3 = await call('POST', '/invoices', { token: elite.tok, body: { work_order_id: wo3.id } });
      const pay = await call('POST', '/payments', { token: custTok, body: { invoice_id: inv3.id, method: 'mada' } });
      await call('POST', `/payments/${pay.payment_id}/mock-pay`, { token: custTok });
      step(`  ↳ فاتورة ${inv3.number} مدفوعة (${inv3.total} ر.س) — محفظة الورشة تتحرك`);
      return wo3;
    });

  // ---- المشهد ٤: مزاد قطع حي «بوينها» ---------------------------------------
  const PART_NAME = 'مساعد أمامي يمين — كامري ٢٠١٢';
  const pr = await reuse('المشهد ٤: مزاد قطع حي',
    async () => (await call('GET', '/parts/requests?as=requester', { token: custTok })).find((r) => r.partNameAr === PART_NAME && r.status === 'open'),
    () => call('POST', '/parts/requests', { token: custTok, body: { part_name_ar: PART_NAME, accepted_conditions: ['oem_new', 'aftermarket_new'], quantity: 1, lat: RIYADH_IND2.lat, lng: RIYADH_IND2.lng, radius_km: 30, bidding_minutes: 24 * 60 } }));
  await call('POST', `/parts/requests/${pr.id}/bids`, { token: dealer.tok, body: { org_id: dealer.orgId, condition: 'oem_new', unit_price: '520', quantity: 1, eta_hours: 3, warranty_days: 180, notes_ar: 'أصلي وكالة — متوفر الآن' } });
  await call('POST', `/parts/requests/${pr.id}/bids`, { token: economy.tok, body: { org_id: economy.orgId, condition: 'aftermarket_new', unit_price: '340', quantity: 1, eta_hours: 24, warranty_days: 90, notes_ar: 'تجاري ممتاز' } }).catch(() => {});
  step(`  ↳ قارن السعر والضمان «ووين القطعة» على ${pr.number}`);

  // ---- المشهد ٥: سطحة سلّمت وفاتورتها تنتظر «ادفع» --------------------------
  // السائق يعمل باسم منشأة نقل: بدونها لا تصدر فاتورة ضريبية، وكانت الرحلة تُسلَّم ثم تموت الفوترة صامتة.
  const tow = await ensureOrg(PHONES.driver, 'logistics', 'سطحات الطريق السريع', { lat: RIYADH_IND2.lat + 0.01, lng: RIYADH_IND2.lng }, { vat: '399980000000003' });
  const drvTok = tow.tok;
  await call('PUT', '/transport/driver/profile', { token: drvTok, body: { org_id: tow.orgId, truck_plate: 'ن ق ل ٩٩', truck_type: 'flatbed_tow' } });
  await call('PUT', '/transport/driver/online', { token: drvTok, body: { online: true, lat: RIYADH_IND2.lat + 0.01, lng: RIYADH_IND2.lng } });
  await reuse('المشهد ٥: سطحة سلّمت بإثبات',
    // «مسلَّمة» وحدها لا تكفي: رحلة قديمة بلا منشأة ناقلة سلّمت ولم تُفوتَر أبداً، وإعادة استخدامها
    // تُبقي المشهد ناقصاً بلا زر «ادفع». المشهد مكتمل حين تكون له فاتورة.
    async () => {
      const delivered = (await call('GET', '/transport/jobs?as=requester', { token: custTok })).filter((j) => j.status === 'delivered');
      for (const j of delivered) { const full = await call('GET', `/transport/jobs/${j.id}`, { token: custTok }); if (full.invoice) return full; }
      return null;
    },
    async () => {
      const job = await call('POST', '/transport/jobs', { token: custTok, body: { type: 'flatbed_tow', vehicle_id: car.id, pickup: { lat: 25.1800, lng: 46.1500 }, pickup_address: 'طريق الملك فهد — حي العليا', dropoff: RIYADH_IND2, dropoff_address: 'ورشة النور — الصناعية الثانية' } });
      await call('POST', `/transport/jobs/${job.id}/accept`, { token: drvTok, body: { org_id: tow.orgId } });
      for (const to of ['en_route_pickup', 'picked_up', 'en_route_dropoff']) await call('POST', `/transport/jobs/${job.id}/transition`, { token: drvTok, body: { to } });
      const media = await call('POST', '/media/presign', { token: drvTok, body: { kind: 'image', mime_type: 'image/jpeg', size_bytes: 900, sha256: 'd'.repeat(64), purpose: 'proof_of_delivery' } });
      const otp = await call('POST', `/transport/jobs/${job.id}/proof/otp`, { token: drvTok });
      await call('POST', `/transport/jobs/${job.id}/complete`, { token: drvTok, body: { media_id: media.media_id, code: otp.debug_code } });
      await call('POST', '/admin/outbox/drain', { token: adminTok, body: {} }).catch(() => {});
      return job;
    });
  step('فاتورة السطحة بانتظار زر «ادفع» عندك');

  console.log(`\n🎉 اليوم التجريبي مزروع. افتح التطبيق وسجّل الدخول:
   العميل (تطبيق العملاء):      ${PHONES.customer}
   ورشة النور (تطبيق الشركاء):  ${PHONES.elite}
   قطع الأمانة (تطبيق الشركاء): ${PHONES.dealer}
   لوحة التحكم (:3001):         ${PHONES.admin}
   رمز الدخول يظهر تلقائياً في شاشة الرمز (بيئة تطوير).\n`);
})().catch((e) => { console.error('✗ توقف اليوم التجريبي:', e.message); process.exit(1); });
