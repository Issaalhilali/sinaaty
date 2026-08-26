import { buildMessage, isDeadToken } from '../infrastructure/channels/fcm.adapter';

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
