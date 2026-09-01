// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Arabic (`ar`).
class L10nAr extends L10n {
  L10nAr([String locale = 'ar']) : super(locale);

  @override
  String get appName => 'صناعية';

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
  String get loginTitle => 'ادخل بجوالك';

  @override
  String get loginSubtitle => 'نرسل لك رمز تحقق لمرة واحدة';

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
  String get addYourName => 'أضف اسمك';

  @override
  String get editName => 'تعديل الاسم';

  @override
  String get yourName => 'الاسم الكامل';

  @override
  String get save => 'حفظ';

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
  String get servicesTitle => 'ماذا تحتاج؟';

  @override
  String get emptyCarsServices => 'وهذا ما نقدّمه لك:';

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
      'رقم الهيكل يعرّف سيارتك بنوعها وموديلها. وتكفي اللوحة وحدها للبدء — بأي ترتيب: «أ ب ج 1234» أو «1234 أ ب ج».';

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
  String get amountHeld => 'المبلغ محفوظ';

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
  String get notificationsEmptyBody =>
      'كل ما يخص سياراتك وفواتيرك وضماناتك سيصلك هنا أولاً بأول.';

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
  String get approveNotPending =>
      'لا يوجد ما يتطلب اعتمادك في هذا الأمر الآن — حالته موضحة أعلاه.';

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
  String get wsNoDamages =>
      'لا ملاحظات على الهيكل بعد — سجّل أي خدش أو ضرر قبل بدء العمل؛ يحميك ويحمي العميل.';

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
  String get wsPartsSearchHint =>
      'أدخل رقم الهيكل في الأعلى لترى القطع المتوفرة لسيارتك بأسعارها الحية.';

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

  @override
  String get ptParts => 'القطع';

  @override
  String get ptSearchByVin => 'ابحث برقم الهيكل';

  @override
  String get ptVinHint => '17 خانة';

  @override
  String get ptOffers => 'عروض مطابقة لهذه السيارة';

  @override
  String get ptNoOffers =>
      'لا توجد قطع مطابقة الآن — افتح مزاداً ليصلك عرض من التشاليح والمحلات القريبة.';

  @override
  String get ptOpenAuction => 'اطلب بالمزاد العكسي';

  @override
  String get ptBuyNow => 'اشترِ الآن';

  @override
  String get ptTradePrice => 'سعر الورش';

  @override
  String get ptRetailPrice => 'سعر التجزئة';

  @override
  String get ptGenuineQr => 'QR أصالة';

  @override
  String ptLeadHours(int h) {
    return 'يصل خلال $h س';
  }

  @override
  String get ptCondOem => 'أصلي وكالة';

  @override
  String get ptCondAftermarket => 'بديل معتمد';

  @override
  String get ptCondUsed => 'مستعمل تشليح';

  @override
  String get ptCondRefurb => 'مجدَّد';

  @override
  String get ptQty => 'الكمية';

  @override
  String get ptTermsPrepaid => 'دفع الآن — المبلغ محفوظ حتى تستلم';

  @override
  String get ptTermsDeferred => 'آجل على الحساب المضمون — يصدر سند لأمر';

  @override
  String get ptOrderPlaced => 'تم الطلب';

  @override
  String get ptMyRequests => 'طلباتي بالمزاد';

  @override
  String get ptMyOrders => 'طلبات القطع';

  @override
  String get ptPartName => 'اسم القطعة';

  @override
  String get ptPartNameHint => 'مثال: دسكات أمامية';

  @override
  String get ptAcceptedConditions => 'الحالات المقبولة';

  @override
  String get ptBiddingMinutes => 'مدة المزاد (دقيقة)';

  @override
  String get ptSend => 'أرسل الطلب';

  @override
  String get ptBids => 'العروض';

  @override
  String ptBidsCount(int n) {
    return '$n عروض';
  }

  @override
  String get ptLowest => 'أقل عرض';

  @override
  String ptEndsIn(int m) {
    return 'ينتهي خلال $m د';
  }

  @override
  String ptEndsInHours(int h) {
    return 'ينتهي خلال $h ساعة';
  }

  @override
  String ptEndsInDays(int d) {
    return 'ينتهي خلال $d يوم';
  }

  @override
  String get ptEnded => 'انتهى';

  @override
  String get ptAcceptBid => 'اقبل هذا العرض';

  @override
  String get ptAccepted => 'تم القبول — أُنشئ طلب الشراء';

  @override
  String get ptNoBidsYet => 'لم تصل عروض بعد — ننبّه المورّدين القريبين.';

  @override
  String get ptTradeAccount => 'الحساب الآجل المضمون';

  @override
  String get ptTradeAvailable => 'المتاح';

  @override
  String get ptTradeOutstanding => 'القائم';

  @override
  String get ptTradeLimit => 'الحد';

  @override
  String get ptRequestTrade => 'اطلب حساباً آجلاً';

  @override
  String get ptTradePending => 'بانتظار موافقة المورّد';

  @override
  String get ptScanQr => 'امسح QR القطعة';

  @override
  String get ptScanHint => 'وجّه الكاميرا نحو ملصق QR على القطعة الأصلية';

  @override
  String get ptVerifyGenuine => 'قطعة أصلية موثّقة';

  @override
  String get ptVerifyFake => 'غير موثّقة';

  @override
  String get ptVerifyAlert => 'تنبيه: مسح متكرر';

  @override
  String get ptInstallOn => 'ركّبها في أمر العمل';

  @override
  String get ptChooseItem => 'اختر بند القطعة';

  @override
  String get ptInstalled => 'تم التركيب — صدر ضمان القطعة + التركيب';

  @override
  String get ptLaborWarranty => 'ضمان التركيب (أيام)';

  @override
  String get ptWarranties => 'الضمانات';

  @override
  String get ptWarrantyPart => 'قطعة';

  @override
  String get ptWarrantyLabor => 'تركيب';

  @override
  String get ptWarrantyBoth => 'قطعة + تركيب';

  @override
  String ptValidUntil(String date) {
    return 'ساري حتى $date';
  }

  @override
  String get ptExpired => 'منتهٍ';

  @override
  String get spRequests => 'طلبات';

  @override
  String get spSales => 'مبيعاتي';

  @override
  String get spIncoming => 'طلبات قريبة منك';

  @override
  String get spNoRequests =>
      'لا توجد طلبات الآن — ستصلك إشعارات عند وجود طلب قريب يناسب قطعك.';

  @override
  String get spHot => 'الأقرب للانتهاء';

  @override
  String get spBid => 'قدّم عرضك';

  @override
  String get spYourBid => 'عرضك';

  @override
  String get spUpdateBid => 'عدّل عرضك';

  @override
  String get spPrice => 'سعرك';

  @override
  String get spEta => 'التسليم خلال (ساعات)';

  @override
  String get spWarrantyDays => 'ضمان (أيام)';

  @override
  String get spNotes => 'ملاحظات';

  @override
  String get spBidSent => 'أُرسل عرضك — سنخبرك عند القبول';

  @override
  String get spWon => 'قُبل عرضك';

  @override
  String get spNoRequestsBody =>
      'ستصلك إشعارات فور وجود طلب قريب يناسب قطعك — لا حاجة للمتابعة اليدوية.';

  @override
  String get spLost => 'لم يُقبل';

  @override
  String get spOrdersToFulfil => 'طلبات للتجهيز';

  @override
  String get spPreparing => 'جهّز';

  @override
  String get spShip => 'شُحن';

  @override
  String get spDeliver => 'تم التسليم';

  @override
  String get spDelivered => 'مُسلَّم';

  @override
  String get spTradeAccounts => 'حسابات آجلة';

  @override
  String get spApprove => 'اعتمد الحساب';

  @override
  String get spCreditLimit => 'الحد الائتماني';

  @override
  String get spTermsDays => 'مدة السداد (أيام)';

  @override
  String get spInventory => 'المخزون';

  @override
  String spItems(int n) {
    return '$n صنف';
  }

  @override
  String get spSerials => 'أرقام QR';

  @override
  String get spIssueSerials => 'أصدر دفعة QR';

  @override
  String spSerialsIssued(int n, String batch) {
    return 'صدرت $n أرقام — دفعة $batch';
  }

  @override
  String get spCatalogId => 'معرّف القطعة في الكتالوج';

  @override
  String get spCount => 'العدد';

  @override
  String get spAwaitingPayment => 'بانتظار الدفع';

  @override
  String get spPaid => 'مدفوع';

  @override
  String get spConfirmed => 'مؤكَّد';

  @override
  String get spCancelled => 'ملغى';

  @override
  String get spDisputed => 'نزاع';

  @override
  String get spReturned => 'مرتجع';

  @override
  String get spNoOrders => 'لا توجد طلبات بعد';

  @override
  String get spNoTrade =>
      'لا توجد حسابات آجلة — تأتي طلبات الورش هنا للاعتماد.';

  @override
  String get spBeFirst => 'لا عروض بعد — كن الأول';

  @override
  String get reqHubTitle => 'كيف نساعدك؟';

  @override
  String get reqHubBody => 'اختر ما تحتاجه الآن — نتكفّل بالباقي.';

  @override
  String get reqPart => 'أطلب قطعة غيار';

  @override
  String get reqPartBody =>
      'نرسل طلبك للورش والتشاليح والوكلاء، وتختار أنت أفضل عرض.';

  @override
  String get reqTow => 'أطلب سطحة';

  @override
  String get reqTowBody => 'نقل سيارتك إلى الورشة بسعر معروف مسبقاً.';

  @override
  String get reqMyRequests => 'طلبات القطع';

  @override
  String get reqMyTows => 'طلبات السطحة';

  @override
  String get reqPartVehicle => 'السيارة';

  @override
  String get reqPartAnyVehicle => 'بدون تحديد سيارة';

  @override
  String get reqPartSend => 'أرسل الطلب';

  @override
  String get towTitle => 'سطحة';

  @override
  String get towRequestAction => 'أطلب السطحة';

  @override
  String get towRequested => 'أرسلنا طلبك — سيصلك السائق قريباً.';

  @override
  String get towNoHiddenFees => 'سعر واضح مسبقاً';

  @override
  String get towQuoteHint => 'حدّد موقع سيارتك والوجهة ليظهر السعر.';

  @override
  String get towCalculating => 'نحسب السعر…';

  @override
  String towQuoteLine(String km, int minutes) {
    return '$km كم · وصول خلال $minutes دقيقة تقريباً';
  }

  @override
  String get towVehicle => 'سيارتك';

  @override
  String get towNoVehicle => 'بدون تحديد سيارة';

  @override
  String get towFrom => 'من أين؟';

  @override
  String get towTo => 'إلى أين؟';

  @override
  String get towPickupAddress => 'وصف الموقع';

  @override
  String get towPickupHint => 'مثال: طريق الملك فهد، بعد مخرج 12';

  @override
  String get towDropoffAddress => 'وصف الوجهة';

  @override
  String get towDropoffHint => 'مثال: ورشة النور — الصناعية الثانية';

  @override
  String get towLocationLink => 'رابط الموقع أو الإحداثيات';

  @override
  String get towLinkHelp => 'الصق رابط الموقع من الخرائط، أو اكتب الإحداثيات.';

  @override
  String get towLinkUnreadable =>
      'لم نتمكن من قراءة الموقع — الصق الرابط الكامل أو الإحداثيات.';

  @override
  String get towTruckType => 'نوع السطحة';

  @override
  String get towTypeFlatbed => 'سطحة عادية';

  @override
  String get towTypeWheelLift => 'رافعة عجلات';

  @override
  String get towTypeHeavy => 'سطحة ثقيلة';

  @override
  String get towNotes => 'ملاحظات';

  @override
  String get towNotesHint => 'مثال: السيارة لا تدور';

  @override
  String get towProgress => 'مسار الطلب';

  @override
  String get towRoute => 'المسار';

  @override
  String get towDriver => 'السائق';

  @override
  String towEta(int minutes) {
    return '$minutes دقيقة';
  }

  @override
  String towKm(String km) {
    return '$km كم';
  }

  @override
  String get towRequestedAt => 'وقت الطلب';

  @override
  String get towCancelTitle => 'إلغاء طلب السطحة';

  @override
  String get towCancelBody => 'يمكن الإلغاء قبل تحميل السيارة فقط.';

  @override
  String get towCancelReason => 'السبب (اختياري)';

  @override
  String get towCancelAction => 'إلغاء الطلب';

  @override
  String get towStatusRequested => 'بانتظار سائق';

  @override
  String get towStatusSearching => 'نبحث عن أقرب سطحة';

  @override
  String get towStatusAssigned => 'تم تعيين سائق';

  @override
  String get towStatusEnRoutePickup => 'السائق في طريقه إليك';

  @override
  String get towStatusPickedUp => 'سيارتك على السطحة';

  @override
  String get towStatusEnRouteDropoff => 'في الطريق إلى الوجهة';

  @override
  String get towStatusDelivered => 'تم التسليم';

  @override
  String get towStatusCompleted => 'اكتمل';

  @override
  String get towStatusCancelled => 'ملغى';

  @override
  String get towStatusFailed => 'تعذّر التنفيذ';

  @override
  String get towEmptyTitle => 'لا توجد طلبات سطحة';

  @override
  String get towEmptyBody => 'اطلب سطحة عندما تحتاج نقل سيارتك.';

  @override
  String get ptCheapest => 'الأرخص';

  @override
  String get ptFastest => 'الأسرع';

  @override
  String get ptLongestWarranty => 'أطول ضمان';

  @override
  String get ptWarrantiesEmptyTitle => 'لا توجد ضمانات بعد';

  @override
  String get ptWarrantiesEmptyBody =>
      'كل قطعة تُركّب لك عبر صناعية تصلك بضمان رقمي هنا.';

  @override
  String get ptWarrantyActive => 'ساري';

  @override
  String get ptWarrantyIssuer => 'الجهة الضامنة';

  @override
  String get ptWarrantyFrom => 'يبدأ';

  @override
  String get ptWarrantyNumber => 'رقم الضمان';

  @override
  String get diffTitle => 'مقارنة حالة السيارة';

  @override
  String get diffSub => 'قبل الإصلاح وبعده — بالصور';

  @override
  String get diffOpen => 'قارن حالة السيارة';

  @override
  String get diffCleanTitle => 'سيارتك كما استلمناها';

  @override
  String get diffWaiting => 'بانتظار فحص التسليم للمقارنة.';

  @override
  String get diffAppeared => 'ظهر بعد الاستلام';

  @override
  String get diffWorsened => 'ازداد سوءاً';

  @override
  String get diffRepaired => 'تم إصلاحه';

  @override
  String get diffUnchanged => 'كما كان عند الاستلام';

  @override
  String get diffCheckIn => 'صور الاستلام';

  @override
  String get diffCheckOut => 'صور التسليم';

  @override
  String get diffAiSuggested => 'رصد آلي';

  @override
  String get sevMinor => 'بسيط';

  @override
  String get sevModerate => 'متوسط';

  @override
  String get sevSevere => 'شديد';

  @override
  String diffFromTo(String from, String to) {
    return 'من $from إلى $to';
  }

  @override
  String get flToday => 'أسطولك اليوم';

  @override
  String get flVehicles => 'مركبة';

  @override
  String get flOpenRepairs => 'إصلاح مفتوح';

  @override
  String get flAwaiting => 'بانتظار قرارك';

  @override
  String get flMonthSpend => 'التزام هذا الشهر';

  @override
  String flBudgetLeft(String amount) {
    return 'المتبقي من الميزانية $amount';
  }

  @override
  String get flNoPolicy => 'لا توجد سياسة صرف — كل إصلاح يحتاج اعتمادك.';

  @override
  String flPolicyLine(String name, String auto) {
    return 'سياسة «$name»: اعتماد تلقائي تحت $auto';
  }

  @override
  String get flInboxTitle => 'بانتظار قرارك';

  @override
  String get flInboxEmpty => 'لا يوجد ما ينتظر قرارك';

  @override
  String get flInboxEmptyBody =>
      'كل الإصلاحات إما معتمدة أو تحت حد الاعتماد التلقائي.';

  @override
  String get flNeedsOne => 'يحتاج اعتماداً واحداً';

  @override
  String get flNeedsTwo => 'يحتاج اعتماد شخصين';

  @override
  String get flAutoOk => 'تحت الحد — جاهز للتوقيع';

  @override
  String get flBlockedWorkshop => 'الورشة خارج القائمة المعتمدة';

  @override
  String get flOverBudget => 'يتجاوز ميزانية الشهر';

  @override
  String flApprovedBy(String name) {
    return 'اعتمده $name';
  }

  @override
  String flRejectedBy(String name) {
    return 'رفضه $name';
  }

  @override
  String get flApprove => 'أوافق على الصرف';

  @override
  String get flReject => 'أرفض';

  @override
  String get flDecisionNote => 'ملاحظة (اختياري)';

  @override
  String get flDecisionHint =>
      'قرارك يُسجَّل باسمك. التوقيع النهائي خطوة مستقلة عبر نفاذ أو رمز التحقق.';

  @override
  String get flReadyToSign => 'اكتمل الاعتماد — وقّع الآن';

  @override
  String get flDecided => 'سُجّل قرارك';

  @override
  String get flRejectedDone => 'سُجّل الرفض — لن يبدأ العمل';

  @override
  String get accTitle => 'تقرير الحادث';

  @override
  String get accSub => 'ملف التأمين المرتبط بهذا الإصلاح';

  @override
  String get accOpen => 'تقرير الحادث';

  @override
  String get accLookupLabel => 'رقم بلاغ الحادث';

  @override
  String get accLookupHint => 'مثال: ACC-2026-000123';

  @override
  String get accLookup => 'استعلام';

  @override
  String get accNotLinked => 'لا يوجد تقرير مرتبط';

  @override
  String get accNotLinkedBody =>
      'استعلم برقم البلاغ لدى شركة التأمين ثم اربطه بهذا الأمر.';

  @override
  String get accLink => 'اربط بهذا الأمر';

  @override
  String get accLinked => 'رُبط التقرير بالأمر';

  @override
  String get accInsurer => 'شركة التأمين';

  @override
  String get accClaimNo => 'رقم المطالبة';

  @override
  String get accApproved => 'اعتمده التأمين';

  @override
  String get accDeductible => 'التحمّل';

  @override
  String get accFault => 'نسبة الخطأ';

  @override
  String get accCustomerPays => 'المتوقع على العميل';

  @override
  String get accDamages => 'أضرار المُقيِّم';

  @override
  String get accSuggested => 'بنود مقترحة لأمر العمل';

  @override
  String get accSuggestedHint =>
      'من تقرير المُقيِّم — راجعها وسعّرها بنفسك ثم أضفها.';

  @override
  String get accNotPriced => 'الملف قيد التقييم — لا مبالغ بعد. حدّث لاحقاً.';

  @override
  String get accSubmitRepair => 'سجّل تقرير الإصلاح لدى الجهة';

  @override
  String get accSubmitted => 'سُجّل تقرير الإصلاح';

  @override
  String accSubmittedRef(String ref) {
    return 'مرجع التسجيل $ref';
  }

  @override
  String accCoverage(String amount) {
    return 'التأمين يغطي $amount';
  }

  @override
  String get accActRepair => 'إصلاح';

  @override
  String get accActReplace => 'استبدال';

  @override
  String get accActPaint => 'سمكرة ودهان';

  @override
  String get towVatIncluded => 'شامل الضريبة';

  @override
  String get dsTitle => 'نزاع';

  @override
  String get dsOpen => 'فتح نزاع';

  @override
  String get dsActive => 'نزاع مفتوح على هذا الطلب';

  @override
  String get dsView => 'عرض النزاع';

  @override
  String get dsMoneyHeld => 'المبلغ محفوظ حتى يُحل النزاع';

  @override
  String get dsPlatformDecides =>
      'تراجع المنصة الطرفين وتقرر — لا يلزمك إجراء آخر.';

  @override
  String get dsDescribe => 'صف المشكلة';

  @override
  String get dsDescribeHint => 'ما الذي حدث؟ وما الذي تطلبه؟';

  @override
  String get dsCategory => 'نوع المشكلة';

  @override
  String get dsAttach => 'أرفق صورة';

  @override
  String get dsOpenCta => 'افتح النزاع';

  @override
  String get dsOpened => 'فُتح النزاع — المبلغ محفوظ حتى يُحل';

  @override
  String get dsMessageHint => 'اكتب رسالتك…';

  @override
  String get dsEvidence => 'الصور والأدلة';

  @override
  String get dsConversation => 'المحادثة';

  @override
  String get dsResolved => 'قرار المنصة';

  @override
  String get dsCatScope => 'نطاق العمل';

  @override
  String get dsCatQuality => 'جودة التنفيذ';

  @override
  String get dsCatPrice => 'السعر';

  @override
  String get dsCatDelay => 'تأخير';

  @override
  String get dsCatDamage => 'ضرر بالسيارة';

  @override
  String get dsCatPartDefect => 'عيب في القطعة';

  @override
  String get dsCatNoShow => 'عدم حضور';

  @override
  String get dsStOpen => 'مفتوح';

  @override
  String get dsStUnderReview => 'قيد المراجعة';

  @override
  String get dsStAwaiting => 'بانتظار الأطراف';

  @override
  String get dsStEscalated => 'مصعّد';

  @override
  String get dsStResolved => 'صدر القرار';

  @override
  String get dsStClosed => 'مغلق';

  @override
  String get abTitle => 'مركبة لم تُستلم';

  @override
  String abNotice(int n) {
    return 'إنذار $n';
  }

  @override
  String get abFormal => 'رسمي';

  @override
  String abDueAfter(int days) {
    return 'يُستحق بعد $days يوماً من الجاهزية';
  }

  @override
  String abDaysReady(int days) {
    return 'جاهزة منذ $days يوماً';
  }

  @override
  String get abStorage => 'رسوم التخزين';

  @override
  String abFreeThen(int free, String perDay) {
    return '$free أيام سماح ثم $perDay يومياً';
  }

  @override
  String get abDeclare => 'إعلان مركبة مهجورة';

  @override
  String get abDeclareWarn =>
      'إجراء نظامي لا رجعة فيه: تُسجَّل السيارة مهجورة وتُضاف رسوم التخزين إلى المطالبة تمهيداً للتنفيذ.';

  @override
  String get abDeclared => 'أُعلنت المركبة مهجورة';

  @override
  String get abReason => 'السبب (اختياري)';

  @override
  String get abCustomerReady =>
      'سيارتك جاهزة — استلمها الآن. التأخر يرتب رسوم تخزين وقد تُعدّ السيارة مهجورة نظاماً.';

  @override
  String get abCustomerDeclared =>
      'أُعلنت السيارة مهجورة لعدم الاستلام — تواصل مع الورشة فوراً لتسوية المستحقات.';

  @override
  String get accAddItems => 'أضفها لأمر العمل';

  @override
  String get accAddItemsHint => 'تُضاف كنسخة جديدة تحتاج إعادة اعتماد العميل.';

  @override
  String get accItemsAdded => 'أُضيفت البنود — أرسلها للاعتماد';

  @override
  String get accPriceEach => 'سعّر كل بند قبل الإضافة';

  @override
  String get flStatements => 'الكشوف الشهرية';

  @override
  String get flStatementsBody => 'ملخص شهري لفواتير أسطولك — جاهز للمحاسبة.';

  @override
  String get flStatementsEmpty => 'لا كشوف بعد';

  @override
  String get flStatementsEmptyBody =>
      'أنشئ كشف الشهر لتحصل على ملخص فواتير أسطولك في ملف واحد.';

  @override
  String get flGenerateStatement => 'أنشئ كشف هذا الشهر';

  @override
  String get flStatementGenerated => 'جُهّز كشف الشهر';

  @override
  String flInvoicesCount(int n) {
    return '$n فاتورة';
  }

  @override
  String get flCopyCsv => 'نسخ CSV';

  @override
  String get flCsvCopied => 'نُسخ الكشف — ألصقه في جداولك';

  @override
  String get srFix => 'أصلح سيارتي';

  @override
  String get srFixBody => 'صف المشكلة، وقارن عروض الورش القريبة.';

  @override
  String get srDescribe => 'صف المشكلة';

  @override
  String get srDescribeHint =>
      'ما الذي تسمعه أو تراه؟ الصورة تغني عن ألف كلمة.';

  @override
  String get srWhere => 'موقعك';

  @override
  String get srWhereHint => 'الصق رابط خرائط أو إحداثيات مثل 24.71, 46.67';

  @override
  String get srRadius => 'نطاق البحث';

  @override
  String srKm(int n) {
    return '$n كم';
  }

  @override
  String get srWhen => 'متى تريد الإصلاح؟';

  @override
  String get srNow => 'الآن';

  @override
  String get srToday => 'اليوم';

  @override
  String get srThisWeek => 'هذا الأسبوع';

  @override
  String get srSend => 'أرسل الطلب';

  @override
  String get srSent => 'أُرسل طلبك — العروض ستظهر هنا';

  @override
  String get srMine => 'طلبات الإصلاح';

  @override
  String get srOffers => 'العروض';

  @override
  String get srNoOffers => 'لا عروض بعد — الورش القريبة تدرس طلبك.';

  @override
  String srWiden(int n) {
    return 'وسّع النطاق إلى $n كم';
  }

  @override
  String get srWidened => 'وُسّع نطاق البحث';

  @override
  String get srFreeInspection => 'معاينة مجانية';

  @override
  String get srEstimate => 'سعر تقديري';

  @override
  String srPriceRange(String min, String max) {
    return 'من $min إلى $max';
  }

  @override
  String get srFinalPriceNote =>
      'السعر النهائي يُعتمد بعد الفحص وبتوقيعك — لا مفاجآت.';

  @override
  String get srAccepted => 'قُبل العرض — أُنشئ أمر العمل';

  @override
  String get srNearestBadge => 'الأقرب';

  @override
  String get srTopRatedBadge => 'الأعلى تقييماً';

  @override
  String get srPrevUsedBadge => 'سبق تعاملك معها';

  @override
  String get srNearby => 'طلبات إصلاح قريبة';

  @override
  String srNearbyCount(int n) {
    return '$n طلبات إصلاح قريبة';
  }

  @override
  String get srRespond => 'قدّم عرضك';

  @override
  String get srDiagnosis => 'تحليلك للمشكلة';

  @override
  String get srDiagnosisHint => 'سطر يشرح ما تظنه السبب — هو ما يميّز عرضك.';

  @override
  String get srPriceMin => 'السعر من';

  @override
  String get srPriceMax => 'إلى';

  @override
  String get srAvailability => 'متى تستقبل السيارة؟';

  @override
  String get srOfferSent => 'أُرسل عرضك';

  @override
  String get srCancelRequest => 'ألغِ الطلب';

  @override
  String get srSpecialistBadge => 'متخصصون في سيارتك';

  @override
  String srRespondsIn(int n) {
    return 'يرد خلال ~$n دقيقة';
  }

  @override
  String get voUnavailable => 'الإملاء الصوتي غير متاح على هذا الجهاز.';

  @override
  String get voSpeak => 'تكلم الآن';

  @override
  String get voListening => 'أستمع…';

  @override
  String get voHeardNothing => 'لم أسمع شيئاً — جرّب مرة أخرى';

  @override
  String get voAgain => 'أعد';

  @override
  String get voDone => 'تم';

  @override
  String get voDictateItems => 'أملِ البنود صوتاً';

  @override
  String get voReviewTitle => 'راجع ما سُمع';

  @override
  String voHeard(String text) {
    return 'سُمع: $text';
  }

  @override
  String get voNeedsPrice => 'يحتاج سعراً';

  @override
  String get voApply => 'أضف البنود المسعّرة';

  @override
  String get voApplied => 'أُضيفت البنود — تحتاج إعادة اعتماد العميل';

  @override
  String get voDiscard => 'تجاهل';

  @override
  String get voUploadFailed => 'لم يُرفع التسجيل — نصك محفوظ، أعد المحاولة';

  @override
  String get voRetryUpload => 'أعد الرفع';

  @override
  String get assistantTooltip => 'المساعد الصوتي';

  @override
  String get assistantTitle => 'تكلّم — أنا أسمع';

  @override
  String get assistantAck => 'حاضر —';

  @override
  String get assistantTryCustomer =>
      'لم أفهم — جرّب: «اطلب سطحة» أو «أصلح سيارتي»';

  @override
  String get assistantTryPartner =>
      'لم أفهم — جرّب: «أمر جديد» أو «الطلبات القريبة»';

  @override
  String get voDevTyped => 'بيئة تطوير — الإملاء غير متاح على المحاكي';

  @override
  String get voDevTypedHint => 'اكتب ما كنت ستقوله';

  @override
  String get voDevBroken => 'بيئة تطوير — الإملاء لا يعمل على هذا المحاكي';

  @override
  String get voTypeInstead => 'اكتب بدلاً';

  @override
  String get ptSendDelivery => 'أرسلها بتوصيل المنصة';

  @override
  String get ptDeliverySent => 'أُرسلت — نبحث عن سائق قريب';

  @override
  String get ptDeliveryTitle => 'توصيل المنصة';

  @override
  String get ptManualShip => 'شُحنت يدوياً (خارج توصيل المنصة)';

  @override
  String get ptDeliveryPickedUp => 'القطعة مع السائق';

  @override
  String get srNoVehicle => 'أضف سيارتك أولاً';

  @override
  String get srNoVehicleBody =>
      'الورش تسعّر حسب نوع السيارة وموديلها — بدونها لا تستطيع تقدير التكلفة.';

  @override
  String get srAddVehicle => 'أضف سيارة';

  @override
  String get ptEndedNoBids =>
      'انتهى بلا عروض — أعد النشر بنطاق أوسع أو اشترِ من نتائج البحث';

  @override
  String get ptToolsTitle => 'أدواتي';

  @override
  String get ptTradeRowSub => 'حسابك الآجل مع المورّدين';

  @override
  String get wsQuickAdd => 'أضف بنداً بسطر';

  @override
  String get wsQuickAddHint => 'تغيير زيت وفلتر بمئتين وستين';

  @override
  String get wsQuickAddNeedsPrice => 'أضف السعر ليكتمل البند';

  @override
  String get wsItemDetails => 'تفاصيل أكثر (ضمان، حالة القطعة)';

  @override
  String get wsPaint => 'سمكرة ودهان';

  @override
  String get wsDiagnostic => 'فحص';

  @override
  String get wsTowing => 'سطحة';

  @override
  String get sar => 'ر.س';

  @override
  String get vinScan => 'امسح رقم الهيكل';

  @override
  String get vinScanNotFound => 'هذا الرمز ليس رقم هيكل — جرّب ملصق عمود الباب';

  @override
  String get wsInbox => 'ما يحتاجك الآن';

  @override
  String wsInboxCount(int n) {
    return '$n بند';
  }

  @override
  String get wsInboxDisputes => 'نزاعات مفتوحة — المبلغ مجمّد حتى القرار';

  @override
  String get wsInboxAbandonRisk => 'سيارات جاهزة لم يستلمها أصحابها';

  @override
  String get wsInboxAwaitingApproval => 'أوامر تنتظر اعتماد العميل';

  @override
  String get wsInboxReady => 'جاهزة للتسليم';

  @override
  String get wsInboxCheckout => 'تحتاج فحص تسليم';

  @override
  String get wsInboxServiceRequests => 'طلبات إصلاح قريبة تنتظر عرضك';

  @override
  String get wsInboxPartBids => 'طلبات قطع تنتظر عرضك';

  @override
  String get wsInboxUnpaid => 'مسلَّمة بلا فاتورة';

  @override
  String get wsTitleOptional => 'وصف مختصر (اختياري)';

  @override
  String get wsTitleAuto => 'إن تركته فارغاً يُسمّى الأمر ببنوده.';

  @override
  String get wsNeedCar => 'أضف لوحة السيارة أو رقم الهيكل.';

  @override
  String get wsNeedItem => 'أضف بنداً واحداً على الأقل.';

  @override
  String get dueOnYou => 'مستحقّ عليك';

  @override
  String get dueOverdueHint => 'تأخّر السداد — يبدأ الإنذار الرسمي ثم التنفيذ.';

  @override
  String dueCount(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n بانتظار السداد',
      two: 'فاتورتان بانتظار السداد',
      one: 'فاتورة واحدة بانتظار السداد',
    );
    return '$_temp0';
  }

  @override
  String get loginPromise => 'سيارتك من العطل إلى الطريق — في مكان واحد.';

  @override
  String get loginTrustSign => 'اعتماد موقّع';

  @override
  String get loginTrustEscrow => 'المبلغ محفوظ';

  @override
  String get loginTrustInvoice => 'فاتورة نظامية';

  @override
  String get loginNafathNote => 'برقم جوالك تدخل، وبتوقيعك تعتمد.';

  @override
  String get drvOnline => 'متصل — تصلك المهام';

  @override
  String get drvOffline => 'غير متصل';

  @override
  String get drvNearby => 'مهام قريبة منك';

  @override
  String get drvNeedOrg =>
      'اربط حسابك بمنشأة النقل قبل قبول المهام — الفاتورة تصدر باسم المنشأة.';

  @override
  String get drvPickup => 'الاستلام';

  @override
  String get drvDropoff => 'التسليم';

  @override
  String drvKm(String km) {
    return '$km كم';
  }

  @override
  String get drvOfflineTitle => 'أنت غير متصل';

  @override
  String get drvOfflineBody => 'فعّل الاتصال أعلاه لترى المهام القريبة منك.';

  @override
  String get drvNoOffersTitle => 'لا مهام قريبة الآن';

  @override
  String get drvNoOffersBody => 'سنعرض لك أي طلب سطحة يصل قرب موقعك.';

  @override
  String get drvActStart => 'في الطريق للاستلام';

  @override
  String get drvActLoaded => 'حمّلت السيارة';

  @override
  String get drvActHeading => 'في الطريق للتسليم';

  @override
  String get drvActDeliver => 'تسليم وإثبات';

  @override
  String get drvActDone => 'تمّت';

  @override
  String get truckFlatbed => 'سطحة';

  @override
  String get truckWheelLift => 'رافعة عجلات';

  @override
  String get truckPartsDelivery => 'توصيل قطع';

  @override
  String get drvProofTitle => 'إثبات التسليم';

  @override
  String get drvProofWhy =>
      'صورة السيارة عند التسليم، ورمزٌ تقرؤه من المستلم. بهما تُغلق المهمة ويُصرف المبلغ.';

  @override
  String get drvPhotoStep => 'صوّر السيارة في مكان التسليم';

  @override
  String get drvPhotoDone => 'الصورة جاهزة';

  @override
  String get drvTakePhoto => 'التقط صورة';

  @override
  String get drvRetakePhoto => 'إعادة التصوير';

  @override
  String get drvCodeStep => 'اطلب الرمز ليصل إلى جوال المستلم، ثم اقرأه منه.';

  @override
  String get drvCodeSent => 'أُرسل الرمز إلى جوال المستلم.';

  @override
  String get drvSendCode => 'أرسل الرمز';

  @override
  String get drvResendCode => 'إعادة الإرسال';

  @override
  String get drvComplete => 'إنهاء المهمة';

  @override
  String get tabDriverJobs => 'مهامي';

  @override
  String get flPolicyTitle => 'قواعد الصرف';

  @override
  String get flPolicyName => 'سياسة الأسطول';

  @override
  String get flPolicyWhy =>
      'ثلاثة أرقام تحكم كل أمر إصلاح: ما يمرّ بلا اعتماد، وما يحتاج شخصين، وسقف الشهر.';

  @override
  String get flPolicyAuto => 'اعتماد تلقائي تحت';

  @override
  String get flPolicyAutoHint => 'أقل من هذا المبلغ يمرّ بلا انتظار أحد.';

  @override
  String get flPolicyTwo => 'يحتاج معتمدَين فوق';

  @override
  String get flPolicyTwoHint =>
      'اتركه فارغاً إن كان اعتماد شخص واحد يكفي دائماً.';

  @override
  String get flPolicyBudget => 'ميزانية الشهر';

  @override
  String get flPolicyBudgetHint => 'يُرفض ما يتجاوزها. اتركه فارغاً بلا سقف.';

  @override
  String get flPolicyMeaning => 'ماذا يعني ذلك';

  @override
  String get flPolicySave => 'حفظ القواعد';

  @override
  String get flPolicyContradiction =>
      'حدّ المعتمدَين أقل من حدّ الاعتماد التلقائي — لن يمرّ أي أمر باعتماد واحد.';

  @override
  String get flOutAuto => 'يمرّ تلقائياً';

  @override
  String get flOutOne => 'اعتماد واحد';

  @override
  String get flOutTwo => 'اعتماد شخصين';

  @override
  String get flOutOverBudget => 'يتجاوز الميزانية';

  @override
  String get flPolicyEntry => 'قواعد الصرف';

  @override
  String get spAddPhoto => 'صوّر القطعة';

  @override
  String spAddMorePhotos(int n) {
    return 'صورة أخرى ($n متبقية)';
  }

  @override
  String get ptSeePart => 'صور القطعة';

  @override
  String get inNewService => 'طلب إصلاح وصلك الآن';

  @override
  String get inNewPart => 'طلب قطعة وصلك الآن';

  @override
  String inMore(int n) {
    return '+$n آخر';
  }

  @override
  String get inOpen => 'شوف الطلب';

  @override
  String get inIgnore => 'تجاهل';

  @override
  String get srWhatYouNotice => 'ما الذي تلاحظه؟';

  @override
  String get srPickMore => 'اختر كل ما ينطبق — كلما وضّحت، جاء العرض أدقّ.';

  @override
  String get srNoteOptional => 'تفاصيل تساعد الورشة (اختياري)';

  @override
  String get srNoteHint => 'متى يحدث؟ ومنذ متى؟';

  @override
  String get srHere => 'موقعك الحالي';

  @override
  String get srLocating => 'نحدّد موقعك…';

  @override
  String get srLocateFailed => 'تعذّر تحديد موقعك';

  @override
  String get srLocateManual => 'أدخله يدوياً';

  @override
  String get srUseMyLocation => 'استعمل موقعي';

  @override
  String get srWhenAsk => 'متى يناسبك؟';

  @override
  String get srOffersComing =>
      'ستصلك عروض الورش القريبة خلال دقائق — تقارنها وتختار.';

  @override
  String get reqFixHero => 'سيارتك فيها مشكلة؟';

  @override
  String get reqFixHeroBody =>
      'صف ما تلاحظه، وتصلك عروض الورش القريبة — تقارنها وتختار بلا أن تدور عليها.';

  @override
  String get reqNearby => 'ورش قريبة منك';

  @override
  String get reqNearbySpecialised => 'متخصّصة بسيارتك';

  @override
  String get reqNearbyNew => 'جديدة';

  @override
  String get reqNearbyAsk => 'اطلب منها';

  @override
  String get tabHome => 'الرئيسية';

  @override
  String get tabMyOrders => 'طلباتي';

  @override
  String get homeGreeting => 'ما الذي تحتاجه لسيارتك؟';

  @override
  String get homeNothingLive => 'لا يوجد شيء جارٍ الآن';

  @override
  String get myOrdersEmpty => 'لا طلبات جارية';

  @override
  String get myOrdersEmptyBody =>
      'كل ما تطلبه — إصلاح أو قطعة أو سطحة — يظهر هنا حتى ينتهي.';

  @override
  String get moRepairs => 'الإصلاح';

  @override
  String get moParts => 'القطع';

  @override
  String get moTow => 'السطحة';

  @override
  String get moDue => 'مستحقّ عليك';

  @override
  String get obTitle => 'سجّل ورشتك';

  @override
  String get obBody => 'دقائق، ثم تصلك طلبات العملاء حولك.';

  @override
  String get obName => 'اسم الورشة';

  @override
  String get obNameHint => 'كما في السجل التجاري';

  @override
  String get obCr => 'رقم السجل التجاري';

  @override
  String get obCrHint => '10 أرقام';

  @override
  String get obCrOptional => 'تستطيع إضافته لاحقاً';

  @override
  String get obType => 'نوع النشاط';

  @override
  String get obTypeWorkshop => 'ورشة';

  @override
  String get obTypeBody => 'سمكرة ودهان';

  @override
  String get obTypeService => 'مركز خدمة';

  @override
  String get obTypeScrap => 'تشليح';

  @override
  String get obTypeParts => 'قطع غيار';

  @override
  String get obLocation => 'أين ورشتك؟';

  @override
  String get obLocationBody =>
      'موقعك يحدّد من يصله طلبك — العملاء حولك يرونك أولاً.';

  @override
  String get obUseMyLocation => 'استعمل موقعي الحالي';

  @override
  String get obCity => 'المدينة';

  @override
  String get obDistrict => 'الحي';

  @override
  String get obDocs => 'وثيقتان للتحقّق';

  @override
  String get obDocsBody =>
      'السجل التجاري وهوية المالك. لا يراهما إلا فريق المراجعة.';

  @override
  String get obDocCr => 'السجل التجاري';

  @override
  String get obDocId => 'هوية المالك';

  @override
  String get obUpload => 'أرفق';

  @override
  String get obUploaded => 'أُرفقت';

  @override
  String get obSubmit => 'أرسل للمراجعة';

  @override
  String get obNext => 'التالي';

  @override
  String get obCreate => 'أنشئ الورشة';

  @override
  String get obPending => 'ورشتك قيد المراجعة';

  @override
  String get obPendingBody =>
      'يراجعها فريق المنصة عادةً خلال يوم عمل، ونُشعرك فور اعتمادها — عندها تبدأ طلبات العملاء بالوصول.';

  @override
  String get obDraft => 'أكمل تسجيل ورشتك';

  @override
  String get obRejected => 'المراجعة تحتاج تعديلاً';

  @override
  String get obStepInfo => 'بيانات الورشة';

  @override
  String get obStepPlace => 'الموقع';

  @override
  String get obStepDocs => 'الوثائق';

  @override
  String get welcomeSkip => 'تخطَّ';

  @override
  String get welcomeNext => 'التالي';

  @override
  String get welcomeStart => 'ابدأ';

  @override
  String get welcome1Title => 'قول وش فيها.. والعروض تجيك';

  @override
  String get welcome1Body => 'وصّف العطل بكم نقرة، والعروض توصلك — قارن واختر.';

  @override
  String get welcome2Title => 'فلوسك محفوظة بضمان';

  @override
  String get welcome2Body =>
      'فلوسك في حساب ضامن، وما تنصرف إلا بعد الاستلام أو نهاية المهلة.';

  @override
  String get welcome3Title => 'كل شي موثّق باسمك';

  @override
  String get welcome3Body => 'سعر باعتمادك، وصور قبل وبعد، وفاتورة نظامية.';

  @override
  String get setupTitle => 'جهّز حسابك';

  @override
  String get setupSubtitle => 'دقيقة وحدة: اسمك وسيارتك';

  @override
  String get setupStepName => 'اسمك';

  @override
  String get setupStepCar => 'سيارتك';

  @override
  String get setupNameTitle => 'وش نناديك؟';

  @override
  String get setupNameBody => 'يطلع في اعتماداتك وفواتيرك.';

  @override
  String get setupNameLabel => 'الاسم';

  @override
  String get setupNameHint => 'مثال: مشعل العتيبي';

  @override
  String get setupNameShort => 'اكتب اسماً من حرفين على الأقل';

  @override
  String get setupNext => 'التالي';

  @override
  String get setupCarTitle => 'أضف سيارتك';

  @override
  String get setupCarBody => 'برقم الهيكل أو اللوحة — وسجلّها يمشي معها.';

  @override
  String get setupAddCar => 'أضف سيارتي';

  @override
  String get setupLater => 'لاحقاً';

  @override
  String get vcInService => 'في الورشة الآن — تابعها';

  @override
  String get vcNoHistory => 'سجلها يبدأ من أول صيانة';

  @override
  String vcLastService(Object date) {
    return 'آخر صيانة $date';
  }

  @override
  String vcWarranties(Object n) {
    return '$n ضمان ساري';
  }

  @override
  String get editProfile => 'تعديل الملف';

  @override
  String get emailLabel => 'البريد الإلكتروني (اختياري)';

  @override
  String get emailWhy => 'لإرسال فواتيرك وإيصالاتك — لا نستخدمه لغير ذلك.';

  @override
  String get nameFromNafath => 'الاسم موثّق عبر نفاذ';

  @override
  String nameLockedUntil(Object date) {
    return 'الاسم يوقّع اعتماداتك — يمكن تغييره بعد $date';
  }

  @override
  String get awaitingPricing => 'بانتظار التسعير';

  @override
  String get aboutTitle => 'عن صناعية';

  @override
  String get supportTitle => 'الدعم';

  @override
  String get aboutPromise =>
      'سيارتك من العطل إلى الطريق — في مكان واحد. كل اتفاق موقّع، وكل مبلغ محفوظ حتى تستلم، وكل شيء موثّق باسمك.';

  @override
  String aboutVersion(Object v) {
    return 'النسخة $v';
  }

  @override
  String get supportBody =>
      'واجهتك مشكلة أو عندك اقتراح؟ كلمنا وبنرد عليك بأسرع ما نقدر.';

  @override
  String get supportWhatsApp => 'راسلنا على واتساب';

  @override
  String get supportCall => 'اتصل بنا';

  @override
  String get termsNote =>
      'باستخدامك صناعية أنت توافق على شروط الاستخدام وسياسة الخصوصية — تُنشر نسختها الكاملة قبل الإطلاق العام.';

  @override
  String get srCantMove => 'سيارتك ما تتحرك؟';

  @override
  String get srOrderTow => 'اطلب سطحة';

  @override
  String get poScheduled => 'مجدول';

  @override
  String get poProcessing => 'قيد التحويل';

  @override
  String get poPaid => 'تم التحويل';

  @override
  String get poFailed => 'تعذّر';

  @override
  String get rvTitle => 'كيف كانت التجربة؟';

  @override
  String get rvBody => 'تقييمك يظهر للعملاء بعدك — ويُحسب للورشة أو عليها.';

  @override
  String get rvCommentOptional => 'كلمة تفيد غيرك (اختياري)';

  @override
  String get rvCommentHint => 'مثال: شغل نظيف وسلّموني بالموعد';

  @override
  String get rvSubmit => 'أرسل التقييم';

  @override
  String get rvThanks => 'شكراً لك — وصل تقييمك';

  @override
  String get woPartGeneric => 'قطعة الإصلاح';

  @override
  String get wpOrdered => 'طُلبت';

  @override
  String get wpShipped => 'في الطريق';

  @override
  String get wpArrived => 'وصلت';

  @override
  String get wpCancelled => 'أُلغيت';

  @override
  String get delAccount => 'حذف الحساب';

  @override
  String get delAccountConfirm => 'احذف حسابي نهائياً';

  @override
  String get delAccountBody =>
      'يُحذف اسمك وجوالك وبريدك ولا يمكن استرجاعها، وتبقى فواتيرك وسجلاتك المالية محفوظةً باسم «حساب محذوف» كما يلزمنا النظام. لو عندك أمر إصلاح جارٍ أو سند لم يُسدَّد نكمله أولاً ثم نحذف.';

  @override
  String get avOn => 'نستقبل طلبات السوق';

  @override
  String get avOnBody => 'طلبات العملاء القريبة تصلكم أولاً بأول';

  @override
  String get avOff => 'الاستقبال موقوف مؤقتاً';

  @override
  String get avOffBody =>
      'لا تصلكم طلبات جديدة حتى تعيدوا التشغيل — أوامركم الجارية لا تتأثر';

  @override
  String get avResume => 'أعد التشغيل';

  @override
  String get wsTeam => 'فريق الورشة';

  @override
  String get wsServices => 'خدماتي';

  @override
  String get avMenuOn => 'استقبال الطلبات: يعمل — أوقفه';

  @override
  String get avMenuOff => 'استقبال الطلبات: موقوف — شغّله';

  @override
  String get teamAdd => 'أضف عضواً';

  @override
  String get teamAddBody => 'يدخل بجواله ويرى ما يخص دوره فقط.';

  @override
  String get teamAddConfirm => 'أضفه للفريق';

  @override
  String get teamEmpty => 'الفريق أنت وحدك بعد';

  @override
  String get teamEmptyBody =>
      'أضف فنّييك ليستلموا السيارات ويحدّثوا الحالات من جوالاتهم.';

  @override
  String teamRemoveTitle(Object name) {
    return 'إزالة $name؟';
  }

  @override
  String get teamRemoveBody =>
      'يفقد الدخول لهذه الورشة فوراً — سجلات أعماله السابقة تبقى.';

  @override
  String get teamRemoveConfirm => 'أزِله';

  @override
  String get roleOwner => 'المالك';

  @override
  String get roleManager => 'مدير';

  @override
  String get roleTechnician => 'فني';

  @override
  String get roleAccountant => 'محاسب';

  @override
  String get svcAdd => 'أضف خدمة';

  @override
  String get svcName => 'اسم الخدمة';

  @override
  String get svcNameHint => 'مثال: غيار زيت وفلتر';

  @override
  String get svcPrice => 'السعر';

  @override
  String get svcWarrantyDays => 'أيام الضمان';

  @override
  String get svcAddConfirm => 'احفظ الخدمة';

  @override
  String get svcEmpty => 'لا خدمات محفوظة بعد';

  @override
  String get svcEmptyBody =>
      'احفظ خدماتك المتكررة — «غيار زيت 280» يُدرج في أي أمرٍ بنقرة.';

  @override
  String get itemLabor => 'عمل';

  @override
  String get itemPart => 'قطعة';

  @override
  String get itemDiagnostic => 'فحص';

  @override
  String get scanCameraFailed =>
      'تعذّر فتح الكاميرا. تأكد من السماح للتطبيق باستخدامها، أو اكتب الرقم يدوياً.';

  @override
  String get scanTypeInstead => 'أكتبه يدوياً';

  @override
  String get istTitle => 'صوّر الاستمارة';

  @override
  String get istWhy =>
      'صورة واحدة تقرأ اللوحة ورقم الهيكل والسنة — بلا كتابة، وداخل جوالك لا على خادم.';

  @override
  String get istShoot => 'التقط الصورة';

  @override
  String istRead(int n) {
    return 'قرأتُ $n من الاستمارة';
  }

  @override
  String get istCheck => 'راجع الحقول تحت — القراءة الضوئية تخطئ أحياناً.';

  @override
  String get istUnreadable =>
      'لم أقرأ شيئاً من الصورة. صوّرها في ضوء أفضل، أو اكتب الحقول يدوياً.';

  @override
  String get exploreFirst => 'أستكشف أولاً';

  @override
  String get exploreTitle => 'حولك في الصناعية';

  @override
  String get exploreSubtitle => 'ورش ومحلات موثقة — سجّل حين تجهز';

  @override
  String get exploreSearchHint => 'ابحث عن ورشة أو محل قطع…';

  @override
  String get exploreCta => 'سجّل وابدأ';

  @override
  String get exploreEmpty => 'لا نتائج قريبة';

  @override
  String get exploreEmptyBody =>
      'جرّب اسماً آخر — أو سجّل وانشر طلبك والعروض تجيك.';

  @override
  String get exploreOrgCta => 'سجّل لتطلب منها';

  @override
  String get exploreNew => 'جديدة';

  @override
  String get orgWorkshop => 'ورشة سيارات';

  @override
  String get orgScrapyard => 'تشليح';

  @override
  String get orgPartsDealer => 'محل قطع غيار';

  @override
  String get orgPartsDistributor => 'موزّع قطع';

  @override
  String get orgPartsBrandAgent => 'وكيل قطع';

  @override
  String get orgOther => 'منشأة';

  @override
  String get guestVerified => 'موثّقة في صناعية';

  @override
  String get guestAccepting => 'تستقبل الطلبات';

  @override
  String get guestBusy => 'مشغولون حالياً';

  @override
  String get guestBranches => 'الفروع';

  @override
  String get guestSpecialties => 'التخصصات';

  @override
  String guestRatingCount(int n) {
    return '$n تقييم';
  }

  @override
  String get guestMainBranch => 'الرئيسي';

  @override
  String get wsCoverPhoto => 'صورة الورشة';

  @override
  String get coverUpdated => 'تم تحديث صورة الورشة — تظهر للعملاء في الاستكشاف';

  @override
  String kmAway(String n) {
    return '$n كم';
  }

  @override
  String get staleData => 'تعذّر تحديث البيانات — ما تراه قد يكون قديماً';

  @override
  String get payInDoubtTitle => 'دفعتك قيد التأكيد';

  @override
  String get payInDoubtBody =>
      'بدأت العملية ولم يصلنا تأكيدها بعد. لا تُعد الدفع — تحقّق بعد لحظات، وإن لم تُخصم فلن يُخصم شيء.';

  @override
  String get payCheckNow => 'تحقّق الآن';

  @override
  String insPhotosPending(int n) {
    return '$n صورة لم تُرفع — المسها لإعادة الرفع قبل الحفظ';
  }

  @override
  String get srvFix => 'إصلاح';

  @override
  String get srvPart => 'قطع غيار';

  @override
  String get srvTow => 'سطحة';

  @override
  String get srvInspect => 'فحص قبل الشراء';

  @override
  String get srvInspectBody =>
      'ورشة محايدة تفحصها وتكتب لك تقريراً قبل ما تدفع';

  @override
  String get srvService => 'صيانة دورية';

  @override
  String get srvServiceBody => 'زيت وفلاتر وفحص شامل بسعر متفق عليه';

  @override
  String get srvRoadside => 'بطارية وطريق';

  @override
  String get srvRoadsideBody => 'ما تشتغل؟ أقرب ورشة تجيك مكانك';

  @override
  String get srvPresetInspect =>
      'فحص شامل قبل الشراء — أريد تقرير حالة السيارة';

  @override
  String get srvPresetService => 'صيانة دورية — زيت وفلاتر وفحص شامل';

  @override
  String get srvPresetRoadside => 'السيارة ما تشتغل — أحتاج مساعدة في موقعي';

  @override
  String get askTitle => 'وش فيها سيارتك؟';

  @override
  String get askBody => 'اكتبها بكلامك أو قُلها — نفهمها ونرسلها للمكان الصح.';

  @override
  String get askHint => 'مثال: سيارتي ما تشتغل من الصبح';

  @override
  String get askAnalyze => 'حلّل وأرسل';

  @override
  String get askThinking => 'نقرأ وصفك…';

  @override
  String get askSendRepair => 'أرسلها للورش القريبة';

  @override
  String get askSendPart => 'أرسلها لمحلات القطع';

  @override
  String get askSendTow => 'اطلب سطحة الآن';

  @override
  String get askEdit => 'مو هذا اللي أقصده';

  @override
  String get askUrgent => 'عاجل';

  @override
  String get cdEnded => 'انتهت المهلة';

  @override
  String cdMinutes(int n) {
    return 'يبقى $n دقيقة';
  }

  @override
  String cdHours(int h, int m) {
    return 'يبقى $h س $m د';
  }

  @override
  String cdMinSec(String t) {
    return 'يبقى $t';
  }

  @override
  String get cdWorkshopsHave => 'الورش عندها مهلة للرد';

  @override
  String get cdShopsHave => 'المحلات عندها مهلة للعرض';
}
