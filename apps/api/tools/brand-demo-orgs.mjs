#!/usr/bin/env node
// يُلبس المنشآت التجريبية أغلفتها — فيصير الاستكشاف حيّاً بوجوهٍ لا صفوفاً باردة.
// الأغلفة تُطبع من هوية المنتج (apps/mobile/test/tool/covers_gen_test.dart) لا صور مزيفة،
// والورش الحقيقية ترفع صورها من التطبيق (⋯ > صورة الورشة) فتحل محلها.
//   node tools/brand-demo-orgs.mjs            # dev فقط — يمر عبر النقاط الرسمية كلها
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const API = process.env.API_URL ?? 'http://127.0.0.1:3000/v1';
const here = resolve(new URL('.', import.meta.url).pathname);
const cover = (n) => resolve(here, `../../mobile/test/tool/${n}.png`);

const OWNERS = [
  { phone: '+966500000001', file: cover('cover_workshop') },   // ورشة النور
  { phone: '+966500000002', file: cover('cover_scrapyard') },  // تشليح الشرق
  { phone: '+966500000003', file: cover('cover_parts') },      // وكيل بوش
  { phone: '+966500000004', file: cover('cover_parts') },      // محل قطع الجزيرة
];

const j = async (r) => { const b = await r.json().catch(() => ({})); if (!r.ok) throw new Error(`${r.status} ${JSON.stringify(b)}`); return b; };

for (const { phone, file } of OWNERS) {
  try {
    const req = await j(await fetch(`${API}/auth/otp/request`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone }) }));
    const v = await j(await fetch(`${API}/auth/otp/verify`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone, code: req.debug_code }) }));
    const auth = { authorization: `Bearer ${v.accessToken}`, 'content-type': 'application/json' };
    const mine = await j(await fetch(`${API}/organizations/mine`, { headers: auth }));
    const org = mine.find((o) => o.status === 'active') ?? mine[0];
    if (!org) { console.log(`— ${phone}: بلا منشأة`); continue; }
    const bytes = readFileSync(file);
    const p = await j(await fetch(`${API}/media/presign`, { method: 'POST', headers: auth, body: JSON.stringify({ kind: 'image', mime_type: 'image/png', size_bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), purpose: 'org_logo' }) }));
    const up = await fetch(p.upload.url, { method: 'PUT', headers: { 'content-type': 'image/png' }, body: bytes });
    if (!up.ok) throw new Error(`upload ${up.status}`);
    await j(await fetch(`${API}/organizations/${org.id}/branding`, { method: 'PUT', headers: auth, body: JSON.stringify({ cover_media_id: p.media_id }) }));
    console.log(`✓ ${org.name_ar} — غلافها لُبس`);
  } catch (e) {
    console.log(`✗ ${phone}: ${e.message}`);
  }
}
