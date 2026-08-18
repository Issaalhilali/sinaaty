/**
 * Central catalogue of API error codes with bilingual messages.
 * Every thrown AppError references one of these; new modules append their own codes here
 * (prefix by module: WO_, INV_, PAY_, PN_, ...).
 */
export const ERROR_CODES = {
  INTERNAL: { status: 500, ar: 'حدث خطأ غير متوقع، حاول مرة أخرى.', en: 'Unexpected error, please try again.' },
  VALIDATION: { status: 400, ar: 'البيانات المدخلة غير صحيحة.', en: 'Invalid input.' },
  NOT_FOUND: { status: 404, ar: 'العنصر المطلوب غير موجود.', en: 'Resource not found.' },
  UNAUTHORIZED: { status: 401, ar: 'يلزم تسجيل الدخول.', en: 'Authentication required.' },
  FORBIDDEN: { status: 403, ar: 'ليست لديك صلاحية لهذا الإجراء.', en: 'You are not allowed to do this.' },
  CONFLICT: { status: 409, ar: 'تعارض مع الحالة الحالية.', en: 'Conflict with current state.' },
  RATE_LIMITED: { status: 429, ar: 'طلبات كثيرة، انتظر قليلاً ثم أعد المحاولة.', en: 'Too many requests, slow down.' },
  SERVICE_UNAVAILABLE: { status: 503, ar: 'الخدمة غير متاحة مؤقتاً.', en: 'Service temporarily unavailable.' },
  // ---- identity ----
  OTP_INVALID: { status: 400, ar: 'رمز التحقق غير صحيح.', en: 'Incorrect verification code.' },
  OTP_EXPIRED: { status: 400, ar: 'انتهت صلاحية رمز التحقق، اطلب رمزاً جديداً.', en: 'Code expired, request a new one.' },
  OTP_TOO_MANY: { status: 429, ar: 'محاولات كثيرة، انتظر قليلاً ثم أعد المحاولة.', en: 'Too many attempts, try again later.' },
  NAFATH_PENDING: { status: 409, ar: 'بانتظار موافقتك في تطبيق نفاذ.', en: 'Waiting for your approval in the Nafath app.' },
  NAFATH_REJECTED: { status: 400, ar: 'تم رفض الطلب في نفاذ أو انتهت مهلته.', en: 'Nafath request was rejected or expired.' },
  NAFATH_NOT_FOUND: { status: 404, ar: 'طلب نفاذ غير موجود.', en: 'Nafath transaction not found.' },
  TOKEN_INVALID: { status: 401, ar: 'انتهت الجلسة، سجّل الدخول مجدداً.', en: 'Session expired, please sign in again.' },
  TOKEN_REUSED: { status: 401, ar: 'تم اكتشاف استخدام غير آمن للجلسة؛ سجّل الدخول مجدداً.', en: 'Suspicious session reuse detected; please sign in again.' },
  // ---- invoicing ----
  INV_WO_NOT_INVOICEABLE: { status: 409, ar: 'لا يمكن إصدار فاتورة قبل جاهزية المركبة واعتماد العميل.', en: 'Work order must be approved and ready/delivered before invoicing.' },
  INV_ALREADY_ISSUED: { status: 409, ar: 'توجد فاتورة سارية لهذا الأمر.', en: 'An active invoice already exists for this work order.' },
  INV_NOT_VOIDABLE: { status: 409, ar: 'لا يمكن إلغاء فاتورة مدفوعة — أصدر إشعار دائن.', en: 'Paid invoices cannot be voided — issue a credit note.' },
  // ---- payments / escrow ----
  PAY_INVOICE_NOT_PAYABLE: { status: 409, ar: 'الفاتورة غير قابلة للدفع (ملغاة أو مدفوعة).', en: 'Invoice is not payable (void or already paid).' },
  PAY_INTENT_PENDING: { status: 409, ar: 'توجد عملية دفع قيد التنفيذ لهذه الفاتورة.', en: 'A payment is already in progress for this invoice.' },
  PAY_WEBHOOK_INVALID: { status: 401, ar: 'توقيع الإشعار غير صالح.', en: 'Invalid webhook signature.' },
  ESCROW_NOT_RELEASABLE: { status: 409, ar: 'المبلغ غير قابل للإفراج في حالته الحالية.', en: 'Escrow hold is not releasable in its current state.' },
  ESCROW_FROZEN: { status: 409, ar: 'المبلغ مجمّد بسبب نزاع.', en: 'Escrow hold is frozen due to a dispute.' },
  // ---- promissory notes ----
  PN_NOT_OPEN: { status: 409, ar: 'السند غير مفتوح.', en: 'Promissory note is not open.' },
  PN_NOT_OVERDUE: { status: 409, ar: 'لا يمكن التحويل للتنفيذ قبل تاريخ الاستحقاق والإشعار الرسمي.', en: 'Enforcement requires an overdue note with a formal notice sent.' },
  USER_SUSPENDED: { status: 403, ar: 'الحساب موقوف، تواصل مع الدعم.', en: 'Account suspended, contact support.' },
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;
