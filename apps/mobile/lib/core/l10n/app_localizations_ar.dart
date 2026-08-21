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
      'كل قطعة تُركّب لك عبر صناعتي تصلك بضمان رقمي هنا.';

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
}
