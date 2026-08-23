/* eslint-disable no-console */
// Dev seed — idempotent (safe to re-run). Run: pnpm --filter api seed
// Seeds: vehicle makes/models, service & part categories, part brands, subscription plans,
// platform_settings, and one demo workshop / scrapyard / parts distributor / customer.
import { PrismaClient, Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';

const prisma = new PrismaClient();
const D = (v: string | number) => new Prisma.Decimal(v);
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

async function seedVehicleMakes() {
  const makes: Array<[string, string, string[]]> = [
    ['تويوتا', 'Toyota', ['Camry', 'Corolla', 'Hilux', 'Land Cruiser', 'Yaris', 'RAV4', 'Fortuner']],
    ['هيونداي', 'Hyundai', ['Elantra', 'Sonata', 'Accent', 'Tucson', 'Santa Fe']],
    ['نيسان', 'Nissan', ['Sunny', 'Altima', 'Patrol', 'X-Trail']],
    ['كيا', 'Kia', ['Cerato', 'Sportage', 'Rio', 'K5']],
    ['هوندا', 'Honda', ['Accord', 'Civic', 'CR-V']],
    ['فورد', 'Ford', ['Taurus', 'Explorer', 'F-150', 'Expedition']],
    ['شيفروليه', 'Chevrolet', ['Tahoe', 'Malibu', 'Silverado', 'Suburban']],
    ['لكزس', 'Lexus', ['ES', 'LX', 'RX', 'IS']],
    ['جي إم سي', 'GMC', ['Yukon', 'Sierra']],
    ['مرسيدس', 'Mercedes-Benz', ['C-Class', 'E-Class', 'S-Class', 'GLE']],
    ['بي إم دبليو', 'BMW', ['3 Series', '5 Series', 'X5']],
    ['ميتسوبيشي', 'Mitsubishi', ['Pajero', 'L200', 'Lancer']],
    ['إيسوزو', 'Isuzu', ['D-Max']],
    ['شانجان', 'Changan', ['CS35', 'CS75', 'Eado']],
    ['إم جي', 'MG', ['MG5', 'ZS', 'RX5']],
  ];
  for (const [ar, en, models] of makes) {
    const make = await prisma.vehicleMake.upsert({ where: { nameEn: en }, update: { nameAr: ar }, create: { nameAr: ar, nameEn: en } });
    for (const m of models) {
      await prisma.vehicleModel.upsert({
        where: { makeId_nameEn: { makeId: make.id, nameEn: m } },
        update: {},
        create: { makeId: make.id, nameAr: m, nameEn: m },
      });
    }
  }
  console.log(`✓ vehicle makes/models (${makes.length} makes)`);
}

async function seedServiceCategories() {
  const cats: Array<[string, string, string]> = [
    ['mechanical', 'ميكانيكا', 'Mechanical'],
    ['electrical', 'كهرباء', 'Electrical'],
    ['body_paint', 'سمكرة ودهان', 'Body & Paint'],
    ['ac', 'تكييف', 'A/C'],
    ['tires_alignment', 'إطارات وميزان', 'Tires & Alignment'],
    ['oil_service', 'زيوت وفلاتر', 'Oil & Filters'],
    ['brakes', 'فرامل', 'Brakes'],
    ['transmission', 'قير', 'Transmission'],
    ['engine_overhaul', 'إصلاح محركات', 'Engine Overhaul'],
    ['diagnostics', 'فحص كمبيوتر', 'Diagnostics'],
    ['tuning', 'تعديل وتطوير', 'Tuning'],
    ['detailing', 'تلميع وحماية', 'Detailing'],
    ['glass', 'زجاج', 'Glass'],
    ['towing', 'سطحة', 'Towing'],
  ];
  for (const [code, ar, en] of cats) {
    await prisma.serviceCategory.upsert({ where: { code }, update: { nameAr: ar, nameEn: en }, create: { code, nameAr: ar, nameEn: en } });
  }
  console.log(`✓ service categories (${cats.length})`);
}

async function seedPartCategories() {
  const cats: Array<[string, string, string, boolean]> = [
    ['engine', 'محرك', 'Engine', true],
    ['gearbox', 'قير', 'Gearbox', true],
    ['brake_pads', 'فحمات فرامل', 'Brake Pads', false],
    ['brake_discs', 'دسكات', 'Brake Discs', false],
    ['radiator', 'رديتر', 'Radiator', false],
    ['alternator', 'دينمو', 'Alternator', true],
    ['starter', 'سلف', 'Starter', true],
    ['ac_compressor', 'كمبروسر تكييف', 'A/C Compressor', true],
    ['battery', 'بطارية', 'Battery', false],
    ['oil_filter', 'فلتر زيت', 'Oil Filter', false],
    ['air_filter', 'فلتر هواء', 'Air Filter', false],
    ['spark_plugs', 'بواجي', 'Spark Plugs', false],
    ['bumper_front', 'صدام أمامي', 'Front Bumper', false],
    ['bumper_rear', 'صدام خلفي', 'Rear Bumper', false],
    ['headlight', 'شمعة أمامية', 'Headlight', false],
    ['taillight', 'شمعة خلفية', 'Taillight', false],
    ['door', 'باب', 'Door', false],
    ['fender', 'رفرف', 'Fender', false],
    ['hood', 'كبوت', 'Hood', false],
    ['mirror', 'مراية', 'Side Mirror', false],
    ['shock_absorber', 'مساعدات', 'Shock Absorber', false],
    ['tire', 'إطار', 'Tire', false],
    ['ecu', 'كمبيوتر المحرك', 'ECU', true],
  ];
  for (const [code, ar, en, major] of cats) {
    await prisma.partCategory.upsert({
      where: { code },
      update: { nameAr: ar, nameEn: en, isMajorComponent: major },
      create: { code, nameAr: ar, nameEn: en, isMajorComponent: major },
    });
  }
  console.log(`✓ part categories (${cats.length})`);
}

async function seedPartBrands() {
  const brands: Array<[string, string, boolean]> = [
    ['بوش', 'Bosch', false],
    ['دينسو', 'Denso', false],
    ['إن جي كيه', 'NGK', false],
    ['تي آر دبليو', 'TRW', false],
    ['موبيل', 'Mobil', false],
    ['تويوتا (أصلي)', 'Toyota Genuine', true],
    ['هيونداي (أصلي)', 'Hyundai Genuine', true],
    ['نيسان (أصلي)', 'Nissan Genuine', true],
  ];
  for (const [ar, en, oem] of brands) {
    await prisma.partBrand.upsert({ where: { nameEn: en }, update: { nameAr: ar, isOem: oem }, create: { nameAr: ar, nameEn: en, isOem: oem } });
  }
  console.log(`✓ part brands (${brands.length})`);
}

async function seedPlans() {
  const plans = [
    { code: 'workshop_basic', nameAr: 'ورشة — أساسي', nameEn: 'Workshop Basic', appliesTo: ['workshop', 'factory', 'service_center', 'body_shop'], monthlyPrice: 199, yearlyPrice: 1990, bps: 600, noteFee: 15 },
    { code: 'workshop_pro', nameAr: 'ورشة — احترافي', nameEn: 'Workshop Pro', appliesTo: ['workshop', 'factory', 'service_center', 'body_shop'], monthlyPrice: 499, yearlyPrice: 4990, bps: 400, noteFee: 10 },
    { code: 'scrapyard_basic', nameAr: 'تشليح — أساسي', nameEn: 'Scrapyard Basic', appliesTo: ['scrapyard', 'parts_dealer'], monthlyPrice: 99, yearlyPrice: 990, bps: 500, noteFee: 15 },
    { code: 'distributor_enterprise', nameAr: 'وكيل قطع — مؤسسي', nameEn: 'Distributor Enterprise', appliesTo: ['parts_distributor', 'parts_brand_agent'], monthlyPrice: 1999, yearlyPrice: 19990, bps: 300, noteFee: 10 },
    { code: 'fleet_enterprise', nameAr: 'أسطول — مؤسسي', nameEn: 'Fleet Enterprise', appliesTo: ['fleet_company'], monthlyPrice: 1499, yearlyPrice: 14990, bps: 0, noteFee: 0 },
  ] as const;
  for (const p of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { code: p.code },
      update: { nameAr: p.nameAr, nameEn: p.nameEn, monthlyPrice: D(p.monthlyPrice), yearlyPrice: D(p.yearlyPrice), commissionRateBps: p.bps, noteFeeSar: D(p.noteFee) },
      create: {
        code: p.code, nameAr: p.nameAr, nameEn: p.nameEn, appliesTo: [...p.appliesTo],
        monthlyPrice: D(p.monthlyPrice), yearlyPrice: D(p.yearlyPrice), commissionRateBps: p.bps, noteFeeSar: D(p.noteFee),
        features: { live_tracking: true, nafath_signing: true },
      },
    });
  }
  console.log(`✓ subscription plans (${plans.length})`);
}

async function seedPlatformSettings() {
  const settings: Record<string, Prisma.InputJsonValue> = {
    'escrow.auto_release_hours': 72,
    'bidding.default_minutes': 60,
    'abandoned.notice_days': 15,
    'abandoned.storage_fee_max_per_day': 50,
    'vat.rate_percent': 15,
    'commission.default_bps': 500,
    'note.issuance_fee_sar': 15,
    'trade_account.default_credit_limit_sar': 5000,
    'trade_account.default_terms_days': 30,
    // Pilot zones as structured configuration — ops edit them from the back-office, no deploy (Step 25).
    'pilot.industrial_zones': [
      { code: 'RUH-IND-1', nameAr: 'المدينة الصناعية الأولى — الرياض', city: 'الرياض', lat: 24.6408, lng: 46.7728, radiusKm: 6 },
      { code: 'RUH-IND-2', nameAr: 'المدينة الصناعية الثانية — الرياض', city: 'الرياض', lat: 24.5741, lng: 46.8347, radiusKm: 8 },
      { code: 'RUH-SULAY', nameAr: 'السلي — الرياض', city: 'الرياض', lat: 24.6167, lng: 46.8333, radiusKm: 5 },
      { code: 'RUH-NASEEM', nameAr: 'ورش النسيم — الرياض', city: 'الرياض', lat: 24.7333, lng: 46.85, radiusKm: 4 },
      { code: 'JED-IND-1', nameAr: 'المدينة الصناعية الأولى — جدة', city: 'جدة', lat: 21.4114, lng: 39.22, radiusKm: 7 },
    ],
    // Feature flags: the pilot ships with the core on and the unfinished/advanced surfaces off.
    // A flag that does not exist is off, so new code stays inert until ops turn it on.
    'feature.parts_marketplace': { enabled: true },
    'feature.trade_accounts': { enabled: true },
    'feature.tow': { enabled: true },
    'feature.accident_reports': { enabled: true },
    'feature.warranty_wallet': { enabled: true },
    'feature.disputes': { enabled: true },
    'feature.group_buys': { enabled: false, zones: ['RUH-IND-2'] },   // one zone first — it needs density to work
    'feature.voice_to_invoice': { enabled: false },                    // Step 27, not built
    'feature.ai_inspection': { enabled: false },                       // Step 28, not built
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.platformSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
  console.log(`✓ platform settings (${Object.keys(settings).length})`);
}

async function upsertUser(phone: string, nameAr: string, extra: Partial<Prisma.UserUncheckedCreateInput> = {}) {
  return prisma.user.upsert({
    where: { phoneE164: phone },
    update: { fullNameAr: nameAr, ...extra },
    create: { phoneE164: phone, fullNameAr: nameAr, status: 'active', ...extra },
  });
}

async function upsertOrg(input: { cr: string; type: Prisma.OrganizationCreateInput['type']; nameAr: string; nameEn: string; slug: string; ownerId: string; vat?: string; lat: number; lng: number; city: string; zone?: string }) {
  const org = await prisma.organization.upsert({
    where: { crNumber: input.cr },
    update: { legalNameAr: input.nameAr, legalNameEn: input.nameEn, tradeNameAr: input.nameAr, status: 'active', ...(input.vat ? { vatNumber: input.vat, vatRegistered: true } : {}) },
    create: {
      type: input.type, status: 'active', legalNameAr: input.nameAr, legalNameEn: input.nameEn, tradeNameAr: input.nameAr,
      slug: input.slug, crNumber: input.cr, vatNumber: input.vat, vatRegistered: !!input.vat, verifiedAt: new Date(), createdBy: input.ownerId,
    },
  });
  await prisma.organizationMember.upsert({
    where: { orgId_userId: { orgId: org.id, userId: input.ownerId } },
    update: { role: 'owner' },
    create: { orgId: org.id, userId: input.ownerId, role: 'owner' },
  });
  // geo column is PostGIS (Unsupported in Prisma) → raw SQL, idempotent per (org, primary)
  const existing = await prisma.$queryRaw<Array<{ id: string }>>`SELECT id FROM organization_locations WHERE org_id = ${org.id}::uuid AND is_primary = true LIMIT 1`;
  if (existing.length > 0 && input.zone) {
    // Older databases carry the free-text zone; move them onto the code.
    await prisma.$executeRaw`UPDATE organization_locations SET industrial_zone = ${input.zone} WHERE id = ${existing[0]!.id}::uuid`;
  }
  if (existing.length === 0) {
    await prisma.$executeRaw`INSERT INTO organization_locations (org_id, name_ar, is_primary, city, industrial_zone, geo)
      VALUES (${org.id}::uuid, ${'الفرع الرئيسي'}, true, ${input.city}, ${input.zone ?? null}, ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326)::geography)`;
  }
  return org;
}

async function seedDemo() {
  // Zone *codes* (Step 25): the pilot groups by a stable code, not by however someone typed the name.
  const zone = 'RUH-IND-2';
  const owner1 = await upsertUser('+966500000001', 'أبو محمد — مالك ورشة النور');
  const owner2 = await upsertUser('+966500000002', 'عبدالله — تشليح الشرق');
  const owner3 = await upsertUser('+966500000003', 'خالد — وكيل بوش الرياض');
  const customer = await upsertUser('+966500000010', 'أبو فهد — عميل', { nationalIdHash: sha256('demo-1010101010'), nafathVerifiedAt: new Date() });
  const admin = await upsertUser('+966500000099', 'مشرف المنصة', { platformRole: 'super_admin' });

  const workshop = await upsertOrg({ cr: '1010000001', type: 'workshop', nameAr: 'ورشة النور للسمكرة والميكانيكا', nameEn: 'Al Noor Auto Workshop', slug: 'alnoor-workshop', ownerId: owner1.id, vat: '300000000000003', lat: 24.6300, lng: 46.7900, city: 'الرياض', zone });

  // ورشة مخصّصة لأدوات الفحص (فاحص الوصلة، اختبارات الحِمل) — كي لا يلوث ركامها شاشة ورشة النور
  // التي يفتحها المالك: بيانات الاختبار حقيقية في القاعدة، لكنها لا تظهر في العرض.
  const qaOwner = await upsertUser('+966500000009', 'حساب الفحص الآلي');
  const qaWorkshop = await upsertOrg({ cr: '1010000009', type: 'workshop', nameAr: 'ورشة الفحص الآلي (بيئة اختبار)', nameEn: 'QA Workshop', slug: 'qa-workshop', ownerId: qaOwner.id, vat: '300000000000009', lat: 24.6100, lng: 46.7700, city: 'الرياض', zone });
  void qaWorkshop;
  const scrapyard = await upsertOrg({ cr: '1010000002', type: 'scrapyard', nameAr: 'تشليح الشرق لقطع الغيار', nameEn: 'Al Sharq Scrapyard', slug: 'alsharq-scrapyard', ownerId: owner2.id, vat: '300000000000053', lat: 24.6100, lng: 46.8300, city: 'الرياض', zone });
  const owner4 = await upsertUser('+966500000004', 'سعد — محل قطع الجزيرة');
  const dealer = await upsertOrg({ cr: '1010000004', type: 'parts_dealer', nameAr: 'محل قطع الجزيرة', nameEn: 'Al Jazeera Parts Shop', slug: 'aljazeera-parts', ownerId: owner4.id, vat: '300000000000063', lat: 24.6400, lng: 46.7800, city: 'الرياض', zone });
  const distributor = await upsertOrg({ cr: '1010000003', type: 'parts_distributor', nameAr: 'وكيل بوش الرياض — فرع الصناعية', nameEn: 'Bosch Riyadh Distributor', slug: 'bosch-riyadh', ownerId: owner3.id, vat: '300000000000043', lat: 24.6250, lng: 46.7950, city: 'الرياض', zone });

  // subscriptions
  const plan = async (code: string) => (await prisma.subscriptionPlan.findUniqueOrThrow({ where: { code } })).id;
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 86400_000);
  for (const [org, code] of [[workshop, 'workshop_pro'], [scrapyard, 'scrapyard_basic'], [distributor, 'distributor_enterprise']] as const) {
    const exists = await prisma.subscription.findFirst({ where: { orgId: org.id } });
    if (!exists) await prisma.subscription.create({ data: { orgId: org.id, planId: await plan(code), status: 'active', currentPeriodStart: now, currentPeriodEnd: in30 } });
  }

  // customer vehicle
  const toyota = await prisma.vehicleMake.findUniqueOrThrow({ where: { nameEn: 'Toyota' } });
  const camry = await prisma.vehicleModel.findUniqueOrThrow({ where: { makeId_nameEn: { makeId: toyota.id, nameEn: 'Camry' } } });
  await prisma.vehicle.upsert({
    where: { vin: '4T1B11HK5KU000001' },
    update: {},
    create: { vin: '4T1B11HK5KU000001', plateNumber: 'أ ب ج 4821', makeId: toyota.id, modelId: camry.id, modelYear: 2019, fuelType: 'petrol', ownerType: 'user', ownerUserId: customer.id, odometerKm: 84250 },
  });

  console.log(`✓ demo: workshop=${workshop.id} scrapyard=${scrapyard.id} distributor=${distributor.id} dealer=${dealer.id} customer=${customer.id} admin=${admin.id}`);
}

async function main() {
  await seedVehicleMakes();
  await seedServiceCategories();
  await seedPartCategories();
  await seedPartBrands();
  await seedPlans();
  await seedPlatformSettings();
  await seedDemo();
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('seed complete');
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
