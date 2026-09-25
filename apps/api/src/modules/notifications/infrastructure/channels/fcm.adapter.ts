import { createSign } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../../../config';
import type { PushMessage, PushPort } from '../../application/ports/channels.port';

/**
 * إشعار حقيقي عبر FCM HTTP v1 — بلا SDK، كما كُتب SigV4 وDER في هذا المستودع: مكتبة أقل تعني
 * سطح هجوم أقل وسلوكاً نعرفه سطراً سطراً.
 *
 * لماذا هو أهمّ محوّل عندنا: كل ما بنيناه من قنوات حيّة يصل **للتطبيق المفتوح**. وصاحب الورشة
 * تحت سيارة، وتاجر القطع في مستودعه — التطبيق مغلق، والطلب يموت في صندوق لا يفتحه أحد. هذا
 * المحوّل هو الفارق بين سوقٍ يعمل وسوقٍ يبدو أنه يعمل.
 *
 * المصادقة: JWT موقّع بمفتاح حساب الخدمة (RS256) يُبادَل برمز وصول من Google. الرمز يُخزَّن
 * ويُعاد استعماله حتى قبيل انتهائه، والطلبات المتزامنة تنتظر مبادلةً واحدة لا مبادلةً لكلٍّ منها.
 */
interface ServiceAccount { project_id: string; client_email: string; private_key: string; token_uri?: string }

const b64url = (b: Buffer | string) => Buffer.from(b).toString('base64url');
/** ثانية واحدة كهامش أمان قبل انتهاء الرمز — أرخص من نداء يفشل بـ401 في منتصف موجة إشعارات. */
const EXPIRY_MARGIN_MS = 60_000;

@Injectable()
export class FcmAdapter implements PushPort {
  private readonly log = new Logger('fcm');
  private readonly sa: ServiceAccount;
  private token: { value: string; expiresAt: number } | null = null;
  private inFlight: Promise<string> | null = null;

  constructor(config: AppConfig) {
    const raw = config.get('FCM_SERVICE_ACCOUNT_JSON');
    if (!raw) throw new Error('FCM_SERVICE_ACCOUNT_JSON مفقود — لا يمكن تشغيل الإشعارات الحقيقية بدونه.');
    // يُقبل الشكلان: JSON مباشرة، أو base64 لملف الحساب (أسهل في متغيّرات البيئة والأسرار).
    const text = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    // `JSON.parse` يضع مقطعاً من مُدخَله في نصّ خطئه — ومُدخَلُنا هنا مفتاحٌ خاص. فمفتاحٌ مشوّه
    // (سطرٌ ضاع في نسخٍ، أو base64 ناقص) كان يطبع مادّة المفتاح في سجلّ الإقلاع. لا نُمرّر السبب.
    let sa: ServiceAccount;
    try {
      sa = JSON.parse(text) as ServiceAccount;
    } catch {
      throw new Error('FCM_SERVICE_ACCOUNT_JSON غير صالح: ليس JSON سليماً (ولا base64 له).');
    }
    if (!sa.project_id || !sa.client_email || !sa.private_key) throw new Error('FCM_SERVICE_ACCOUNT_JSON ناقص: نحتاج project_id و client_email و private_key.');
    this.sa = sa;
  }

  /** رمز وصول صالح — من الذاكرة إن كان حياً، وإلا مبادلة واحدة يتشاركها كل المنتظرين. */
  private accessToken(): Promise<string> {
    const t = this.token;
    if (t && t.expiresAt - EXPIRY_MARGIN_MS > Date.now()) return Promise.resolve(t.value);
    return (this.inFlight ??= this.exchange().finally(() => { this.inFlight = null; }));
  }

  private async exchange(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const uri = this.sa.token_uri ?? 'https://oauth2.googleapis.com/token';
    const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claims = b64url(JSON.stringify({
      iss: this.sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: uri, iat: now, exp: now + 3600,
    }));
    const signer = createSign('RSA-SHA256'); signer.update(`${header}.${claims}`);
    const jwt = `${header}.${claims}.${b64url(signer.sign(this.sa.private_key))}`;

    const res = await fetch(uri, {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
    });
    if (!res.ok) throw new Error(`تعذّرت مبادلة رمز FCM (${res.status})`);
    const body = (await res.json()) as { access_token: string; expires_in: number };
    this.token = { value: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
    return body.access_token;
  }

  async send(m: PushMessage): Promise<{ ok: boolean; providerRef?: string; invalidToken?: boolean }> {
    let token: string;
    try { token = await this.accessToken(); }
    catch (e) { this.log.error(`فشلت المصادقة مع FCM: ${(e as Error).message}`); return { ok: false }; }

    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${this.sa.project_id}/messages:send`, {
      method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ message: buildMessage(m) }),
    }).catch((e: Error) => e);

    if (res instanceof Error) { this.log.warn(`تعذّر الوصول إلى FCM: ${res.message}`); return { ok: false }; }
    if (res.ok) {
      const body = (await res.json()) as { name?: string };
      return { ok: true, providerRef: body.name };
    }
    const text = await res.text().catch(() => '');
    const dead = isDeadToken(res.status, text);
    // الجهاز الميت ليس عطلاً — التطبيق حُذف أو أُعيد تنصيبه. يُقال مرة ويُنظَّف، لا يُصرخ كل مرة.
    if (dead) this.log.log('رمز جهاز لم يعد صالحاً — سيُزال');
    else this.log.warn(`رفض FCM (${res.status}): ${text.slice(0, 200)}`);
    return { ok: false, invalidToken: dead };
  }
}

/**
 * الرسالة: عنوان ونصّ مرئيان، ومعهما `data` تحمل الرابط العميق.
 *
 * و`priority: high` ليست تفصيلاً: بدونها يؤجّل أندرويد التسليم في وضع توفير الطاقة حتى تستيقظ
 * الشاشة — وطلبُ عميلٍ ينتظر لا يحتمل تأجيلاً. وiOS يحتاج `content-available` ليصل الـdata
 * والتطبيق في الخلفية.
 */
export function buildMessage(m: PushMessage) {
  const data = Object.fromEntries(Object.entries(m.data ?? {}).filter(([, v]) => v !== ''));
  return {
    token: m.token,
    notification: { title: m.title, body: m.body },
    data,
    android: { priority: 'HIGH', notification: { channel_id: 'sinaaty_requests', sound: 'default' } },
    apns: { headers: { 'apns-priority': '10' }, payload: { aps: { sound: 'default', 'content-available': 1 } } },
  };
}

/**
 * رمز ميت أم عطل مؤقّت؟ الفرق يقرّر: الميت يُحذف، والمؤقّت يُعاد إليه.
 * FCM يردّ UNREGISTERED حين حُذف التطبيق، وINVALID_ARGUMENT حين الرمز مشوّه — كلاهما لا يُصلحه
 * تكرار. أما 429 و5xx فانقطاعٌ عند Google لا خطأٌ في رمزنا.
 */
export function isDeadToken(status: number, body: string): boolean {
  if (status === 404) return true;                       // NOT_FOUND: الرمز لم يعد مسجّلاً
  if (status !== 400 && status !== 403) return false;
  return /UNREGISTERED|INVALID_ARGUMENT|SENDER_ID_MISMATCH/.test(body);
}
