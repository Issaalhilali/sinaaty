#!/usr/bin/env node
// تدوير مفتاح حساب خدمة Firebase — مع إثباتٍ أنه يعمل قبل الاعتماد عليه.
//
//   node tools/rotate-fcm-key.mjs [مسار المفتاح الجديد]
//
// بلا مسار: يأخذ أحدث ملف `*adminsdk*.json` من ~/Downloads.
//
// تدوير المفتاح خطوتان لا واحدة: إنشاء الجديد في وحدة التحكّم، ثم **حذف القديم**. وبينهما
// لحظةٌ خطرة: من يحذف القديم قبل أن يتأكّد أن الجديد يعمل يُسكِت إشعارات المنصّة كلها بلا
// أن يدري — لا خطأ يظهر عند الإقلاع، فالمفتاح يُقرأ ولا يُجرَّب إلا عند أول إشعار.
//
// فهذا السكربت يُجرّبه: يُبادل المفتاح برمز وصولٍ من Google فعلاً، ثم يتحقّق من رسالةٍ
// بـ`validateOnly` (تُفحص ولا تُرسَل — فلا يهتزّ جوال أحد لأننا ندوّر مفتاحاً). وإن فشل
// أعاد القديم مكانه، فلا يبقى الخادم بمفتاحٍ لا يعمل.
import { createSign } from 'node:crypto';
import { readFileSync, writeFileSync, copyFileSync, readdirSync, statSync, chmodSync, unlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';

const HERE = new URL('..', import.meta.url).pathname;
const LIVE = join(HERE, '.secrets/fcm.json');
const die = (m) => { console.error(`\n✗ ${m}\n`); process.exit(1); };
const b64url = (b) => Buffer.from(b).toString('base64url');

function newestDownload() {
  const dir = join(homedir(), 'Downloads');
  const hits = readdirSync(dir).filter((f) => /adminsdk.*\.json$/i.test(f)).map((f) => join(dir, f));
  if (!hits.length) die('لم أجد مفتاحاً جديداً في ~/Downloads — نزّله من وحدة التحكّم أو مرّر مساره.');
  return hits.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
}

function readKey(path, what) {
  let sa;
  try { sa = JSON.parse(readFileSync(path, 'utf8')); } catch { die(`${what} ليس JSON سليماً: ${path}`); }
  for (const f of ['project_id', 'client_email', 'private_key', 'private_key_id']) if (!sa[f]) die(`${what} ينقصه ${f}`);
  return sa;
}

/** مبادلة المفتاح برمز وصول — هذه وحدها تُثبت أن Google يقبله. */
async function exchange(sa) {
  const now = Math.floor(Date.now() / 1000);
  const uri = sa.token_uri ?? 'https://oauth2.googleapis.com/token';
  const claims = { iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: uri, iat: now, exp: now + 3600 };
  const body = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(JSON.stringify(claims))}`;
  const jwt = `${body}.${createSign('RSA-SHA256').update(body).end().sign(sa.private_key, 'base64url')}`;
  const res = await fetch(uri, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }) });
  const text = await res.text();
  if (!res.ok) throw new Error(`Google رفض المفتاح (${res.status}): ${text.slice(0, 200)}`);
  return JSON.parse(text).access_token;
}

/** رمز جهازٍ حقيقي إن وُجد — الفحص بجهازٍ فعلي أصدق من الفحص برمزٍ مخترع. */
function aDeviceToken() {
  try {
    const url = process.env.DATABASE_URL ?? readFileSync(join(HERE, '.env'), 'utf8').match(/^DATABASE_URL="?([^"\n]+)/m)?.[1];
    if (!url) return null;
    const out = execSync(`psql "${url}" -tAc "SELECT push_token FROM devices WHERE push_token IS NOT NULL ORDER BY updated_at DESC LIMIT 1"`, { stdio: ['ignore', 'pipe', 'ignore'] });
    return out.toString().trim() || null;
  } catch { return null; }
}

/** فحصٌ لا يُرسل: `validateOnly` يمرّ بالمصادقة وبناء الرسالة ثم يقف. */
async function validateSend(token, projectId, deviceToken) {
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ validate_only: true, message: { token: deviceToken, notification: { title: 'فحص', body: 'فحص تدوير المفتاح' } } }) });
  if (res.status === 401 || res.status === 403) throw new Error(`المفتاح الجديد لا يملك صلاحية الإرسال (${res.status}).`);
  return res.status;
}

// `--check`: هل المفتاح العامل الآن سليم؟ نفس الفحص بلا تدوير — تُسأل قبل التدوير وبعده،
// ويومَ تصمت الإشعارات فيُعرف أهو المفتاح أم شيء آخر.
if (process.argv[2] === '--check') {
  const sa = readKey(LIVE, 'المفتاح الحالي');
  console.log(`\nالمفتاح: ${sa.private_key_id.slice(0, 12)}…  (${sa.client_email})`);
  try {
    const token = await exchange(sa);
    const device = aDeviceToken();
    if (device) console.log(`الرسالة: ${(await validateSend(token, sa.project_id, device)) === 200 ? 'صالحة' : 'الرمز المخزّن ميت — لا شأن للمفتاح'}`);
    console.log('\n✓ المفتاح يعمل: Google يقبله ويأذن له بالإرسال.\n');
  } catch (e) { die(e.message); }
  process.exit(0);
}

const newPath = resolve(process.argv[2] ?? newestDownload());
const next = readKey(newPath, 'المفتاح الجديد');
const live = readKey(LIVE, 'المفتاح الحالي');

console.log(`\nالحالي : ${live.private_key_id.slice(0, 12)}…  (${live.client_email})`);
console.log(`الجديد : ${next.private_key_id.slice(0, 12)}…  ${newPath}`);
if (next.project_id !== live.project_id) die(`المشروع مختلف: ${next.project_id} ≠ ${live.project_id}`);
if (next.private_key_id === live.private_key_id) die('هذا هو المفتاح نفسه — أنشئ مفتاحاً جديداً في وحدة التحكّم أولاً.');

const backup = `${LIVE}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
copyFileSync(LIVE, backup); chmodSync(backup, 0o600);

try {
  console.log('\n… أُبادل المفتاح الجديد برمز وصول من Google');
  const token = await exchange(next);
  const device = aDeviceToken();
  console.log(device ? '… وأفحص رسالةً بجهازٍ حقيقي (بلا إرسال)' : '… وأفحص المصادقة (لا يوجد جهاز مسجّل لفحص الرسالة به)');
  if (device) {
    const st = await validateSend(token, next.project_id, device);
    console.log(st === 200 ? '  الرسالة صالحة' : `  المصادقة نجحت، والرمز المخزّن ميت (${st}) — لا شأن للمفتاح بذلك`);
  }
  writeFileSync(LIVE, JSON.stringify(next, null, 2)); chmodSync(LIVE, 0o600);
  console.log(`\n✓ المفتاح الجديد مثبَّت ومُثبَت أنه يعمل.\n  النسخة الاحتياطية: ${backup}`);
  console.log('\nبقيت خطوتان في وحدة التحكّم — بهذا الترتيب:');
  console.log(`  ١) أعد تشغيل الخادم كي يقرأ المفتاح الجديد:  ./run.sh stop && ./run.sh`);
  console.log(`  ٢) احذف المفتاح القديم ${live.private_key_id.slice(0, 12)}… من:`);
  console.log(`     https://console.cloud.google.com/iam-admin/serviceaccounts?project=${live.project_id}`);
  console.log(`  ثم امحُ النسخة الاحتياطية:  rm -P "${backup}"\n`);
} catch (e) {
  copyFileSync(backup, LIVE); chmodSync(LIVE, 0o600); unlinkSync(backup);
  die(`لم أعتمد المفتاح الجديد، وأعدتُ القديم مكانه.\n  ${e.message}`);
}
