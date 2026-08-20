#!/usr/bin/env node
/**
 * Pilot onboarding (Step 25).
 *
 * Ops sits with a workshop owner for ten minutes; this turns those ten minutes into an active account:
 * owner user → organization → primary location (industrial zone derived from the point) → specialties →
 * KYB marked verified with the reason ops recorded → subscription plan → the owner is an `owner` member.
 *
 * Idempotent by CR number: re-running after a correction updates the same organization instead of
 * creating a second one.
 *
 *   node tools/onboard-pilot.mjs pilot-workshops.json           # onboard
 *   node tools/onboard-pilot.mjs pilot-workshops.json --dry-run # show what would change
 *   node tools/onboard-pilot.mjs --template > pilot.json        # write an example file
 *
 * File shape (JSON array):
 *   [{ "legal_name_ar": "...", "trade_name_ar": "...", "cr_number": "1010101010", "vat_number": "300...",
 *      "type": "workshop", "owner_phone": "0501234567", "owner_name_ar": "...",
 *      "city": "الرياض", "district": "...", "lat": 24.57, "lng": 46.83, "address_line": "...",
 *      "specialties": ["body_paint","mechanical"], "plan_code": "workshop_basic",
 *      "approved_by_phone": "0506827499", "reason_ar": "زيارة ميدانية — السجل والرخصة مطابقان" }]
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';

/** Canonical JSON + hash chain — copied in behaviour from src/common/audit/audit-hash.ts and pinned by a
 *  test there, because a hand-written audit row that breaks the chain is worse than no row at all. */
const canonicalize = (v) => {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canonicalize).join(',')}]`;
  return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonicalize(v[k])}`).join(',')}}`;
};
const GENESIS = '0'.repeat(64);
const auditHash = (prev, row) => createHash('sha256').update(prev ?? GENESIS).update(canonicalize(row)).digest('hex');

const TEMPLATE = [
  {
    legal_name_ar: 'مؤسسة النور لصيانة السيارات',
    trade_name_ar: 'ورشة النور',
    cr_number: '1010000001',
    vat_number: '300000000000003',
    type: 'workshop',
    owner_phone: '0501234567',
    owner_name_ar: 'عبدالله النور',
    city: 'الرياض',
    district: 'الصناعية الثانية',
    lat: 24.5741,
    lng: 46.8347,
    address_line: 'شارع 30، مقابل مستودعات الجبر',
    specialties: ['body_paint', 'mechanical'],
    plan_code: 'workshop_basic',
    approved_by_phone: '0506827499',
    reason_ar: 'زيارة ميدانية — السجل التجاري والرخصة البلدية مطابقان',
  },
];

const args = process.argv.slice(2);
if (args.includes('--template')) { process.stdout.write(`${JSON.stringify(TEMPLATE, null, 2)}\n`); process.exit(0); }
const DRY = args.includes('--dry-run');
const file = args.find((a) => !a.startsWith('--'));
if (!file) { console.error('usage: node tools/onboard-pilot.mjs <file.json> [--dry-run]   (or --template)'); process.exit(1); }

const prisma = new PrismaClient();

/** Same normalisation the API applies — ops types 05xxxxxxxx, the database stores +9665xxxxxxxx. */
function normalizePhone(input) {
  const digits = String(input).replace(/[^\d+]/g, '');
  if (digits.startsWith('+966')) return digits;
  if (digits.startsWith('00966')) return `+${digits.slice(2)}`;
  if (digits.startsWith('966')) return `+${digits}`;
  if (digits.startsWith('05')) return `+966${digits.slice(1)}`;
  if (digits.startsWith('5') && digits.length === 9) return `+966${digits}`;
  throw new Error(`unrecognised Saudi phone: ${input}`);
}

const EARTH_KM = 6371;
const rad = (d) => (d * Math.PI) / 180;
const distanceKm = (a, b) => {
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
};

async function zonesFromSettings() {
  const row = await prisma.platformSetting.findUnique({ where: { key: 'pilot.industrial_zones' } });
  const zones = Array.isArray(row?.value) ? row.value : [];
  return zones.filter((z) => z && typeof z === 'object' && 'lat' in z);
}
const zoneFor = (point, zones) => {
  let best = null;
  for (const z of zones) { const d = distanceKm(point, z); if (d <= z.radiusKm && (!best || d < best.d)) best = { z, d }; }
  return best?.z?.code ?? null;
};

async function onboard(row, zones) {
  const ownerPhone = normalizePhone(row.owner_phone);
  const zone = row.industrial_zone ?? zoneFor({ lat: row.lat, lng: row.lng }, zones);
  const plan = row.plan_code ? await prisma.subscriptionPlan.findFirst({ where: { code: row.plan_code } }) : null;
  if (row.plan_code && !plan) throw new Error(`unknown plan_code ${row.plan_code}`);
  const approver = row.approved_by_phone ? await prisma.user.findUnique({ where: { phoneE164: normalizePhone(row.approved_by_phone) } }) : null;
  if (row.approved_by_phone && !approver) throw new Error(`approver ${row.approved_by_phone} has no account — run grant:role first`);
  if (!row.reason_ar?.trim()) throw new Error('reason_ar is required — every activation is auditable');

  const existing = await prisma.organization.findFirst({ where: { crNumber: row.cr_number } });
  if (DRY) return { action: existing ? 'update' : 'create', name: row.trade_name_ar ?? row.legal_name_ar, zone, plan: plan?.code ?? null };

  return prisma.$transaction(async (tx) => {
    const owner = await tx.user.upsert({
      where: { phoneE164: ownerPhone },
      update: { fullNameAr: row.owner_name_ar, status: 'active' },
      create: { phoneE164: ownerPhone, fullNameAr: row.owner_name_ar, status: 'active' },
    });

    const data = {
      type: row.type ?? 'workshop', legalNameAr: row.legal_name_ar, tradeNameAr: row.trade_name_ar ?? null,
      crNumber: row.cr_number, vatNumber: row.vat_number ?? null, vatRegistered: Boolean(row.vat_number),
      phoneE164: ownerPhone, status: 'active', verifiedAt: new Date(), createdBy: owner.id,
    };
    const org = existing
      ? await tx.organization.update({ where: { id: existing.id }, data })
      : await tx.organization.create({ data });

    await tx.organizationMember.upsert({
      where: { orgId_userId: { orgId: org.id, userId: owner.id } },
      update: { role: 'owner', isActive: true },
      create: { orgId: org.id, userId: owner.id, role: 'owner', isActive: true },
    });

    // geography column: written through raw SQL (Prisma cannot express it).
    const loc = await tx.$queryRaw`
      SELECT id FROM organization_locations WHERE org_id = ${org.id}::uuid AND is_primary LIMIT 1`;
    if (loc.length) {
      await tx.$executeRaw`
        UPDATE organization_locations SET city = ${row.city}, district = ${row.district ?? null}, industrial_zone = ${zone},
               address_line = ${row.address_line ?? null}, geo = ST_SetSRID(ST_MakePoint(${row.lng}, ${row.lat}), 4326)::geography
        WHERE id = ${loc[0].id}::uuid`;
    } else {
      await tx.$executeRaw`
        INSERT INTO organization_locations (org_id, name_ar, is_primary, city, district, industrial_zone, address_line, geo)
        VALUES (${org.id}::uuid, ${row.trade_name_ar ?? row.legal_name_ar}, true, ${row.city}, ${row.district ?? null}, ${zone},
                ${row.address_line ?? null}, ST_SetSRID(ST_MakePoint(${row.lng}, ${row.lat}), 4326)::geography)`;
    }

    // Specialties are service-category codes (mechanical, body_paint, ac ...) — resolved to ids here so
    // ops can write the code they know instead of a database id.
    for (const code of row.specialties ?? []) {
      const cat = await tx.serviceCategory.findUnique({ where: { code } });
      if (!cat) throw new Error(`unknown specialty "${code}" — see service_categories.code`);
      await tx.$executeRaw`
        INSERT INTO organization_specialties (org_id, category_id) VALUES (${org.id}::uuid, ${cat.id})
        ON CONFLICT DO NOTHING`;
    }

    if (plan) {
      const active = await tx.subscription.findFirst({ where: { orgId: org.id, status: 'active' } });
      if (!active) {
        const start = new Date();
        const end = new Date(start.getTime() + 30 * 86_400_000);   // monthly cycle, renewed by billing later
        await tx.subscription.create({ data: { orgId: org.id, planId: plan.id, status: 'active', billingCycle: 'monthly', currentPeriodStart: start, currentPeriodEnd: end } });
        await tx.organization.update({ where: { id: org.id }, data: { commissionRateBps: plan.commissionRateBps } });
      }
    }

    // Activation is a decision by a named person, with a written reason — same rule as the back-office,
    // and the same hash chain: the row is linked to the previous one so the log stays verifiable.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(7432001)`;
    const last = await tx.$queryRaw`SELECT hash FROM audit_log ORDER BY id DESC LIMIT 1`;
    const prevHash = last[0]?.hash ?? null;
    const occurredAt = new Date();
    const auditRow = {
      occurredAt: occurredAt.toISOString(), actorUserId: approver?.id ?? null, actorType: 'admin', orgId: org.id,
      action: 'org.onboard.pilot', entityType: 'organization', entityId: org.id, before: null,
      after: { cr_number: row.cr_number, zone, plan: plan?.code ?? null, reason_ar: row.reason_ar, source: 'onboard-pilot.mjs' },
      requestId: null,
    };
    await tx.$executeRaw`
      INSERT INTO audit_log (occurred_at, actor_user_id, actor_type, org_id, action, entity_type, entity_id, before, after, request_id, prev_hash, hash)
      VALUES (${occurredAt}, ${auditRow.actorUserId}::uuid, 'admin', ${org.id}::uuid, ${auditRow.action}, 'organization', ${org.id}::uuid,
              NULL, ${JSON.stringify(auditRow.after)}::jsonb, NULL, ${prevHash}, ${auditHash(prevHash, auditRow)})`;

    return { action: existing ? 'updated' : 'created', id: org.id, name: org.tradeNameAr ?? org.legalNameAr, zone, owner: ownerPhone, plan: plan?.code ?? null };
  });
}

const rows = JSON.parse(readFileSync(file, 'utf8'));
if (!Array.isArray(rows)) { console.error('the file must contain a JSON array'); process.exit(1); }

const zones = await zonesFromSettings();
console.log(`${DRY ? '[dry run] ' : ''}onboarding ${rows.length} organization(s) · ${zones.length} pilot zones configured\n`);

const results = [];
for (const [i, row] of rows.entries()) {
  try {
    const r = await onboard(row, zones);
    results.push({ ok: true, ...r });
    console.log(`  ✓ ${String(i + 1).padStart(2)} ${r.action.padEnd(8)} ${r.name}${r.zone ? ` · ${r.zone}` : ' · outside the pilot zones'}`);
  } catch (e) {
    // Unique-constraint messages from Prisma name the column but not the row — say which is which.
    const message = /vat_number/.test(e.message) ? `VAT number ${row.vat_number} already belongs to another organization` : /cr_number/.test(e.message) ? `CR ${row.cr_number} already belongs to another organization` : e.message;
    results.push({ ok: false, row: row.cr_number, error: message });
    console.error(`  ✗ ${String(i + 1).padStart(2)} ${row.trade_name_ar ?? row.legal_name_ar}: ${results.at(-1).error}`);
  }
}

const failed = results.filter((r) => !r.ok).length;
const out = `onboard-report-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '')}.json`;
if (!DRY) writeFileSync(out, JSON.stringify(results, null, 2));
console.log(`\n${results.length - failed} succeeded, ${failed} failed${DRY ? '' : ` · report: ${out}`}`);
await prisma.$disconnect();
process.exit(failed ? 1 : 0);
