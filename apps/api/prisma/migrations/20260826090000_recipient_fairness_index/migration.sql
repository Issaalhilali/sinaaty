-- القسمة العادلة تسأل في كل طلب: «متى وصل هذه المنشأةَ طلبٌ آخر مرة؟» — والمفتاح الأساسي
-- (request_id, org_id) لا يخدم بحثاً بـ org_id وحده، فيصير مسحاً كاملاً للجدول في مسارٍ حار
-- يُنفَّذ عند إنشاء كل طلب. النزول (DESC) لأن السؤال دائماً عن الأحدث.
CREATE INDEX IF NOT EXISTS idx_service_request_recipients_org
  ON service_request_recipients(org_id, notified_at DESC);
