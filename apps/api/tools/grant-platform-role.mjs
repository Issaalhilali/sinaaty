#!/usr/bin/env node
/**
 * Grant (or revoke) a platform role so a phone can sign in to the admin dashboard.
 * Usage: pnpm --filter api grant:role -- 0512345678 super_admin ["الاسم الكامل"]
 * Roles: none | support | ops | finance | compliance | super_admin  (none = revoke)
 * Creates the user if the phone has never signed in. Never touches org membership.
 */
import { PrismaClient } from '@prisma/client';
const ROLES = ['none', 'support', 'ops', 'finance', 'compliance', 'super_admin'];
const normalize = (input) => { const d = String(input).replace(/[^\d+]/g, ''); const m = /^(?:\+?966|00966|0)?(5\d{8})$/.exec(d); return m ? `+966${m[1]}` : null; };
const [rawPhone, rawRole = 'super_admin', name] = process.argv.slice(2);
const phone = normalize(rawPhone ?? '');
if (!phone) { console.error('✗ رقم غير صالح. مثال: pnpm --filter api grant:role -- 0512345678 super_admin'); process.exit(1); }
if (!ROLES.includes(rawRole)) { console.error(`✗ دور غير معروف: ${rawRole}. المتاح: ${ROLES.join(' | ')}`); process.exit(1); }
const prisma = new PrismaClient();
try {
  const user = await prisma.user.upsert({ where: { phoneE164: phone }, update: { platformRole: rawRole, status: 'active' }, create: { phoneE164: phone, fullNameAr: name ?? 'فريق المنصة', status: 'active', platformRole: rawRole } });
  console.log(`✓ ${phone} → ${rawRole}${name ? ` (${name})` : ''}  [user ${user.id}]`);
  console.log(rawRole === 'none' ? '  لن يستطيع الدخول للوحة الإدارة بعد الآن.' : '  ادخل الآن من http://localhost:3001/login برمز التحقق.');
} finally { await prisma.$disconnect(); }
