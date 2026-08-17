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
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;
