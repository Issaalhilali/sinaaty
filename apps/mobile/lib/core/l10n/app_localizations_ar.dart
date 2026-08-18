// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Arabic (`ar`).
class L10nAr extends L10n {
  L10nAr([String locale = 'ar']) : super(locale);

  @override
  String get appName => 'صناعتي';

  @override
  String get tabMyCars => 'سياراتي';

  @override
  String get tabRequest => 'اطلب';

  @override
  String get tabWallet => 'محفظتي';

  @override
  String get tabAccount => 'حسابي';

  @override
  String get tabToday => 'اليوم';

  @override
  String get tabOrders => 'الأوامر';

  @override
  String get tabParts => 'القطع';

  @override
  String get tabRequests => 'طلبات';

  @override
  String get tabMySales => 'مبيعاتي';

  @override
  String get loginTitle => 'أهلاً بك في صناعتي';

  @override
  String get loginSubtitle => 'أدخل رقم جوالك لنرسل لك رمز التحقق';

  @override
  String get phoneLabel => 'رقم الجوال';

  @override
  String get phoneHint => '05xxxxxxxx';

  @override
  String get sendCode => 'أرسل الرمز';

  @override
  String get otpTitle => 'أدخل رمز التحقق';

  @override
  String otpSubtitle(String phone) {
    return 'أرسلنا رمزاً من 6 أرقام إلى $phone';
  }

  @override
  String get verify => 'تحقق';

  @override
  String get resendCode => 'إعادة الإرسال';

  @override
  String get loginWithNafath => 'الدخول عبر نفاذ';

  @override
  String get logout => 'تسجيل الخروج';

  @override
  String get errorGeneric => 'حدث خطأ غير متوقع، حاول مرة أخرى.';

  @override
  String get errorNetwork =>
      'لا يوجد اتصال بالإنترنت. تحقق من الشبكة وأعد المحاولة.';

  @override
  String get errorInvalidPhone => 'أدخل رقم جوال سعودي صحيح.';

  @override
  String get retry => 'أعد المحاولة';

  @override
  String get cancel => 'إلغاء';

  @override
  String get continueLabel => 'متابعة';

  @override
  String get emptyCarsTitle => 'لا توجد سيارات بعد';

  @override
  String get emptyCarsBody => 'أضف سيارتك برقم الهيكل أو اللوحة لتبدأ.';

  @override
  String get addCar => 'أضف سيارة';

  @override
  String get welcomeBack => 'أهلاً بعودتك';

  @override
  String get todayEmpty => 'لا توجد أوامر اليوم — أنشئ أول أمر إصلاح.';

  @override
  String get newWorkOrder => 'أمر عمل جديد';

  @override
  String get comingSoon => 'قريباً';

  @override
  String get activeOrders => 'أوامر الإصلاح الحالية';

  @override
  String get noActiveOrders => 'لا توجد أوامر إصلاح حالياً';

  @override
  String get myCars => 'سياراتي';

  @override
  String get vinLabel => 'رقم الهيكل (VIN)';

  @override
  String get plateLabel => 'رقم اللوحة';

  @override
  String get addCarTitle => 'أضف سيارتك';

  @override
  String get addCarSubtitle =>
      'أدخل رقم الهيكل (17 خانة) أو رقم اللوحة — سنتعرّف على السيارة تلقائياً.';

  @override
  String get addCarSubmit => 'إضافة السيارة';

  @override
  String get addCarNeedOne => 'أدخل رقم الهيكل أو رقم اللوحة.';

  @override
  String get carPassport => 'سجل السيارة';

  @override
  String get noPassportEvents =>
      'سيظهر هنا كل ما يحدث لسيارتك: صيانة، قطع، فحوصات.';

  @override
  String get odometer => 'العدّاد';

  @override
  String get km => 'كم';

  @override
  String get shareCarPassport => 'مشاركة سجل السيارة';

  @override
  String get workOrder => 'أمر إصلاح';

  @override
  String workOrderNumber(String number) {
    return 'أمر إصلاح $number';
  }

  @override
  String get timeline => 'المتابعة';

  @override
  String get photos => 'الصور';

  @override
  String photosCount(int count) {
    return '$count صور';
  }

  @override
  String get items => 'البنود';

  @override
  String get total => 'الإجمالي';

  @override
  String get vat => 'ضريبة القيمة المضافة 15%';

  @override
  String get subtotal => 'المجموع قبل الضريبة';

  @override
  String get approveNow => 'راجع واعتمد';

  @override
  String get approveTitle => 'اعتماد أمر الإصلاح';

  @override
  String get approveHint =>
      'توقيعك يثبّت هذا السعر — أي تعديل يصلك كنسخة جديدة.';

  @override
  String get approveWithNafath => 'اعتماد عبر نفاذ';

  @override
  String get approveWithOtp => 'اعتماد برمز التحقق';

  @override
  String get nafathPickNumber => 'افتح تطبيق نفاذ واختر الرقم';

  @override
  String get nafathWaiting => 'بانتظار موافقتك في نفاذ…';

  @override
  String get approved => 'تم الاعتماد — الورشة تبدأ العمل';

  @override
  String get declineOrder => 'لا أوافق';

  @override
  String get declineReason => 'سبب عدم الموافقة';

  @override
  String versionN(int n) {
    return 'النسخة $n';
  }

  @override
  String changeReason(String reason) {
    return 'سبب التعديل: $reason';
  }

  @override
  String get confirmReceipt => 'استلمت سيارتي';

  @override
  String get confirmReceiptHint => 'بتأكيدك يُحوَّل المبلغ المحفوظ للورشة.';

  @override
  String get payNow => 'ادفع الآن';

  @override
  String get payInvoice => 'دفع الفاتورة';

  @override
  String get invoice => 'فاتورة';

  @override
  String invoiceNumber(String number) {
    return 'فاتورة $number';
  }

  @override
  String get paid => 'مدفوعة';

  @override
  String get due => 'مستحقة';

  @override
  String dueOn(String date) {
    return 'تستحق في $date';
  }

  @override
  String get amountHeld => 'المبلغ محفوظ حتى تستلم سيارتك';

  @override
  String get payWithMada => 'مدى';

  @override
  String get payWithApplePay => 'Apple Pay';

  @override
  String get paymentDone => 'تم الدفع — شكراً لك';

  @override
  String get paymentFailed => 'لم يكتمل الدفع، حاول مرة أخرى.';

  @override
  String get paySheetTitle => 'اختر طريقة الدفع';

  @override
  String get invoices => 'الفواتير';

  @override
  String get notes => 'سندات لأمر';

  @override
  String get note => 'سند لأمر';

  @override
  String noteNumber(String number) {
    return 'سند $number';
  }

  @override
  String get outstanding => 'المتبقي';

  @override
  String get noteClosedHint => 'أُغلق السند وصدرت المخالصة';

  @override
  String get settlement => 'مخالصة';

  @override
  String get overdue => 'متأخر';

  @override
  String get noteHint =>
      'سند إلكتروني موثّق عبر نافذ — يُغلق تلقائياً عند سدادك.';

  @override
  String get walletEmptyTitle => 'لا توجد فواتير أو سندات';

  @override
  String get walletEmptyBody =>
      'ستظهر هنا فواتيرك ومدفوعاتك وسنداتك ومخالصاتك.';

  @override
  String get notifications => 'الإشعارات';

  @override
  String get notificationsEmpty => 'لا توجد إشعارات بعد';

  @override
  String get markAllRead => 'تعليم الكل كمقروء';

  @override
  String get language => 'اللغة';

  @override
  String get arabic => 'العربية';

  @override
  String get english => 'English';

  @override
  String get phone => 'الجوال';

  @override
  String get nafathVerifiedLabel => 'موثّق بنفاذ';

  @override
  String get notVerified => 'غير موثّق';

  @override
  String get requestSoonTitle => 'اطلب خدمة أو قطعة';

  @override
  String get requestSoonBody =>
      'قريباً: اطلب فحصاً، قطعة بالمزاد العكسي، أو سطحة — من هنا.';

  @override
  String get viewDocument => 'عرض المستند';

  @override
  String get viewInvoice => 'عرض الفاتورة';

  @override
  String get statusDraft => 'مسودة';

  @override
  String get statusReceived => 'تم الاستلام';

  @override
  String get statusInspecting => 'قيد الفحص';

  @override
  String get statusAwaitingApproval => 'بانتظار اعتمادك';

  @override
  String get statusApproved => 'معتمد';

  @override
  String get statusAwaitingParts => 'بانتظار القطع';

  @override
  String get statusInProgress => 'قيد التنفيذ';

  @override
  String get statusQualityCheck => 'فحص الجودة';

  @override
  String get statusReady => 'جاهزة للاستلام';

  @override
  String get statusDelivered => 'تم التسليم';

  @override
  String get statusClosed => 'مغلق';

  @override
  String get statusCancelled => 'ملغى';

  @override
  String get statusDisputed => 'نزاع';

  @override
  String get statusAbandoned => 'مهجورة';

  @override
  String get invStatusIssued => 'مستحقة';

  @override
  String get invStatusPaid => 'مدفوعة';

  @override
  String get invStatusPartiallyPaid => 'مدفوعة جزئياً';

  @override
  String get invStatusVoid => 'ملغاة';

  @override
  String get invStatusOverdue => 'متأخرة';

  @override
  String get invStatusRefunded => 'مستردّة';

  @override
  String get noteStatusIssued => 'ساري';

  @override
  String get noteStatusPartiallySettled => 'مسدد جزئياً';

  @override
  String get noteStatusClosed => 'مغلق';

  @override
  String get noteStatusInEnforcement => 'قيد التنفيذ';

  @override
  String get noteStatusCancelled => 'ملغى';

  @override
  String get noteStatusPending => 'بانتظار الإصدار';

  @override
  String get signedByNafath => 'موقّع بنفاذ';

  @override
  String get signedByOtp => 'موقّع برمز التحقق';

  @override
  String get securedByNote => 'مضمون بسند';

  @override
  String get termsPrepaid => 'دفع مقدّم';

  @override
  String get termsOnDelivery => 'الدفع عند الاستلام';

  @override
  String get termsDeferred => 'دفع آجل';

  @override
  String get termsInstallments => 'أقساط';

  @override
  String get termsFleetMonthly => 'كشف شهري';

  @override
  String get loading => 'جارٍ التحميل…';

  @override
  String get somethingWrong => 'تعذّر التحميل';

  @override
  String get noOrdersForCar => 'لا توجد أوامر إصلاح لهذه السيارة';

  @override
  String get checkIn => 'فحص الاستلام';

  @override
  String get checkOut => 'فحص التسليم';

  @override
  String damages(int count) {
    return '$count ملاحظات';
  }

  @override
  String get codeLabel => 'رمز التحقق';

  @override
  String get invalidCode => 'أدخل الرمز المكوّن من 6 أرقام';

  @override
  String payAmount(String amount) {
    return 'ادفع $amount';
  }

  @override
  String warrantyDays(int days) {
    return 'ضمان $days يوم';
  }

  @override
  String get nafathNumber => 'الرقم في نفاذ';

  @override
  String get approveDone => 'تم';

  @override
  String get payHint => 'الدفع آمن — يبقى المبلغ محفوظاً حتى تستلم سيارتك.';

  @override
  String clearanceIssued(String number) {
    return 'صدرت المخالصة $number';
  }

  @override
  String get confirmApproval => 'تأكيد الاعتماد';

  @override
  String get wsToday => 'اليوم';

  @override
  String get wsInShop => 'سيارات في الورشة';

  @override
  String get wsAwaitingCustomer => 'بانتظار اعتماد العميل';

  @override
  String get wsReadyToPayout => 'ر.س جاهز للتحويل';

  @override
  String get wsNeedsAction => 'يحتاج تصرّفك الآن';

  @override
  String get wsTodayCars => 'سيارات اليوم';

  @override
  String get wsAll => 'عرض الكل';

  @override
  String get wsNewOrder => 'أمر جديد';

  @override
  String get wsNoOrders => 'لا توجد أوامر بعد';

  @override
  String get wsNoOrdersBody =>
      'أنشئ أول أمر إصلاح: امسح اللوحة أو أدخل رقم الهيكل، أضف البنود، وأرسله للعميل.';

  @override
  String get wsStart => 'ابدأ العمل';

  @override
  String get wsReceive => 'استلام السيارة';

  @override
  String get wsInspect => 'فحص الاستلام';

  @override
  String get wsRequestApproval => 'أرسل للعميل للاعتماد';

  @override
  String get wsQuality => 'إلى فحص الجودة';

  @override
  String get wsReady => 'جاهزة للاستلام';

  @override
  String get wsDeliver => 'تم التسليم';

  @override
  String get wsIssueInvoice => 'إصدار الفاتورة';

  @override
  String get wsAddPhoto => 'أضف صورة';

  @override
  String get wsWaitingCustomer =>
      'بانتظار اعتماد العميل — لا يبدأ العمل قبل موافقته';

  @override
  String get wsCustomerPhone => 'جوال العميل';

  @override
  String get wsTitle => 'وصف مختصر للعمل';

  @override
  String get wsTitleHint => 'مثال: سمكرة رفرف أمامي';

  @override
  String get wsItems => 'البنود';

  @override
  String get wsAddItem => 'أضف بنداً';

  @override
  String get wsItemDesc => 'الوصف';

  @override
  String get wsItemPrice => 'السعر';

  @override
  String get wsItemQty => 'الكمية';

  @override
  String get wsLabor => 'أجور';

  @override
  String get wsPart => 'قطعة';

  @override
  String get wsWarranty => 'ضمان (أيام)';

  @override
  String get wsPaymentTerms => 'شروط الدفع';

  @override
  String get wsCreate => 'إنشاء الأمر';

  @override
  String get wsEstimate => 'التقدير';

  @override
  String get wsAngles => '8 زوايا';

  @override
  String wsAngleOf(int done, int total) {
    return '$done / $total';
  }

  @override
  String get wsShootNext => 'صوّر الزاوية التالية';

  @override
  String get wsSubmitInspection => 'حفظ فحص الاستلام';

  @override
  String get wsDamages => 'ملاحظات الهيكل';

  @override
  String get wsAddDamage => 'أضف ملاحظة';

  @override
  String get wsFuel => 'الوقود %';

  @override
  String get wsZone => 'الموضع';

  @override
  String get wsSeverity => 'الشدة';

  @override
  String get wsMinor => 'بسيط';

  @override
  String get wsModerate => 'متوسط';

  @override
  String get wsSevere => 'شديد';

  @override
  String get wsOffline => 'بلا إنترنت — سيُرسل تلقائياً عند عودة الاتصال';

  @override
  String wsPendingSync(int count) {
    return '$count إجراء بانتظار المزامنة';
  }

  @override
  String get wsSynced => 'تمت المزامنة';

  @override
  String get wsWalletHeld => 'محفوظ حتى تأكيد العملاء';

  @override
  String get wsWalletAvailable => 'متاح للتحويل';

  @override
  String get wsWalletTransit => 'قيد التحويل للبنك';

  @override
  String get wsPayouts => 'التحويلات';

  @override
  String get wsNoPayouts =>
      'لا توجد تحويلات بعد — تُجدول تلقائياً عند توفّر رصيد.';

  @override
  String get wsPartsSoon => 'قطع لهذه السيارة';

  @override
  String get wsPartsSoonBody =>
      'قريباً: ابحث برقم الهيكل، اشترِ من الوكلاء بحساب آجل مضمون، أو افتح مزاداً على التشاليح.';

  @override
  String get wsOrders => 'الأوامر';

  @override
  String get wsActive => 'الحالية';

  @override
  String get wsDone => 'المنتهية';

  @override
  String get wsAngleFront => 'أمام';

  @override
  String get wsAngleFrontRight => 'أمام يمين';

  @override
  String get wsAngleRight => 'يمين';

  @override
  String get wsAngleRearRight => 'خلف يمين';

  @override
  String get wsAngleRear => 'خلف';

  @override
  String get wsAngleRearLeft => 'خلف يسار';

  @override
  String get wsAngleLeft => 'يسار';

  @override
  String get wsAngleFrontLeft => 'أمام يسار';

  @override
  String get wsCustomer => 'العميل';

  @override
  String get wsPhotoAdded => 'أُضيفت الصورة';

  @override
  String wsInvoiceIssued(String number) {
    return 'صدرت الفاتورة $number';
  }

  @override
  String get wsCustomerApprovedHint =>
      'اعتمد العميل — ابدأ العمل وارفع أول صورة.';
}
