import { TEMPLATES } from '../domain/templates';

/**
 * ثلاثة قوالب كانت تُنزل صاحب الورشة على شاشة العميل — بلا الزرّ الذي وُجد الإشعار لأجله:
 * «عميل قريب يحتاج إصلاحاً» و«العميل اعتمد الأمر — ابدأ التنفيذ» و«قُبل عرضك». لم يسقط أي
 * اختبار لأن الرابط سليم الشكل والشاشة موجودة — الخطأ في **الجمهور** لا في الصياغة.
 *
 * القوالب التي يستقبلها طاقم المنشأة (لا العميل) يجب أن تقصد مسار المزوّد.
 */
const PROVIDER_TEMPLATES = ['service.request.nearby', 'service.offer.accepted', 'wo.approved', 'escrow.released', 'part.request.nearby', 'invoice.paid', 'note.issued.creditor'];
/** مسارات العميل — لا يجوز أن يُرسَل إليها مزوّد. */
const CUSTOMER_ONLY = [/^sinaaty:\/\/work-orders\//, /^sinaaty:\/\/service-requests\//];

describe('الروابط العميقة تتبع جمهور القالب', () => {
  it.each(PROVIDER_TEMPLATES)('%s لا يقصد شاشة العميل', (code) => {
    const link = TEMPLATES[code]?.deepLink;
    expect(link).toBeDefined();
    for (const re of CUSTOMER_ONLY) expect(link).not.toMatch(re);
  });

  it('كل رابط يبدأ بمخطّط التطبيق — لا رابط ويب يفتح متصفّحاً', () => {
    for (const t of Object.values(TEMPLATES)) if (t.deepLink) expect(t.deepLink).toMatch(/^sinaaty:\/\//);
  });

  it('لا وسيط غير مُستبدَل يتسرّب إلى الرابط', () => {
    // `{id}` يُستبدل عند العرض؛ اسمٌ غيره يعني وسيطاً لا يمرّره المعالج فيصل حرفياً للجهاز.
    const known = /\{(id|wo_id|job_id|token)\}/g;
    for (const t of Object.values(TEMPLATES)) {
      if (!t.deepLink) continue;
      expect(t.deepLink.replace(known, '')).not.toMatch(/[{}]/);
    }
  });
});
