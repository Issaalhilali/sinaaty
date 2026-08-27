import { FcmAdapter, buildMessage, isDeadToken } from '../infrastructure/channels/fcm.adapter';

describe('FCM — تمييز الرمز الميت', () => {
  it('الميت يُحذف: التطبيق حُذف أو الرمز مشوّه', () => {
    expect(isDeadToken(404, '')).toBe(true);                                    // NOT_FOUND
    expect(isDeadToken(400, '{"error":{"status":"INVALID_ARGUMENT"}}')).toBe(true);
    expect(isDeadToken(403, '{"error":{"status":"SENDER_ID_MISMATCH"}}')).toBe(true);
    expect(isDeadToken(404, '{"error":{"status":"UNREGISTERED"}}')).toBe(true);
  });

  it('العطل المؤقّت لا يُحذف — وإلا فقدنا أجهزة سليمة لانقطاعٍ عند Google', () => {
    expect(isDeadToken(429, 'RESOURCE_EXHAUSTED')).toBe(false);                 // تجاوز حدّ
    expect(isDeadToken(500, 'INTERNAL')).toBe(false);
    expect(isDeadToken(503, 'UNAVAILABLE')).toBe(false);
    expect(isDeadToken(401, 'UNAUTHENTICATED')).toBe(false);                    // رمز وصولنا نحن لا رمز الجهاز
  });
});

describe('FCM — شكل الرسالة', () => {
  const m = { token: 'dev-token', title: 'عميل قريب يحتاج إصلاحاً', body: 'على بعد 2.4 كم', data: { deep_link: 'sinaaty://service-requests/x', template: 'service.request.nearby' } };

  it('أولوية عالية على المنصّتين — الطلب المنتظر لا يحتمل تأجيل توفير الطاقة', () => {
    const out = buildMessage(m);
    expect(out.android.priority).toBe('HIGH');
    expect(out.apns.headers['apns-priority']).toBe('10');
    expect(out.apns.payload.aps['content-available']).toBe(1);                  // تصل الـdata والتطبيق في الخلفية
  });

  it('الرابط العميق يسافر مع الإشعار — بلا نداء ثانٍ عند الفتح', () => {
    expect(buildMessage(m).data['deep_link']).toBe('sinaaty://service-requests/x');
  });

  it('الحقول الفارغة تُسقط: FCM يرفض القيم الفارغة ويردّ الرسالة كلها', () => {
    const out = buildMessage({ ...m, data: { deep_link: '', template: 'x' } });
    expect(out.data).not.toHaveProperty('deep_link');
    expect(out.data['template']).toBe('x');
  });
});

describe('FCM — المفتاح لا يتسرّب إلى السجلّ', () => {
  // `JSON.parse` يضع مقطعاً من مُدخَله في نصّ خطئه، ومُدخَلُنا مفتاحٌ خاص: مفتاحٌ مشوّه كان
  // يطبع مادّته في سجلّ الإقلاع — وهو أسوأ مكان، لأنه يُجمَع ويُرسَل ويبقى.
  const SECRET = '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhk1TOP5ECRET\n-----END PRIVATE KEY-----';
  const make = (raw: string) => new FcmAdapter({ get: () => raw } as never);

  it('المفتاح المشوّه يُرفض بلا ذكرٍ لمادّته', () => {
    const broken = `{"project_id":"p","client_email":"e","private_key":"${SECRET}"`;   // قوسٌ ناقص
    expect(() => make(broken)).toThrow(/غير صالح/);
    try { make(broken); } catch (e) { expect(String((e as Error).message)).not.toContain('PRIVATE KEY'); }
  });

  it('والناقص كذلك: يُسمّى الحقل الغائب لا القيمة الحاضرة', () => {
    const noEmail = JSON.stringify({ project_id: 'p', private_key: SECRET });
    expect(() => make(noEmail)).toThrow(/ناقص/);
    try { make(noEmail); } catch (e) { expect(String((e as Error).message)).not.toContain('PRIVATE KEY'); }
  });
});
