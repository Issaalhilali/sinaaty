import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_ar.dart';
import 'app_localizations_en.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of L10n
/// returned by `L10n.of(context)`.
///
/// Applications need to include `L10n.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: L10n.localizationsDelegates,
///   supportedLocales: L10n.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the L10n.supportedLocales
/// property.
abstract class L10n {
  L10n(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static L10n of(BuildContext context) {
    return Localizations.of<L10n>(context, L10n)!;
  }

  static const LocalizationsDelegate<L10n> delegate = _L10nDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('ar'),
    Locale('en'),
  ];

  /// No description provided for @appName.
  ///
  /// In ar, this message translates to:
  /// **' صناعية'**
  String get appName;

  /// No description provided for @tabMyCars.
  ///
  /// In ar, this message translates to:
  /// **'سياراتي'**
  String get tabMyCars;

  /// No description provided for @tabRequest.
  ///
  /// In ar, this message translates to:
  /// **'اطلب'**
  String get tabRequest;

  /// No description provided for @tabWallet.
  ///
  /// In ar, this message translates to:
  /// **'محفظتي'**
  String get tabWallet;

  /// No description provided for @tabAccount.
  ///
  /// In ar, this message translates to:
  /// **'حسابي'**
  String get tabAccount;

  /// No description provided for @tabToday.
  ///
  /// In ar, this message translates to:
  /// **'اليوم'**
  String get tabToday;

  /// No description provided for @tabOrders.
  ///
  /// In ar, this message translates to:
  /// **'الأوامر'**
  String get tabOrders;

  /// No description provided for @tabParts.
  ///
  /// In ar, this message translates to:
  /// **'القطع'**
  String get tabParts;

  /// No description provided for @tabRequests.
  ///
  /// In ar, this message translates to:
  /// **'طلبات'**
  String get tabRequests;

  /// No description provided for @tabMySales.
  ///
  /// In ar, this message translates to:
  /// **'مبيعاتي'**
  String get tabMySales;

  /// No description provided for @loginTitle.
  ///
  /// In ar, this message translates to:
  /// **'ادخل بجوالك'**
  String get loginTitle;

  /// No description provided for @loginSubtitle.
  ///
  /// In ar, this message translates to:
  /// **'نرسل لك رمز تحقق لمرة واحدة'**
  String get loginSubtitle;

  /// No description provided for @phoneLabel.
  ///
  /// In ar, this message translates to:
  /// **'رقم الجوال'**
  String get phoneLabel;

  /// No description provided for @phoneHint.
  ///
  /// In ar, this message translates to:
  /// **'05xxxxxxxx'**
  String get phoneHint;

  /// No description provided for @sendCode.
  ///
  /// In ar, this message translates to:
  /// **'أرسل الرمز'**
  String get sendCode;

  /// No description provided for @otpTitle.
  ///
  /// In ar, this message translates to:
  /// **'أدخل رمز التحقق'**
  String get otpTitle;

  /// No description provided for @otpSubtitle.
  ///
  /// In ar, this message translates to:
  /// **'أرسلنا رمزاً من 6 أرقام إلى {phone}'**
  String otpSubtitle(String phone);

  /// No description provided for @verify.
  ///
  /// In ar, this message translates to:
  /// **'تحقق'**
  String get verify;

  /// No description provided for @resendCode.
  ///
  /// In ar, this message translates to:
  /// **'إعادة الإرسال'**
  String get resendCode;

  /// No description provided for @loginWithNafath.
  ///
  /// In ar, this message translates to:
  /// **'الدخول عبر نفاذ'**
  String get loginWithNafath;

  /// No description provided for @logout.
  ///
  /// In ar, this message translates to:
  /// **'تسجيل الخروج'**
  String get logout;

  /// No description provided for @addYourName.
  ///
  /// In ar, this message translates to:
  /// **'أضف اسمك'**
  String get addYourName;

  /// No description provided for @editName.
  ///
  /// In ar, this message translates to:
  /// **'تعديل الاسم'**
  String get editName;

  /// No description provided for @yourName.
  ///
  /// In ar, this message translates to:
  /// **'الاسم الكامل'**
  String get yourName;

  /// No description provided for @save.
  ///
  /// In ar, this message translates to:
  /// **'حفظ'**
  String get save;

  /// No description provided for @errorGeneric.
  ///
  /// In ar, this message translates to:
  /// **'حدث خطأ غير متوقع، حاول مرة أخرى.'**
  String get errorGeneric;

  /// No description provided for @errorNetwork.
  ///
  /// In ar, this message translates to:
  /// **'لا يوجد اتصال بالإنترنت. تحقق من الشبكة وأعد المحاولة.'**
  String get errorNetwork;

  /// No description provided for @errorInvalidPhone.
  ///
  /// In ar, this message translates to:
  /// **'أدخل رقم جوال سعودي صحيح.'**
  String get errorInvalidPhone;

  /// No description provided for @retry.
  ///
  /// In ar, this message translates to:
  /// **'أعد المحاولة'**
  String get retry;

  /// No description provided for @cancel.
  ///
  /// In ar, this message translates to:
  /// **'إلغاء'**
  String get cancel;

  /// No description provided for @continueLabel.
  ///
  /// In ar, this message translates to:
  /// **'متابعة'**
  String get continueLabel;

  /// No description provided for @emptyCarsTitle.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد سيارات بعد'**
  String get emptyCarsTitle;

  /// No description provided for @emptyCarsBody.
  ///
  /// In ar, this message translates to:
  /// **'أضف سيارتك برقم الهيكل أو اللوحة لتبدأ.'**
  String get emptyCarsBody;

  /// No description provided for @addCar.
  ///
  /// In ar, this message translates to:
  /// **'أضف سيارة'**
  String get addCar;

  /// No description provided for @welcomeBack.
  ///
  /// In ar, this message translates to:
  /// **'أهلاً بعودتك'**
  String get welcomeBack;

  /// No description provided for @todayEmpty.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد أوامر اليوم — أنشئ أول أمر إصلاح.'**
  String get todayEmpty;

  /// No description provided for @newWorkOrder.
  ///
  /// In ar, this message translates to:
  /// **'أمر عمل جديد'**
  String get newWorkOrder;

  /// No description provided for @comingSoon.
  ///
  /// In ar, this message translates to:
  /// **'قريباً'**
  String get comingSoon;

  /// No description provided for @activeOrders.
  ///
  /// In ar, this message translates to:
  /// **'أوامر الإصلاح الحالية'**
  String get activeOrders;

  /// No description provided for @noActiveOrders.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد أوامر إصلاح حالياً'**
  String get noActiveOrders;

  /// No description provided for @servicesTitle.
  ///
  /// In ar, this message translates to:
  /// **'ماذا تحتاج؟'**
  String get servicesTitle;

  /// No description provided for @emptyCarsServices.
  ///
  /// In ar, this message translates to:
  /// **'وهذا ما نقدّمه لك:'**
  String get emptyCarsServices;

  /// No description provided for @myCars.
  ///
  /// In ar, this message translates to:
  /// **'سياراتي'**
  String get myCars;

  /// No description provided for @vinLabel.
  ///
  /// In ar, this message translates to:
  /// **'رقم الهيكل (VIN)'**
  String get vinLabel;

  /// No description provided for @plateLabel.
  ///
  /// In ar, this message translates to:
  /// **'رقم اللوحة'**
  String get plateLabel;

  /// No description provided for @addCarTitle.
  ///
  /// In ar, this message translates to:
  /// **'أضف سيارتك'**
  String get addCarTitle;

  /// No description provided for @addCarSubtitle.
  ///
  /// In ar, this message translates to:
  /// **'رقم الهيكل يعرّف سيارتك بنوعها وموديلها. وتكفي اللوحة وحدها للبدء — بأي ترتيب: «أ ب ج 1234» أو «1234 أ ب ج».'**
  String get addCarSubtitle;

  /// No description provided for @addCarSubmit.
  ///
  /// In ar, this message translates to:
  /// **'إضافة السيارة'**
  String get addCarSubmit;

  /// No description provided for @addCarNeedOne.
  ///
  /// In ar, this message translates to:
  /// **'أدخل رقم الهيكل أو رقم اللوحة.'**
  String get addCarNeedOne;

  /// No description provided for @carPassport.
  ///
  /// In ar, this message translates to:
  /// **'سجل السيارة'**
  String get carPassport;

  /// No description provided for @noPassportEvents.
  ///
  /// In ar, this message translates to:
  /// **'سيظهر هنا كل ما يحدث لسيارتك: صيانة، قطع، فحوصات.'**
  String get noPassportEvents;

  /// No description provided for @odometer.
  ///
  /// In ar, this message translates to:
  /// **'العدّاد'**
  String get odometer;

  /// No description provided for @km.
  ///
  /// In ar, this message translates to:
  /// **'كم'**
  String get km;

  /// No description provided for @shareCarPassport.
  ///
  /// In ar, this message translates to:
  /// **'مشاركة سجل السيارة'**
  String get shareCarPassport;

  /// No description provided for @workOrder.
  ///
  /// In ar, this message translates to:
  /// **'أمر إصلاح'**
  String get workOrder;

  /// No description provided for @workOrderNumber.
  ///
  /// In ar, this message translates to:
  /// **'أمر إصلاح {number}'**
  String workOrderNumber(String number);

  /// No description provided for @timeline.
  ///
  /// In ar, this message translates to:
  /// **'المتابعة'**
  String get timeline;

  /// No description provided for @photos.
  ///
  /// In ar, this message translates to:
  /// **'الصور'**
  String get photos;

  /// No description provided for @photosCount.
  ///
  /// In ar, this message translates to:
  /// **'{count} صور'**
  String photosCount(int count);

  /// No description provided for @items.
  ///
  /// In ar, this message translates to:
  /// **'البنود'**
  String get items;

  /// No description provided for @total.
  ///
  /// In ar, this message translates to:
  /// **'الإجمالي'**
  String get total;

  /// No description provided for @vat.
  ///
  /// In ar, this message translates to:
  /// **'ضريبة القيمة المضافة 15%'**
  String get vat;

  /// No description provided for @subtotal.
  ///
  /// In ar, this message translates to:
  /// **'المجموع قبل الضريبة'**
  String get subtotal;

  /// No description provided for @approveNow.
  ///
  /// In ar, this message translates to:
  /// **'راجع واعتمد'**
  String get approveNow;

  /// No description provided for @approveTitle.
  ///
  /// In ar, this message translates to:
  /// **'اعتماد أمر الإصلاح'**
  String get approveTitle;

  /// No description provided for @approveHint.
  ///
  /// In ar, this message translates to:
  /// **'توقيعك يثبّت هذا السعر — أي تعديل يصلك كنسخة جديدة.'**
  String get approveHint;

  /// No description provided for @approveWithNafath.
  ///
  /// In ar, this message translates to:
  /// **'اعتماد عبر نفاذ'**
  String get approveWithNafath;

  /// No description provided for @approveWithOtp.
  ///
  /// In ar, this message translates to:
  /// **'اعتماد برمز التحقق'**
  String get approveWithOtp;

  /// No description provided for @nafathPickNumber.
  ///
  /// In ar, this message translates to:
  /// **'افتح تطبيق نفاذ واختر الرقم'**
  String get nafathPickNumber;

  /// No description provided for @nafathWaiting.
  ///
  /// In ar, this message translates to:
  /// **'بانتظار موافقتك في نفاذ…'**
  String get nafathWaiting;

  /// No description provided for @approved.
  ///
  /// In ar, this message translates to:
  /// **'تم الاعتماد — الورشة تبدأ العمل'**
  String get approved;

  /// No description provided for @declineOrder.
  ///
  /// In ar, this message translates to:
  /// **'لا أوافق'**
  String get declineOrder;

  /// No description provided for @declineReason.
  ///
  /// In ar, this message translates to:
  /// **'سبب عدم الموافقة'**
  String get declineReason;

  /// No description provided for @versionN.
  ///
  /// In ar, this message translates to:
  /// **'النسخة {n}'**
  String versionN(int n);

  /// No description provided for @changeReason.
  ///
  /// In ar, this message translates to:
  /// **'سبب التعديل: {reason}'**
  String changeReason(String reason);

  /// No description provided for @confirmReceipt.
  ///
  /// In ar, this message translates to:
  /// **'استلمت سيارتي'**
  String get confirmReceipt;

  /// No description provided for @confirmReceiptHint.
  ///
  /// In ar, this message translates to:
  /// **'بتأكيدك يُحوَّل المبلغ المحفوظ للورشة.'**
  String get confirmReceiptHint;

  /// No description provided for @payNow.
  ///
  /// In ar, this message translates to:
  /// **'ادفع الآن'**
  String get payNow;

  /// No description provided for @payInvoice.
  ///
  /// In ar, this message translates to:
  /// **'دفع الفاتورة'**
  String get payInvoice;

  /// No description provided for @invoice.
  ///
  /// In ar, this message translates to:
  /// **'فاتورة'**
  String get invoice;

  /// No description provided for @invoiceNumber.
  ///
  /// In ar, this message translates to:
  /// **'فاتورة {number}'**
  String invoiceNumber(String number);

  /// No description provided for @paid.
  ///
  /// In ar, this message translates to:
  /// **'مدفوعة'**
  String get paid;

  /// No description provided for @due.
  ///
  /// In ar, this message translates to:
  /// **'مستحقة'**
  String get due;

  /// No description provided for @dueOn.
  ///
  /// In ar, this message translates to:
  /// **'تستحق في {date}'**
  String dueOn(String date);

  /// No description provided for @amountHeld.
  ///
  /// In ar, this message translates to:
  /// **'المبلغ محفوظ'**
  String get amountHeld;

  /// No description provided for @payWithMada.
  ///
  /// In ar, this message translates to:
  /// **'مدى'**
  String get payWithMada;

  /// No description provided for @payWithApplePay.
  ///
  /// In ar, this message translates to:
  /// **'Apple Pay'**
  String get payWithApplePay;

  /// No description provided for @paymentDone.
  ///
  /// In ar, this message translates to:
  /// **'تم الدفع — شكراً لك'**
  String get paymentDone;

  /// No description provided for @paymentFailed.
  ///
  /// In ar, this message translates to:
  /// **'لم يكتمل الدفع، حاول مرة أخرى.'**
  String get paymentFailed;

  /// No description provided for @paySheetTitle.
  ///
  /// In ar, this message translates to:
  /// **'اختر طريقة الدفع'**
  String get paySheetTitle;

  /// No description provided for @invoices.
  ///
  /// In ar, this message translates to:
  /// **'الفواتير'**
  String get invoices;

  /// No description provided for @notes.
  ///
  /// In ar, this message translates to:
  /// **'سندات لأمر'**
  String get notes;

  /// No description provided for @note.
  ///
  /// In ar, this message translates to:
  /// **'سند لأمر'**
  String get note;

  /// No description provided for @noteNumber.
  ///
  /// In ar, this message translates to:
  /// **'سند {number}'**
  String noteNumber(String number);

  /// No description provided for @outstanding.
  ///
  /// In ar, this message translates to:
  /// **'المتبقي'**
  String get outstanding;

  /// No description provided for @noteClosedHint.
  ///
  /// In ar, this message translates to:
  /// **'أُغلق السند وصدرت المخالصة'**
  String get noteClosedHint;

  /// No description provided for @settlement.
  ///
  /// In ar, this message translates to:
  /// **'مخالصة'**
  String get settlement;

  /// No description provided for @overdue.
  ///
  /// In ar, this message translates to:
  /// **'متأخر'**
  String get overdue;

  /// No description provided for @noteHint.
  ///
  /// In ar, this message translates to:
  /// **'سند إلكتروني موثّق عبر نافذ — يُغلق تلقائياً عند سدادك.'**
  String get noteHint;

  /// No description provided for @walletEmptyTitle.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد فواتير أو سندات'**
  String get walletEmptyTitle;

  /// No description provided for @walletEmptyBody.
  ///
  /// In ar, this message translates to:
  /// **'ستظهر هنا فواتيرك ومدفوعاتك وسنداتك ومخالصاتك.'**
  String get walletEmptyBody;

  /// No description provided for @notifications.
  ///
  /// In ar, this message translates to:
  /// **'الإشعارات'**
  String get notifications;

  /// No description provided for @notificationsEmpty.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد إشعارات بعد'**
  String get notificationsEmpty;

  /// No description provided for @notificationsEmptyBody.
  ///
  /// In ar, this message translates to:
  /// **'كل ما يخص سياراتك وفواتيرك وضماناتك سيصلك هنا أولاً بأول.'**
  String get notificationsEmptyBody;

  /// No description provided for @markAllRead.
  ///
  /// In ar, this message translates to:
  /// **'تعليم الكل كمقروء'**
  String get markAllRead;

  /// No description provided for @language.
  ///
  /// In ar, this message translates to:
  /// **'اللغة'**
  String get language;

  /// No description provided for @arabic.
  ///
  /// In ar, this message translates to:
  /// **'العربية'**
  String get arabic;

  /// No description provided for @english.
  ///
  /// In ar, this message translates to:
  /// **'English'**
  String get english;

  /// No description provided for @phone.
  ///
  /// In ar, this message translates to:
  /// **'الجوال'**
  String get phone;

  /// No description provided for @nafathVerifiedLabel.
  ///
  /// In ar, this message translates to:
  /// **'موثّق بنفاذ'**
  String get nafathVerifiedLabel;

  /// No description provided for @notVerified.
  ///
  /// In ar, this message translates to:
  /// **'غير موثّق'**
  String get notVerified;

  /// No description provided for @requestSoonTitle.
  ///
  /// In ar, this message translates to:
  /// **'اطلب خدمة أو قطعة'**
  String get requestSoonTitle;

  /// No description provided for @requestSoonBody.
  ///
  /// In ar, this message translates to:
  /// **'قريباً: اطلب فحصاً، قطعة بالمزاد العكسي، أو سطحة — من هنا.'**
  String get requestSoonBody;

  /// No description provided for @viewDocument.
  ///
  /// In ar, this message translates to:
  /// **'عرض المستند'**
  String get viewDocument;

  /// No description provided for @viewInvoice.
  ///
  /// In ar, this message translates to:
  /// **'عرض الفاتورة'**
  String get viewInvoice;

  /// No description provided for @statusDraft.
  ///
  /// In ar, this message translates to:
  /// **'مسودة'**
  String get statusDraft;

  /// No description provided for @statusReceived.
  ///
  /// In ar, this message translates to:
  /// **'تم الاستلام'**
  String get statusReceived;

  /// No description provided for @statusInspecting.
  ///
  /// In ar, this message translates to:
  /// **'قيد الفحص'**
  String get statusInspecting;

  /// No description provided for @statusAwaitingApproval.
  ///
  /// In ar, this message translates to:
  /// **'بانتظار اعتمادك'**
  String get statusAwaitingApproval;

  /// No description provided for @statusApproved.
  ///
  /// In ar, this message translates to:
  /// **'معتمد'**
  String get statusApproved;

  /// No description provided for @statusAwaitingParts.
  ///
  /// In ar, this message translates to:
  /// **'بانتظار القطع'**
  String get statusAwaitingParts;

  /// No description provided for @statusInProgress.
  ///
  /// In ar, this message translates to:
  /// **'قيد التنفيذ'**
  String get statusInProgress;

  /// No description provided for @statusQualityCheck.
  ///
  /// In ar, this message translates to:
  /// **'فحص الجودة'**
  String get statusQualityCheck;

  /// No description provided for @statusReady.
  ///
  /// In ar, this message translates to:
  /// **'جاهزة للاستلام'**
  String get statusReady;

  /// No description provided for @statusDelivered.
  ///
  /// In ar, this message translates to:
  /// **'تم التسليم'**
  String get statusDelivered;

  /// No description provided for @statusClosed.
  ///
  /// In ar, this message translates to:
  /// **'مغلق'**
  String get statusClosed;

  /// No description provided for @statusCancelled.
  ///
  /// In ar, this message translates to:
  /// **'ملغى'**
  String get statusCancelled;

  /// No description provided for @statusDisputed.
  ///
  /// In ar, this message translates to:
  /// **'نزاع'**
  String get statusDisputed;

  /// No description provided for @statusAbandoned.
  ///
  /// In ar, this message translates to:
  /// **'مهجورة'**
  String get statusAbandoned;

  /// No description provided for @invStatusIssued.
  ///
  /// In ar, this message translates to:
  /// **'مستحقة'**
  String get invStatusIssued;

  /// No description provided for @invStatusPaid.
  ///
  /// In ar, this message translates to:
  /// **'مدفوعة'**
  String get invStatusPaid;

  /// No description provided for @invStatusPartiallyPaid.
  ///
  /// In ar, this message translates to:
  /// **'مدفوعة جزئياً'**
  String get invStatusPartiallyPaid;

  /// No description provided for @invStatusVoid.
  ///
  /// In ar, this message translates to:
  /// **'ملغاة'**
  String get invStatusVoid;

  /// No description provided for @invStatusOverdue.
  ///
  /// In ar, this message translates to:
  /// **'متأخرة'**
  String get invStatusOverdue;

  /// No description provided for @invStatusRefunded.
  ///
  /// In ar, this message translates to:
  /// **'مستردّة'**
  String get invStatusRefunded;

  /// No description provided for @noteStatusIssued.
  ///
  /// In ar, this message translates to:
  /// **'ساري'**
  String get noteStatusIssued;

  /// No description provided for @noteStatusPartiallySettled.
  ///
  /// In ar, this message translates to:
  /// **'مسدد جزئياً'**
  String get noteStatusPartiallySettled;

  /// No description provided for @noteStatusClosed.
  ///
  /// In ar, this message translates to:
  /// **'مغلق'**
  String get noteStatusClosed;

  /// No description provided for @noteStatusInEnforcement.
  ///
  /// In ar, this message translates to:
  /// **'قيد التنفيذ'**
  String get noteStatusInEnforcement;

  /// No description provided for @noteStatusCancelled.
  ///
  /// In ar, this message translates to:
  /// **'ملغى'**
  String get noteStatusCancelled;

  /// No description provided for @noteStatusPending.
  ///
  /// In ar, this message translates to:
  /// **'بانتظار الإصدار'**
  String get noteStatusPending;

  /// No description provided for @signedByNafath.
  ///
  /// In ar, this message translates to:
  /// **'موقّع بنفاذ'**
  String get signedByNafath;

  /// No description provided for @signedByOtp.
  ///
  /// In ar, this message translates to:
  /// **'موقّع برمز التحقق'**
  String get signedByOtp;

  /// No description provided for @securedByNote.
  ///
  /// In ar, this message translates to:
  /// **'مضمون بسند'**
  String get securedByNote;

  /// No description provided for @termsPrepaid.
  ///
  /// In ar, this message translates to:
  /// **'دفع مقدّم'**
  String get termsPrepaid;

  /// No description provided for @termsOnDelivery.
  ///
  /// In ar, this message translates to:
  /// **'الدفع عند الاستلام'**
  String get termsOnDelivery;

  /// No description provided for @termsDeferred.
  ///
  /// In ar, this message translates to:
  /// **'دفع آجل'**
  String get termsDeferred;

  /// No description provided for @termsInstallments.
  ///
  /// In ar, this message translates to:
  /// **'أقساط'**
  String get termsInstallments;

  /// No description provided for @termsFleetMonthly.
  ///
  /// In ar, this message translates to:
  /// **'كشف شهري'**
  String get termsFleetMonthly;

  /// No description provided for @loading.
  ///
  /// In ar, this message translates to:
  /// **'جارٍ التحميل…'**
  String get loading;

  /// No description provided for @somethingWrong.
  ///
  /// In ar, this message translates to:
  /// **'تعذّر التحميل'**
  String get somethingWrong;

  /// No description provided for @noOrdersForCar.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد أوامر إصلاح لهذه السيارة'**
  String get noOrdersForCar;

  /// No description provided for @checkIn.
  ///
  /// In ar, this message translates to:
  /// **'فحص الاستلام'**
  String get checkIn;

  /// No description provided for @checkOut.
  ///
  /// In ar, this message translates to:
  /// **'فحص التسليم'**
  String get checkOut;

  /// No description provided for @damages.
  ///
  /// In ar, this message translates to:
  /// **'{count} ملاحظات'**
  String damages(int count);

  /// No description provided for @codeLabel.
  ///
  /// In ar, this message translates to:
  /// **'رمز التحقق'**
  String get codeLabel;

  /// No description provided for @invalidCode.
  ///
  /// In ar, this message translates to:
  /// **'أدخل الرمز المكوّن من 6 أرقام'**
  String get invalidCode;

  /// No description provided for @payAmount.
  ///
  /// In ar, this message translates to:
  /// **'ادفع {amount}'**
  String payAmount(String amount);

  /// No description provided for @warrantyDays.
  ///
  /// In ar, this message translates to:
  /// **'ضمان {days} يوم'**
  String warrantyDays(int days);

  /// No description provided for @nafathNumber.
  ///
  /// In ar, this message translates to:
  /// **'الرقم في نفاذ'**
  String get nafathNumber;

  /// No description provided for @approveDone.
  ///
  /// In ar, this message translates to:
  /// **'تم'**
  String get approveDone;

  /// No description provided for @approveNotPending.
  ///
  /// In ar, this message translates to:
  /// **'لا يوجد ما يتطلب اعتمادك في هذا الأمر الآن — حالته موضحة أعلاه.'**
  String get approveNotPending;

  /// No description provided for @payHint.
  ///
  /// In ar, this message translates to:
  /// **'الدفع آمن — يبقى المبلغ محفوظاً حتى تستلم سيارتك.'**
  String get payHint;

  /// No description provided for @clearanceIssued.
  ///
  /// In ar, this message translates to:
  /// **'صدرت المخالصة {number}'**
  String clearanceIssued(String number);

  /// No description provided for @confirmApproval.
  ///
  /// In ar, this message translates to:
  /// **'تأكيد الاعتماد'**
  String get confirmApproval;

  /// No description provided for @wsToday.
  ///
  /// In ar, this message translates to:
  /// **'اليوم'**
  String get wsToday;

  /// No description provided for @wsInShop.
  ///
  /// In ar, this message translates to:
  /// **'سيارات في الورشة'**
  String get wsInShop;

  /// No description provided for @wsAwaitingCustomer.
  ///
  /// In ar, this message translates to:
  /// **'بانتظار اعتماد العميل'**
  String get wsAwaitingCustomer;

  /// No description provided for @wsReadyToPayout.
  ///
  /// In ar, this message translates to:
  /// **'ر.س جاهز للتحويل'**
  String get wsReadyToPayout;

  /// No description provided for @wsNeedsAction.
  ///
  /// In ar, this message translates to:
  /// **'يحتاج تصرّفك الآن'**
  String get wsNeedsAction;

  /// No description provided for @wsTodayCars.
  ///
  /// In ar, this message translates to:
  /// **'سيارات اليوم'**
  String get wsTodayCars;

  /// No description provided for @wsAll.
  ///
  /// In ar, this message translates to:
  /// **'عرض الكل'**
  String get wsAll;

  /// No description provided for @wsNewOrder.
  ///
  /// In ar, this message translates to:
  /// **'أمر جديد'**
  String get wsNewOrder;

  /// No description provided for @wsNoOrders.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد أوامر بعد'**
  String get wsNoOrders;

  /// No description provided for @wsNoOrdersBody.
  ///
  /// In ar, this message translates to:
  /// **'أنشئ أول أمر إصلاح: امسح اللوحة أو أدخل رقم الهيكل، أضف البنود، وأرسله للعميل.'**
  String get wsNoOrdersBody;

  /// No description provided for @wsStart.
  ///
  /// In ar, this message translates to:
  /// **'ابدأ العمل'**
  String get wsStart;

  /// No description provided for @wsReceive.
  ///
  /// In ar, this message translates to:
  /// **'استلام السيارة'**
  String get wsReceive;

  /// No description provided for @wsInspect.
  ///
  /// In ar, this message translates to:
  /// **'فحص الاستلام'**
  String get wsInspect;

  /// No description provided for @wsRequestApproval.
  ///
  /// In ar, this message translates to:
  /// **'أرسل للعميل للاعتماد'**
  String get wsRequestApproval;

  /// No description provided for @wsQuality.
  ///
  /// In ar, this message translates to:
  /// **'إلى فحص الجودة'**
  String get wsQuality;

  /// No description provided for @wsReady.
  ///
  /// In ar, this message translates to:
  /// **'جاهزة للاستلام'**
  String get wsReady;

  /// No description provided for @wsDeliver.
  ///
  /// In ar, this message translates to:
  /// **'تم التسليم'**
  String get wsDeliver;

  /// No description provided for @wsIssueInvoice.
  ///
  /// In ar, this message translates to:
  /// **'إصدار الفاتورة'**
  String get wsIssueInvoice;

  /// No description provided for @wsAddPhoto.
  ///
  /// In ar, this message translates to:
  /// **'أضف صورة'**
  String get wsAddPhoto;

  /// No description provided for @wsWaitingCustomer.
  ///
  /// In ar, this message translates to:
  /// **'بانتظار اعتماد العميل — لا يبدأ العمل قبل موافقته'**
  String get wsWaitingCustomer;

  /// No description provided for @wsCustomerPhone.
  ///
  /// In ar, this message translates to:
  /// **'جوال العميل'**
  String get wsCustomerPhone;

  /// No description provided for @wsTitle.
  ///
  /// In ar, this message translates to:
  /// **'وصف مختصر للعمل'**
  String get wsTitle;

  /// No description provided for @wsTitleHint.
  ///
  /// In ar, this message translates to:
  /// **'مثال: سمكرة رفرف أمامي'**
  String get wsTitleHint;

  /// No description provided for @wsItems.
  ///
  /// In ar, this message translates to:
  /// **'البنود'**
  String get wsItems;

  /// No description provided for @wsAddItem.
  ///
  /// In ar, this message translates to:
  /// **'أضف بنداً'**
  String get wsAddItem;

  /// No description provided for @wsItemDesc.
  ///
  /// In ar, this message translates to:
  /// **'الوصف'**
  String get wsItemDesc;

  /// No description provided for @wsItemPrice.
  ///
  /// In ar, this message translates to:
  /// **'السعر'**
  String get wsItemPrice;

  /// No description provided for @wsItemQty.
  ///
  /// In ar, this message translates to:
  /// **'الكمية'**
  String get wsItemQty;

  /// No description provided for @wsLabor.
  ///
  /// In ar, this message translates to:
  /// **'أجور'**
  String get wsLabor;

  /// No description provided for @wsPart.
  ///
  /// In ar, this message translates to:
  /// **'قطعة'**
  String get wsPart;

  /// No description provided for @wsWarranty.
  ///
  /// In ar, this message translates to:
  /// **'ضمان (أيام)'**
  String get wsWarranty;

  /// No description provided for @wsPaymentTerms.
  ///
  /// In ar, this message translates to:
  /// **'شروط الدفع'**
  String get wsPaymentTerms;

  /// No description provided for @wsCreate.
  ///
  /// In ar, this message translates to:
  /// **'إنشاء الأمر'**
  String get wsCreate;

  /// No description provided for @wsEstimate.
  ///
  /// In ar, this message translates to:
  /// **'التقدير'**
  String get wsEstimate;

  /// No description provided for @wsAngles.
  ///
  /// In ar, this message translates to:
  /// **'8 زوايا'**
  String get wsAngles;

  /// No description provided for @wsAngleOf.
  ///
  /// In ar, this message translates to:
  /// **'{done} / {total}'**
  String wsAngleOf(int done, int total);

  /// No description provided for @wsShootNext.
  ///
  /// In ar, this message translates to:
  /// **'صوّر الزاوية التالية'**
  String get wsShootNext;

  /// No description provided for @wsSubmitInspection.
  ///
  /// In ar, this message translates to:
  /// **'حفظ فحص الاستلام'**
  String get wsSubmitInspection;

  /// No description provided for @wsDamages.
  ///
  /// In ar, this message translates to:
  /// **'ملاحظات الهيكل'**
  String get wsDamages;

  /// No description provided for @wsAddDamage.
  ///
  /// In ar, this message translates to:
  /// **'أضف ملاحظة'**
  String get wsAddDamage;

  /// No description provided for @wsNoDamages.
  ///
  /// In ar, this message translates to:
  /// **'لا ملاحظات على الهيكل بعد — سجّل أي خدش أو ضرر قبل بدء العمل؛ يحميك ويحمي العميل.'**
  String get wsNoDamages;

  /// No description provided for @wsFuel.
  ///
  /// In ar, this message translates to:
  /// **'الوقود %'**
  String get wsFuel;

  /// No description provided for @wsZone.
  ///
  /// In ar, this message translates to:
  /// **'الموضع'**
  String get wsZone;

  /// No description provided for @wsSeverity.
  ///
  /// In ar, this message translates to:
  /// **'الشدة'**
  String get wsSeverity;

  /// No description provided for @wsMinor.
  ///
  /// In ar, this message translates to:
  /// **'بسيط'**
  String get wsMinor;

  /// No description provided for @wsModerate.
  ///
  /// In ar, this message translates to:
  /// **'متوسط'**
  String get wsModerate;

  /// No description provided for @wsSevere.
  ///
  /// In ar, this message translates to:
  /// **'شديد'**
  String get wsSevere;

  /// No description provided for @wsOffline.
  ///
  /// In ar, this message translates to:
  /// **'بلا إنترنت — سيُرسل تلقائياً عند عودة الاتصال'**
  String get wsOffline;

  /// No description provided for @wsPendingSync.
  ///
  /// In ar, this message translates to:
  /// **'{count} إجراء بانتظار المزامنة'**
  String wsPendingSync(int count);

  /// No description provided for @wsSynced.
  ///
  /// In ar, this message translates to:
  /// **'تمت المزامنة'**
  String get wsSynced;

  /// No description provided for @wsWalletHeld.
  ///
  /// In ar, this message translates to:
  /// **'محفوظ حتى تأكيد العملاء'**
  String get wsWalletHeld;

  /// No description provided for @wsWalletAvailable.
  ///
  /// In ar, this message translates to:
  /// **'متاح للتحويل'**
  String get wsWalletAvailable;

  /// No description provided for @wsWalletTransit.
  ///
  /// In ar, this message translates to:
  /// **'قيد التحويل للبنك'**
  String get wsWalletTransit;

  /// No description provided for @wsPayouts.
  ///
  /// In ar, this message translates to:
  /// **'التحويلات'**
  String get wsPayouts;

  /// No description provided for @wsNoPayouts.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد تحويلات بعد — تُجدول تلقائياً عند توفّر رصيد.'**
  String get wsNoPayouts;

  /// No description provided for @wsPartsSoon.
  ///
  /// In ar, this message translates to:
  /// **'قطع لهذه السيارة'**
  String get wsPartsSoon;

  /// No description provided for @wsPartsSearchHint.
  ///
  /// In ar, this message translates to:
  /// **'أدخل رقم الهيكل في الأعلى لترى القطع المتوفرة لسيارتك بأسعارها الحية.'**
  String get wsPartsSearchHint;

  /// No description provided for @wsPartsSoonBody.
  ///
  /// In ar, this message translates to:
  /// **'قريباً: ابحث برقم الهيكل، اشترِ من الوكلاء بحساب آجل مضمون، أو افتح مزاداً على التشاليح.'**
  String get wsPartsSoonBody;

  /// No description provided for @wsOrders.
  ///
  /// In ar, this message translates to:
  /// **'الأوامر'**
  String get wsOrders;

  /// No description provided for @wsActive.
  ///
  /// In ar, this message translates to:
  /// **'الحالية'**
  String get wsActive;

  /// No description provided for @wsDone.
  ///
  /// In ar, this message translates to:
  /// **'المنتهية'**
  String get wsDone;

  /// No description provided for @wsAngleFront.
  ///
  /// In ar, this message translates to:
  /// **'أمام'**
  String get wsAngleFront;

  /// No description provided for @wsAngleFrontRight.
  ///
  /// In ar, this message translates to:
  /// **'أمام يمين'**
  String get wsAngleFrontRight;

  /// No description provided for @wsAngleRight.
  ///
  /// In ar, this message translates to:
  /// **'يمين'**
  String get wsAngleRight;

  /// No description provided for @wsAngleRearRight.
  ///
  /// In ar, this message translates to:
  /// **'خلف يمين'**
  String get wsAngleRearRight;

  /// No description provided for @wsAngleRear.
  ///
  /// In ar, this message translates to:
  /// **'خلف'**
  String get wsAngleRear;

  /// No description provided for @wsAngleRearLeft.
  ///
  /// In ar, this message translates to:
  /// **'خلف يسار'**
  String get wsAngleRearLeft;

  /// No description provided for @wsAngleLeft.
  ///
  /// In ar, this message translates to:
  /// **'يسار'**
  String get wsAngleLeft;

  /// No description provided for @wsAngleFrontLeft.
  ///
  /// In ar, this message translates to:
  /// **'أمام يسار'**
  String get wsAngleFrontLeft;

  /// No description provided for @wsCustomer.
  ///
  /// In ar, this message translates to:
  /// **'العميل'**
  String get wsCustomer;

  /// No description provided for @wsPhotoAdded.
  ///
  /// In ar, this message translates to:
  /// **'أُضيفت الصورة'**
  String get wsPhotoAdded;

  /// No description provided for @wsInvoiceIssued.
  ///
  /// In ar, this message translates to:
  /// **'صدرت الفاتورة {number}'**
  String wsInvoiceIssued(String number);

  /// No description provided for @wsCustomerApprovedHint.
  ///
  /// In ar, this message translates to:
  /// **'اعتمد العميل — ابدأ العمل وارفع أول صورة.'**
  String get wsCustomerApprovedHint;

  /// No description provided for @ptParts.
  ///
  /// In ar, this message translates to:
  /// **'القطع'**
  String get ptParts;

  /// No description provided for @ptSearchByVin.
  ///
  /// In ar, this message translates to:
  /// **'ابحث برقم الهيكل'**
  String get ptSearchByVin;

  /// No description provided for @ptVinHint.
  ///
  /// In ar, this message translates to:
  /// **'17 خانة'**
  String get ptVinHint;

  /// No description provided for @ptOffers.
  ///
  /// In ar, this message translates to:
  /// **'عروض مطابقة لهذه السيارة'**
  String get ptOffers;

  /// No description provided for @ptNoOffers.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد قطع مطابقة الآن — افتح مزاداً ليصلك عرض من التشاليح والمحلات القريبة.'**
  String get ptNoOffers;

  /// No description provided for @ptOpenAuction.
  ///
  /// In ar, this message translates to:
  /// **'اطلب بالمزاد العكسي'**
  String get ptOpenAuction;

  /// No description provided for @ptBuyNow.
  ///
  /// In ar, this message translates to:
  /// **'اشترِ الآن'**
  String get ptBuyNow;

  /// No description provided for @ptTradePrice.
  ///
  /// In ar, this message translates to:
  /// **'سعر الورش'**
  String get ptTradePrice;

  /// No description provided for @ptRetailPrice.
  ///
  /// In ar, this message translates to:
  /// **'سعر التجزئة'**
  String get ptRetailPrice;

  /// No description provided for @ptGenuineQr.
  ///
  /// In ar, this message translates to:
  /// **'QR أصالة'**
  String get ptGenuineQr;

  /// No description provided for @ptLeadHours.
  ///
  /// In ar, this message translates to:
  /// **'يصل خلال {h} س'**
  String ptLeadHours(int h);

  /// No description provided for @ptCondOem.
  ///
  /// In ar, this message translates to:
  /// **'أصلي وكالة'**
  String get ptCondOem;

  /// No description provided for @ptCondAftermarket.
  ///
  /// In ar, this message translates to:
  /// **'بديل معتمد'**
  String get ptCondAftermarket;

  /// No description provided for @ptCondUsed.
  ///
  /// In ar, this message translates to:
  /// **'مستعمل تشليح'**
  String get ptCondUsed;

  /// No description provided for @ptCondRefurb.
  ///
  /// In ar, this message translates to:
  /// **'مجدَّد'**
  String get ptCondRefurb;

  /// No description provided for @ptQty.
  ///
  /// In ar, this message translates to:
  /// **'الكمية'**
  String get ptQty;

  /// No description provided for @ptTermsPrepaid.
  ///
  /// In ar, this message translates to:
  /// **'دفع الآن — المبلغ محفوظ حتى تستلم'**
  String get ptTermsPrepaid;

  /// No description provided for @ptTermsDeferred.
  ///
  /// In ar, this message translates to:
  /// **'آجل على الحساب المضمون — يصدر سند لأمر'**
  String get ptTermsDeferred;

  /// No description provided for @ptOrderPlaced.
  ///
  /// In ar, this message translates to:
  /// **'تم الطلب'**
  String get ptOrderPlaced;

  /// No description provided for @ptMyRequests.
  ///
  /// In ar, this message translates to:
  /// **'طلباتي بالمزاد'**
  String get ptMyRequests;

  /// No description provided for @ptMyOrders.
  ///
  /// In ar, this message translates to:
  /// **'طلبات القطع'**
  String get ptMyOrders;

  /// No description provided for @ptPartName.
  ///
  /// In ar, this message translates to:
  /// **'اسم القطعة'**
  String get ptPartName;

  /// No description provided for @ptPartNameHint.
  ///
  /// In ar, this message translates to:
  /// **'مثال: دسكات أمامية'**
  String get ptPartNameHint;

  /// No description provided for @ptAcceptedConditions.
  ///
  /// In ar, this message translates to:
  /// **'الحالات المقبولة'**
  String get ptAcceptedConditions;

  /// No description provided for @ptBiddingMinutes.
  ///
  /// In ar, this message translates to:
  /// **'مدة المزاد (دقيقة)'**
  String get ptBiddingMinutes;

  /// No description provided for @ptSend.
  ///
  /// In ar, this message translates to:
  /// **'أرسل الطلب'**
  String get ptSend;

  /// No description provided for @ptBids.
  ///
  /// In ar, this message translates to:
  /// **'العروض'**
  String get ptBids;

  /// No description provided for @ptBidsCount.
  ///
  /// In ar, this message translates to:
  /// **'{n} عروض'**
  String ptBidsCount(int n);

  /// No description provided for @ptLowest.
  ///
  /// In ar, this message translates to:
  /// **'أقل عرض'**
  String get ptLowest;

  /// No description provided for @ptEndsIn.
  ///
  /// In ar, this message translates to:
  /// **'ينتهي خلال {m} د'**
  String ptEndsIn(int m);

  /// No description provided for @ptEndsInHours.
  ///
  /// In ar, this message translates to:
  /// **'ينتهي خلال {h} ساعة'**
  String ptEndsInHours(int h);

  /// No description provided for @ptEndsInDays.
  ///
  /// In ar, this message translates to:
  /// **'ينتهي خلال {d} يوم'**
  String ptEndsInDays(int d);

  /// No description provided for @ptEnded.
  ///
  /// In ar, this message translates to:
  /// **'انتهى'**
  String get ptEnded;

  /// No description provided for @ptAcceptBid.
  ///
  /// In ar, this message translates to:
  /// **'اقبل هذا العرض'**
  String get ptAcceptBid;

  /// No description provided for @ptAccepted.
  ///
  /// In ar, this message translates to:
  /// **'تم القبول — أُنشئ طلب الشراء'**
  String get ptAccepted;

  /// No description provided for @ptNoBidsYet.
  ///
  /// In ar, this message translates to:
  /// **'لم تصل عروض بعد — ننبّه المورّدين القريبين.'**
  String get ptNoBidsYet;

  /// No description provided for @ptTradeAccount.
  ///
  /// In ar, this message translates to:
  /// **'الحساب الآجل المضمون'**
  String get ptTradeAccount;

  /// No description provided for @ptTradeAvailable.
  ///
  /// In ar, this message translates to:
  /// **'المتاح'**
  String get ptTradeAvailable;

  /// No description provided for @ptTradeOutstanding.
  ///
  /// In ar, this message translates to:
  /// **'القائم'**
  String get ptTradeOutstanding;

  /// No description provided for @ptTradeLimit.
  ///
  /// In ar, this message translates to:
  /// **'الحد'**
  String get ptTradeLimit;

  /// No description provided for @ptRequestTrade.
  ///
  /// In ar, this message translates to:
  /// **'اطلب حساباً آجلاً'**
  String get ptRequestTrade;

  /// No description provided for @ptTradePending.
  ///
  /// In ar, this message translates to:
  /// **'بانتظار موافقة المورّد'**
  String get ptTradePending;

  /// No description provided for @ptScanQr.
  ///
  /// In ar, this message translates to:
  /// **'امسح QR القطعة'**
  String get ptScanQr;

  /// No description provided for @ptScanHint.
  ///
  /// In ar, this message translates to:
  /// **'وجّه الكاميرا نحو ملصق QR على القطعة الأصلية'**
  String get ptScanHint;

  /// No description provided for @ptVerifyGenuine.
  ///
  /// In ar, this message translates to:
  /// **'قطعة أصلية موثّقة'**
  String get ptVerifyGenuine;

  /// No description provided for @ptVerifyFake.
  ///
  /// In ar, this message translates to:
  /// **'غير موثّقة'**
  String get ptVerifyFake;

  /// No description provided for @ptVerifyAlert.
  ///
  /// In ar, this message translates to:
  /// **'تنبيه: مسح متكرر'**
  String get ptVerifyAlert;

  /// No description provided for @ptInstallOn.
  ///
  /// In ar, this message translates to:
  /// **'ركّبها في أمر العمل'**
  String get ptInstallOn;

  /// No description provided for @ptChooseItem.
  ///
  /// In ar, this message translates to:
  /// **'اختر بند القطعة'**
  String get ptChooseItem;

  /// No description provided for @ptInstalled.
  ///
  /// In ar, this message translates to:
  /// **'تم التركيب — صدر ضمان القطعة + التركيب'**
  String get ptInstalled;

  /// No description provided for @ptLaborWarranty.
  ///
  /// In ar, this message translates to:
  /// **'ضمان التركيب (أيام)'**
  String get ptLaborWarranty;

  /// No description provided for @ptWarranties.
  ///
  /// In ar, this message translates to:
  /// **'الضمانات'**
  String get ptWarranties;

  /// No description provided for @ptWarrantyPart.
  ///
  /// In ar, this message translates to:
  /// **'قطعة'**
  String get ptWarrantyPart;

  /// No description provided for @ptWarrantyLabor.
  ///
  /// In ar, this message translates to:
  /// **'تركيب'**
  String get ptWarrantyLabor;

  /// No description provided for @ptWarrantyBoth.
  ///
  /// In ar, this message translates to:
  /// **'قطعة + تركيب'**
  String get ptWarrantyBoth;

  /// No description provided for @ptValidUntil.
  ///
  /// In ar, this message translates to:
  /// **'ساري حتى {date}'**
  String ptValidUntil(String date);

  /// No description provided for @ptExpired.
  ///
  /// In ar, this message translates to:
  /// **'منتهٍ'**
  String get ptExpired;

  /// No description provided for @spRequests.
  ///
  /// In ar, this message translates to:
  /// **'طلبات'**
  String get spRequests;

  /// No description provided for @spSales.
  ///
  /// In ar, this message translates to:
  /// **'مبيعاتي'**
  String get spSales;

  /// No description provided for @spIncoming.
  ///
  /// In ar, this message translates to:
  /// **'طلبات قريبة منك'**
  String get spIncoming;

  /// No description provided for @spNoRequests.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد طلبات الآن — ستصلك إشعارات عند وجود طلب قريب يناسب قطعك.'**
  String get spNoRequests;

  /// No description provided for @spHot.
  ///
  /// In ar, this message translates to:
  /// **'الأقرب للانتهاء'**
  String get spHot;

  /// No description provided for @spBid.
  ///
  /// In ar, this message translates to:
  /// **'قدّم عرضك'**
  String get spBid;

  /// No description provided for @spYourBid.
  ///
  /// In ar, this message translates to:
  /// **'عرضك'**
  String get spYourBid;

  /// No description provided for @spUpdateBid.
  ///
  /// In ar, this message translates to:
  /// **'عدّل عرضك'**
  String get spUpdateBid;

  /// No description provided for @spPrice.
  ///
  /// In ar, this message translates to:
  /// **'سعرك'**
  String get spPrice;

  /// No description provided for @spEta.
  ///
  /// In ar, this message translates to:
  /// **'التسليم خلال (ساعات)'**
  String get spEta;

  /// No description provided for @spWarrantyDays.
  ///
  /// In ar, this message translates to:
  /// **'ضمان (أيام)'**
  String get spWarrantyDays;

  /// No description provided for @spNotes.
  ///
  /// In ar, this message translates to:
  /// **'ملاحظات'**
  String get spNotes;

  /// No description provided for @spBidSent.
  ///
  /// In ar, this message translates to:
  /// **'أُرسل عرضك — سنخبرك عند القبول'**
  String get spBidSent;

  /// No description provided for @spWon.
  ///
  /// In ar, this message translates to:
  /// **'قُبل عرضك'**
  String get spWon;

  /// No description provided for @spNoRequestsBody.
  ///
  /// In ar, this message translates to:
  /// **'ستصلك إشعارات فور وجود طلب قريب يناسب قطعك — لا حاجة للمتابعة اليدوية.'**
  String get spNoRequestsBody;

  /// No description provided for @spLost.
  ///
  /// In ar, this message translates to:
  /// **'لم يُقبل'**
  String get spLost;

  /// No description provided for @spOrdersToFulfil.
  ///
  /// In ar, this message translates to:
  /// **'طلبات للتجهيز'**
  String get spOrdersToFulfil;

  /// No description provided for @spPreparing.
  ///
  /// In ar, this message translates to:
  /// **'جهّز'**
  String get spPreparing;

  /// No description provided for @spShip.
  ///
  /// In ar, this message translates to:
  /// **'شُحن'**
  String get spShip;

  /// No description provided for @spDeliver.
  ///
  /// In ar, this message translates to:
  /// **'تم التسليم'**
  String get spDeliver;

  /// No description provided for @spDelivered.
  ///
  /// In ar, this message translates to:
  /// **'مُسلَّم'**
  String get spDelivered;

  /// No description provided for @spTradeAccounts.
  ///
  /// In ar, this message translates to:
  /// **'حسابات آجلة'**
  String get spTradeAccounts;

  /// No description provided for @spApprove.
  ///
  /// In ar, this message translates to:
  /// **'اعتمد الحساب'**
  String get spApprove;

  /// No description provided for @spCreditLimit.
  ///
  /// In ar, this message translates to:
  /// **'الحد الائتماني'**
  String get spCreditLimit;

  /// No description provided for @spTermsDays.
  ///
  /// In ar, this message translates to:
  /// **'مدة السداد (أيام)'**
  String get spTermsDays;

  /// No description provided for @spInventory.
  ///
  /// In ar, this message translates to:
  /// **'المخزون'**
  String get spInventory;

  /// No description provided for @spItems.
  ///
  /// In ar, this message translates to:
  /// **'{n} صنف'**
  String spItems(int n);

  /// No description provided for @spSerials.
  ///
  /// In ar, this message translates to:
  /// **'أرقام QR'**
  String get spSerials;

  /// No description provided for @spIssueSerials.
  ///
  /// In ar, this message translates to:
  /// **'أصدر دفعة QR'**
  String get spIssueSerials;

  /// No description provided for @spSerialsIssued.
  ///
  /// In ar, this message translates to:
  /// **'صدرت {n} أرقام — دفعة {batch}'**
  String spSerialsIssued(int n, String batch);

  /// No description provided for @spCatalogId.
  ///
  /// In ar, this message translates to:
  /// **'معرّف القطعة في الكتالوج'**
  String get spCatalogId;

  /// No description provided for @spCount.
  ///
  /// In ar, this message translates to:
  /// **'العدد'**
  String get spCount;

  /// No description provided for @spAwaitingPayment.
  ///
  /// In ar, this message translates to:
  /// **'بانتظار الدفع'**
  String get spAwaitingPayment;

  /// No description provided for @spPaid.
  ///
  /// In ar, this message translates to:
  /// **'مدفوع'**
  String get spPaid;

  /// No description provided for @spConfirmed.
  ///
  /// In ar, this message translates to:
  /// **'مؤكَّد'**
  String get spConfirmed;

  /// No description provided for @spCancelled.
  ///
  /// In ar, this message translates to:
  /// **'ملغى'**
  String get spCancelled;

  /// No description provided for @spDisputed.
  ///
  /// In ar, this message translates to:
  /// **'نزاع'**
  String get spDisputed;

  /// No description provided for @spReturned.
  ///
  /// In ar, this message translates to:
  /// **'مرتجع'**
  String get spReturned;

  /// No description provided for @spNoOrders.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد طلبات بعد'**
  String get spNoOrders;

  /// No description provided for @spNoTrade.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد حسابات آجلة — تأتي طلبات الورش هنا للاعتماد.'**
  String get spNoTrade;

  /// No description provided for @spBeFirst.
  ///
  /// In ar, this message translates to:
  /// **'لا عروض بعد — كن الأول'**
  String get spBeFirst;

  /// No description provided for @reqHubTitle.
  ///
  /// In ar, this message translates to:
  /// **'كيف نساعدك؟'**
  String get reqHubTitle;

  /// No description provided for @reqHubBody.
  ///
  /// In ar, this message translates to:
  /// **'اختر ما تحتاجه الآن — نتكفّل بالباقي.'**
  String get reqHubBody;

  /// No description provided for @reqPart.
  ///
  /// In ar, this message translates to:
  /// **'أطلب قطعة غيار'**
  String get reqPart;

  /// No description provided for @reqPartBody.
  ///
  /// In ar, this message translates to:
  /// **'نرسل طلبك للورش والتشاليح والوكلاء، وتختار أنت أفضل عرض.'**
  String get reqPartBody;

  /// No description provided for @reqTow.
  ///
  /// In ar, this message translates to:
  /// **'أطلب سطحة'**
  String get reqTow;

  /// No description provided for @reqTowBody.
  ///
  /// In ar, this message translates to:
  /// **'نقل سيارتك إلى الورشة بسعر معروف مسبقاً.'**
  String get reqTowBody;

  /// No description provided for @reqMyRequests.
  ///
  /// In ar, this message translates to:
  /// **'طلبات القطع'**
  String get reqMyRequests;

  /// No description provided for @reqMyTows.
  ///
  /// In ar, this message translates to:
  /// **'طلبات السطحة'**
  String get reqMyTows;

  /// No description provided for @reqPartVehicle.
  ///
  /// In ar, this message translates to:
  /// **'السيارة'**
  String get reqPartVehicle;

  /// No description provided for @reqPartAnyVehicle.
  ///
  /// In ar, this message translates to:
  /// **'بدون تحديد سيارة'**
  String get reqPartAnyVehicle;

  /// No description provided for @reqPartSend.
  ///
  /// In ar, this message translates to:
  /// **'أرسل الطلب'**
  String get reqPartSend;

  /// No description provided for @towTitle.
  ///
  /// In ar, this message translates to:
  /// **'سطحة'**
  String get towTitle;

  /// No description provided for @towRequestAction.
  ///
  /// In ar, this message translates to:
  /// **'أطلب السطحة'**
  String get towRequestAction;

  /// No description provided for @towRequested.
  ///
  /// In ar, this message translates to:
  /// **'أرسلنا طلبك — سيصلك السائق قريباً.'**
  String get towRequested;

  /// No description provided for @towNoHiddenFees.
  ///
  /// In ar, this message translates to:
  /// **'سعر واضح مسبقاً'**
  String get towNoHiddenFees;

  /// No description provided for @towQuoteHint.
  ///
  /// In ar, this message translates to:
  /// **'حدّد موقع سيارتك والوجهة ليظهر السعر.'**
  String get towQuoteHint;

  /// No description provided for @towCalculating.
  ///
  /// In ar, this message translates to:
  /// **'نحسب السعر…'**
  String get towCalculating;

  /// No description provided for @towQuoteLine.
  ///
  /// In ar, this message translates to:
  /// **'{km} كم · وصول خلال {minutes} دقيقة تقريباً'**
  String towQuoteLine(String km, int minutes);

  /// No description provided for @towVehicle.
  ///
  /// In ar, this message translates to:
  /// **'سيارتك'**
  String get towVehicle;

  /// No description provided for @towNoVehicle.
  ///
  /// In ar, this message translates to:
  /// **'بدون تحديد سيارة'**
  String get towNoVehicle;

  /// No description provided for @towFrom.
  ///
  /// In ar, this message translates to:
  /// **'من أين؟'**
  String get towFrom;

  /// No description provided for @towTo.
  ///
  /// In ar, this message translates to:
  /// **'إلى أين؟'**
  String get towTo;

  /// No description provided for @towPickupAddress.
  ///
  /// In ar, this message translates to:
  /// **'وصف الموقع'**
  String get towPickupAddress;

  /// No description provided for @towPickupHint.
  ///
  /// In ar, this message translates to:
  /// **'مثال: طريق الملك فهد، بعد مخرج 12'**
  String get towPickupHint;

  /// No description provided for @towDropoffAddress.
  ///
  /// In ar, this message translates to:
  /// **'وصف الوجهة'**
  String get towDropoffAddress;

  /// No description provided for @towDropoffHint.
  ///
  /// In ar, this message translates to:
  /// **'مثال: ورشة النور — الصناعية الثانية'**
  String get towDropoffHint;

  /// No description provided for @towLocationLink.
  ///
  /// In ar, this message translates to:
  /// **'رابط الموقع أو الإحداثيات'**
  String get towLocationLink;

  /// No description provided for @towLinkHelp.
  ///
  /// In ar, this message translates to:
  /// **'الصق رابط الموقع من الخرائط، أو اكتب الإحداثيات.'**
  String get towLinkHelp;

  /// No description provided for @towLinkUnreadable.
  ///
  /// In ar, this message translates to:
  /// **'لم نتمكن من قراءة الموقع — الصق الرابط الكامل أو الإحداثيات.'**
  String get towLinkUnreadable;

  /// No description provided for @towTruckType.
  ///
  /// In ar, this message translates to:
  /// **'نوع السطحة'**
  String get towTruckType;

  /// No description provided for @towTypeFlatbed.
  ///
  /// In ar, this message translates to:
  /// **'سطحة عادية'**
  String get towTypeFlatbed;

  /// No description provided for @towTypeWheelLift.
  ///
  /// In ar, this message translates to:
  /// **'رافعة عجلات'**
  String get towTypeWheelLift;

  /// No description provided for @towTypeHeavy.
  ///
  /// In ar, this message translates to:
  /// **'سطحة ثقيلة'**
  String get towTypeHeavy;

  /// No description provided for @towNotes.
  ///
  /// In ar, this message translates to:
  /// **'ملاحظات'**
  String get towNotes;

  /// No description provided for @towNotesHint.
  ///
  /// In ar, this message translates to:
  /// **'مثال: السيارة لا تدور'**
  String get towNotesHint;

  /// No description provided for @towProgress.
  ///
  /// In ar, this message translates to:
  /// **'مسار الطلب'**
  String get towProgress;

  /// No description provided for @towRoute.
  ///
  /// In ar, this message translates to:
  /// **'المسار'**
  String get towRoute;

  /// No description provided for @towDriver.
  ///
  /// In ar, this message translates to:
  /// **'السائق'**
  String get towDriver;

  /// No description provided for @towEta.
  ///
  /// In ar, this message translates to:
  /// **'{minutes} دقيقة'**
  String towEta(int minutes);

  /// No description provided for @towKm.
  ///
  /// In ar, this message translates to:
  /// **'{km} كم'**
  String towKm(String km);

  /// No description provided for @towRequestedAt.
  ///
  /// In ar, this message translates to:
  /// **'وقت الطلب'**
  String get towRequestedAt;

  /// No description provided for @towCancelTitle.
  ///
  /// In ar, this message translates to:
  /// **'إلغاء طلب السطحة'**
  String get towCancelTitle;

  /// No description provided for @towCancelBody.
  ///
  /// In ar, this message translates to:
  /// **'يمكن الإلغاء قبل تحميل السيارة فقط.'**
  String get towCancelBody;

  /// No description provided for @towCancelReason.
  ///
  /// In ar, this message translates to:
  /// **'السبب (اختياري)'**
  String get towCancelReason;

  /// No description provided for @towCancelAction.
  ///
  /// In ar, this message translates to:
  /// **'إلغاء الطلب'**
  String get towCancelAction;

  /// No description provided for @towStatusRequested.
  ///
  /// In ar, this message translates to:
  /// **'بانتظار سائق'**
  String get towStatusRequested;

  /// No description provided for @towStatusSearching.
  ///
  /// In ar, this message translates to:
  /// **'نبحث عن أقرب سطحة'**
  String get towStatusSearching;

  /// No description provided for @towStatusAssigned.
  ///
  /// In ar, this message translates to:
  /// **'تم تعيين سائق'**
  String get towStatusAssigned;

  /// No description provided for @towStatusEnRoutePickup.
  ///
  /// In ar, this message translates to:
  /// **'السائق في طريقه إليك'**
  String get towStatusEnRoutePickup;

  /// No description provided for @towStatusPickedUp.
  ///
  /// In ar, this message translates to:
  /// **'سيارتك على السطحة'**
  String get towStatusPickedUp;

  /// No description provided for @towStatusEnRouteDropoff.
  ///
  /// In ar, this message translates to:
  /// **'في الطريق إلى الوجهة'**
  String get towStatusEnRouteDropoff;

  /// No description provided for @towStatusDelivered.
  ///
  /// In ar, this message translates to:
  /// **'تم التسليم'**
  String get towStatusDelivered;

  /// No description provided for @towStatusCompleted.
  ///
  /// In ar, this message translates to:
  /// **'اكتمل'**
  String get towStatusCompleted;

  /// No description provided for @towStatusCancelled.
  ///
  /// In ar, this message translates to:
  /// **'ملغى'**
  String get towStatusCancelled;

  /// No description provided for @towStatusFailed.
  ///
  /// In ar, this message translates to:
  /// **'تعذّر التنفيذ'**
  String get towStatusFailed;

  /// No description provided for @towEmptyTitle.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد طلبات سطحة'**
  String get towEmptyTitle;

  /// No description provided for @towEmptyBody.
  ///
  /// In ar, this message translates to:
  /// **'اطلب سطحة عندما تحتاج نقل سيارتك.'**
  String get towEmptyBody;

  /// No description provided for @ptCheapest.
  ///
  /// In ar, this message translates to:
  /// **'الأرخص'**
  String get ptCheapest;

  /// No description provided for @ptFastest.
  ///
  /// In ar, this message translates to:
  /// **'الأسرع'**
  String get ptFastest;

  /// No description provided for @ptLongestWarranty.
  ///
  /// In ar, this message translates to:
  /// **'أطول ضمان'**
  String get ptLongestWarranty;

  /// No description provided for @ptWarrantiesEmptyTitle.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد ضمانات بعد'**
  String get ptWarrantiesEmptyTitle;

  /// No description provided for @ptWarrantiesEmptyBody.
  ///
  /// In ar, this message translates to:
  /// **'كل قطعة تُركّب لك عبر  صناعية تصلك بضمان رقمي هنا.'**
  String get ptWarrantiesEmptyBody;

  /// No description provided for @ptWarrantyActive.
  ///
  /// In ar, this message translates to:
  /// **'ساري'**
  String get ptWarrantyActive;

  /// No description provided for @ptWarrantyIssuer.
  ///
  /// In ar, this message translates to:
  /// **'الجهة الضامنة'**
  String get ptWarrantyIssuer;

  /// No description provided for @ptWarrantyFrom.
  ///
  /// In ar, this message translates to:
  /// **'يبدأ'**
  String get ptWarrantyFrom;

  /// No description provided for @ptWarrantyNumber.
  ///
  /// In ar, this message translates to:
  /// **'رقم الضمان'**
  String get ptWarrantyNumber;

  /// No description provided for @diffTitle.
  ///
  /// In ar, this message translates to:
  /// **'مقارنة حالة السيارة'**
  String get diffTitle;

  /// No description provided for @diffSub.
  ///
  /// In ar, this message translates to:
  /// **'قبل الإصلاح وبعده — بالصور'**
  String get diffSub;

  /// No description provided for @diffOpen.
  ///
  /// In ar, this message translates to:
  /// **'قارن حالة السيارة'**
  String get diffOpen;

  /// No description provided for @diffCleanTitle.
  ///
  /// In ar, this message translates to:
  /// **'سيارتك كما استلمناها'**
  String get diffCleanTitle;

  /// No description provided for @diffWaiting.
  ///
  /// In ar, this message translates to:
  /// **'بانتظار فحص التسليم للمقارنة.'**
  String get diffWaiting;

  /// No description provided for @diffAppeared.
  ///
  /// In ar, this message translates to:
  /// **'ظهر بعد الاستلام'**
  String get diffAppeared;

  /// No description provided for @diffWorsened.
  ///
  /// In ar, this message translates to:
  /// **'ازداد سوءاً'**
  String get diffWorsened;

  /// No description provided for @diffRepaired.
  ///
  /// In ar, this message translates to:
  /// **'تم إصلاحه'**
  String get diffRepaired;

  /// No description provided for @diffUnchanged.
  ///
  /// In ar, this message translates to:
  /// **'كما كان عند الاستلام'**
  String get diffUnchanged;

  /// No description provided for @diffCheckIn.
  ///
  /// In ar, this message translates to:
  /// **'صور الاستلام'**
  String get diffCheckIn;

  /// No description provided for @diffCheckOut.
  ///
  /// In ar, this message translates to:
  /// **'صور التسليم'**
  String get diffCheckOut;

  /// No description provided for @diffAiSuggested.
  ///
  /// In ar, this message translates to:
  /// **'رصد آلي'**
  String get diffAiSuggested;

  /// No description provided for @sevMinor.
  ///
  /// In ar, this message translates to:
  /// **'بسيط'**
  String get sevMinor;

  /// No description provided for @sevModerate.
  ///
  /// In ar, this message translates to:
  /// **'متوسط'**
  String get sevModerate;

  /// No description provided for @sevSevere.
  ///
  /// In ar, this message translates to:
  /// **'شديد'**
  String get sevSevere;

  /// No description provided for @diffFromTo.
  ///
  /// In ar, this message translates to:
  /// **'من {from} إلى {to}'**
  String diffFromTo(String from, String to);

  /// No description provided for @flToday.
  ///
  /// In ar, this message translates to:
  /// **'أسطولك اليوم'**
  String get flToday;

  /// No description provided for @flVehicles.
  ///
  /// In ar, this message translates to:
  /// **'مركبة'**
  String get flVehicles;

  /// No description provided for @flOpenRepairs.
  ///
  /// In ar, this message translates to:
  /// **'إصلاح مفتوح'**
  String get flOpenRepairs;

  /// No description provided for @flAwaiting.
  ///
  /// In ar, this message translates to:
  /// **'بانتظار قرارك'**
  String get flAwaiting;

  /// No description provided for @flMonthSpend.
  ///
  /// In ar, this message translates to:
  /// **'التزام هذا الشهر'**
  String get flMonthSpend;

  /// No description provided for @flBudgetLeft.
  ///
  /// In ar, this message translates to:
  /// **'المتبقي من الميزانية {amount}'**
  String flBudgetLeft(String amount);

  /// No description provided for @flNoPolicy.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد سياسة صرف — كل إصلاح يحتاج اعتمادك.'**
  String get flNoPolicy;

  /// No description provided for @flPolicyLine.
  ///
  /// In ar, this message translates to:
  /// **'سياسة «{name}»: اعتماد تلقائي تحت {auto}'**
  String flPolicyLine(String name, String auto);

  /// No description provided for @flInboxTitle.
  ///
  /// In ar, this message translates to:
  /// **'بانتظار قرارك'**
  String get flInboxTitle;

  /// No description provided for @flInboxEmpty.
  ///
  /// In ar, this message translates to:
  /// **'لا يوجد ما ينتظر قرارك'**
  String get flInboxEmpty;

  /// No description provided for @flInboxEmptyBody.
  ///
  /// In ar, this message translates to:
  /// **'كل الإصلاحات إما معتمدة أو تحت حد الاعتماد التلقائي.'**
  String get flInboxEmptyBody;

  /// No description provided for @flNeedsOne.
  ///
  /// In ar, this message translates to:
  /// **'يحتاج اعتماداً واحداً'**
  String get flNeedsOne;

  /// No description provided for @flNeedsTwo.
  ///
  /// In ar, this message translates to:
  /// **'يحتاج اعتماد شخصين'**
  String get flNeedsTwo;

  /// No description provided for @flAutoOk.
  ///
  /// In ar, this message translates to:
  /// **'تحت الحد — جاهز للتوقيع'**
  String get flAutoOk;

  /// No description provided for @flBlockedWorkshop.
  ///
  /// In ar, this message translates to:
  /// **'الورشة خارج القائمة المعتمدة'**
  String get flBlockedWorkshop;

  /// No description provided for @flOverBudget.
  ///
  /// In ar, this message translates to:
  /// **'يتجاوز ميزانية الشهر'**
  String get flOverBudget;

  /// No description provided for @flApprovedBy.
  ///
  /// In ar, this message translates to:
  /// **'اعتمده {name}'**
  String flApprovedBy(String name);

  /// No description provided for @flRejectedBy.
  ///
  /// In ar, this message translates to:
  /// **'رفضه {name}'**
  String flRejectedBy(String name);

  /// No description provided for @flApprove.
  ///
  /// In ar, this message translates to:
  /// **'أوافق على الصرف'**
  String get flApprove;

  /// No description provided for @flReject.
  ///
  /// In ar, this message translates to:
  /// **'أرفض'**
  String get flReject;

  /// No description provided for @flDecisionNote.
  ///
  /// In ar, this message translates to:
  /// **'ملاحظة (اختياري)'**
  String get flDecisionNote;

  /// No description provided for @flDecisionHint.
  ///
  /// In ar, this message translates to:
  /// **'قرارك يُسجَّل باسمك. التوقيع النهائي خطوة مستقلة عبر نفاذ أو رمز التحقق.'**
  String get flDecisionHint;

  /// No description provided for @flReadyToSign.
  ///
  /// In ar, this message translates to:
  /// **'اكتمل الاعتماد — وقّع الآن'**
  String get flReadyToSign;

  /// No description provided for @flDecided.
  ///
  /// In ar, this message translates to:
  /// **'سُجّل قرارك'**
  String get flDecided;

  /// No description provided for @flRejectedDone.
  ///
  /// In ar, this message translates to:
  /// **'سُجّل الرفض — لن يبدأ العمل'**
  String get flRejectedDone;

  /// No description provided for @accTitle.
  ///
  /// In ar, this message translates to:
  /// **'تقرير الحادث'**
  String get accTitle;

  /// No description provided for @accSub.
  ///
  /// In ar, this message translates to:
  /// **'ملف التأمين المرتبط بهذا الإصلاح'**
  String get accSub;

  /// No description provided for @accOpen.
  ///
  /// In ar, this message translates to:
  /// **'تقرير الحادث'**
  String get accOpen;

  /// No description provided for @accLookupLabel.
  ///
  /// In ar, this message translates to:
  /// **'رقم بلاغ الحادث'**
  String get accLookupLabel;

  /// No description provided for @accLookupHint.
  ///
  /// In ar, this message translates to:
  /// **'مثال: ACC-2026-000123'**
  String get accLookupHint;

  /// No description provided for @accLookup.
  ///
  /// In ar, this message translates to:
  /// **'استعلام'**
  String get accLookup;

  /// No description provided for @accNotLinked.
  ///
  /// In ar, this message translates to:
  /// **'لا يوجد تقرير مرتبط'**
  String get accNotLinked;

  /// No description provided for @accNotLinkedBody.
  ///
  /// In ar, this message translates to:
  /// **'استعلم برقم البلاغ لدى شركة التأمين ثم اربطه بهذا الأمر.'**
  String get accNotLinkedBody;

  /// No description provided for @accLink.
  ///
  /// In ar, this message translates to:
  /// **'اربط بهذا الأمر'**
  String get accLink;

  /// No description provided for @accLinked.
  ///
  /// In ar, this message translates to:
  /// **'رُبط التقرير بالأمر'**
  String get accLinked;

  /// No description provided for @accInsurer.
  ///
  /// In ar, this message translates to:
  /// **'شركة التأمين'**
  String get accInsurer;

  /// No description provided for @accClaimNo.
  ///
  /// In ar, this message translates to:
  /// **'رقم المطالبة'**
  String get accClaimNo;

  /// No description provided for @accApproved.
  ///
  /// In ar, this message translates to:
  /// **'اعتمده التأمين'**
  String get accApproved;

  /// No description provided for @accDeductible.
  ///
  /// In ar, this message translates to:
  /// **'التحمّل'**
  String get accDeductible;

  /// No description provided for @accFault.
  ///
  /// In ar, this message translates to:
  /// **'نسبة الخطأ'**
  String get accFault;

  /// No description provided for @accCustomerPays.
  ///
  /// In ar, this message translates to:
  /// **'المتوقع على العميل'**
  String get accCustomerPays;

  /// No description provided for @accDamages.
  ///
  /// In ar, this message translates to:
  /// **'أضرار المُقيِّم'**
  String get accDamages;

  /// No description provided for @accSuggested.
  ///
  /// In ar, this message translates to:
  /// **'بنود مقترحة لأمر العمل'**
  String get accSuggested;

  /// No description provided for @accSuggestedHint.
  ///
  /// In ar, this message translates to:
  /// **'من تقرير المُقيِّم — راجعها وسعّرها بنفسك ثم أضفها.'**
  String get accSuggestedHint;

  /// No description provided for @accNotPriced.
  ///
  /// In ar, this message translates to:
  /// **'الملف قيد التقييم — لا مبالغ بعد. حدّث لاحقاً.'**
  String get accNotPriced;

  /// No description provided for @accSubmitRepair.
  ///
  /// In ar, this message translates to:
  /// **'سجّل تقرير الإصلاح لدى الجهة'**
  String get accSubmitRepair;

  /// No description provided for @accSubmitted.
  ///
  /// In ar, this message translates to:
  /// **'سُجّل تقرير الإصلاح'**
  String get accSubmitted;

  /// No description provided for @accSubmittedRef.
  ///
  /// In ar, this message translates to:
  /// **'مرجع التسجيل {ref}'**
  String accSubmittedRef(String ref);

  /// No description provided for @accCoverage.
  ///
  /// In ar, this message translates to:
  /// **'التأمين يغطي {amount}'**
  String accCoverage(String amount);

  /// No description provided for @accActRepair.
  ///
  /// In ar, this message translates to:
  /// **'إصلاح'**
  String get accActRepair;

  /// No description provided for @accActReplace.
  ///
  /// In ar, this message translates to:
  /// **'استبدال'**
  String get accActReplace;

  /// No description provided for @accActPaint.
  ///
  /// In ar, this message translates to:
  /// **'سمكرة ودهان'**
  String get accActPaint;

  /// No description provided for @towVatIncluded.
  ///
  /// In ar, this message translates to:
  /// **'شامل الضريبة'**
  String get towVatIncluded;

  /// No description provided for @dsTitle.
  ///
  /// In ar, this message translates to:
  /// **'نزاع'**
  String get dsTitle;

  /// No description provided for @dsOpen.
  ///
  /// In ar, this message translates to:
  /// **'فتح نزاع'**
  String get dsOpen;

  /// No description provided for @dsActive.
  ///
  /// In ar, this message translates to:
  /// **'نزاع مفتوح على هذا الطلب'**
  String get dsActive;

  /// No description provided for @dsView.
  ///
  /// In ar, this message translates to:
  /// **'عرض النزاع'**
  String get dsView;

  /// No description provided for @dsMoneyHeld.
  ///
  /// In ar, this message translates to:
  /// **'المبلغ محفوظ حتى يُحل النزاع'**
  String get dsMoneyHeld;

  /// No description provided for @dsPlatformDecides.
  ///
  /// In ar, this message translates to:
  /// **'تراجع المنصة الطرفين وتقرر — لا يلزمك إجراء آخر.'**
  String get dsPlatformDecides;

  /// No description provided for @dsDescribe.
  ///
  /// In ar, this message translates to:
  /// **'صف المشكلة'**
  String get dsDescribe;

  /// No description provided for @dsDescribeHint.
  ///
  /// In ar, this message translates to:
  /// **'ما الذي حدث؟ وما الذي تطلبه؟'**
  String get dsDescribeHint;

  /// No description provided for @dsCategory.
  ///
  /// In ar, this message translates to:
  /// **'نوع المشكلة'**
  String get dsCategory;

  /// No description provided for @dsAttach.
  ///
  /// In ar, this message translates to:
  /// **'أرفق صورة'**
  String get dsAttach;

  /// No description provided for @dsOpenCta.
  ///
  /// In ar, this message translates to:
  /// **'افتح النزاع'**
  String get dsOpenCta;

  /// No description provided for @dsOpened.
  ///
  /// In ar, this message translates to:
  /// **'فُتح النزاع — المبلغ محفوظ حتى يُحل'**
  String get dsOpened;

  /// No description provided for @dsMessageHint.
  ///
  /// In ar, this message translates to:
  /// **'اكتب رسالتك…'**
  String get dsMessageHint;

  /// No description provided for @dsEvidence.
  ///
  /// In ar, this message translates to:
  /// **'الصور والأدلة'**
  String get dsEvidence;

  /// No description provided for @dsConversation.
  ///
  /// In ar, this message translates to:
  /// **'المحادثة'**
  String get dsConversation;

  /// No description provided for @dsResolved.
  ///
  /// In ar, this message translates to:
  /// **'قرار المنصة'**
  String get dsResolved;

  /// No description provided for @dsCatScope.
  ///
  /// In ar, this message translates to:
  /// **'نطاق العمل'**
  String get dsCatScope;

  /// No description provided for @dsCatQuality.
  ///
  /// In ar, this message translates to:
  /// **'جودة التنفيذ'**
  String get dsCatQuality;

  /// No description provided for @dsCatPrice.
  ///
  /// In ar, this message translates to:
  /// **'السعر'**
  String get dsCatPrice;

  /// No description provided for @dsCatDelay.
  ///
  /// In ar, this message translates to:
  /// **'تأخير'**
  String get dsCatDelay;

  /// No description provided for @dsCatDamage.
  ///
  /// In ar, this message translates to:
  /// **'ضرر بالسيارة'**
  String get dsCatDamage;

  /// No description provided for @dsCatPartDefect.
  ///
  /// In ar, this message translates to:
  /// **'عيب في القطعة'**
  String get dsCatPartDefect;

  /// No description provided for @dsCatNoShow.
  ///
  /// In ar, this message translates to:
  /// **'عدم حضور'**
  String get dsCatNoShow;

  /// No description provided for @dsStOpen.
  ///
  /// In ar, this message translates to:
  /// **'مفتوح'**
  String get dsStOpen;

  /// No description provided for @dsStUnderReview.
  ///
  /// In ar, this message translates to:
  /// **'قيد المراجعة'**
  String get dsStUnderReview;

  /// No description provided for @dsStAwaiting.
  ///
  /// In ar, this message translates to:
  /// **'بانتظار الأطراف'**
  String get dsStAwaiting;

  /// No description provided for @dsStEscalated.
  ///
  /// In ar, this message translates to:
  /// **'مصعّد'**
  String get dsStEscalated;

  /// No description provided for @dsStResolved.
  ///
  /// In ar, this message translates to:
  /// **'صدر القرار'**
  String get dsStResolved;

  /// No description provided for @dsStClosed.
  ///
  /// In ar, this message translates to:
  /// **'مغلق'**
  String get dsStClosed;

  /// No description provided for @abTitle.
  ///
  /// In ar, this message translates to:
  /// **'مركبة لم تُستلم'**
  String get abTitle;

  /// No description provided for @abNotice.
  ///
  /// In ar, this message translates to:
  /// **'إنذار {n}'**
  String abNotice(int n);

  /// No description provided for @abFormal.
  ///
  /// In ar, this message translates to:
  /// **'رسمي'**
  String get abFormal;

  /// No description provided for @abDueAfter.
  ///
  /// In ar, this message translates to:
  /// **'يُستحق بعد {days} يوماً من الجاهزية'**
  String abDueAfter(int days);

  /// No description provided for @abDaysReady.
  ///
  /// In ar, this message translates to:
  /// **'جاهزة منذ {days} يوماً'**
  String abDaysReady(int days);

  /// No description provided for @abStorage.
  ///
  /// In ar, this message translates to:
  /// **'رسوم التخزين'**
  String get abStorage;

  /// No description provided for @abFreeThen.
  ///
  /// In ar, this message translates to:
  /// **'{free} أيام سماح ثم {perDay} يومياً'**
  String abFreeThen(int free, String perDay);

  /// No description provided for @abDeclare.
  ///
  /// In ar, this message translates to:
  /// **'إعلان مركبة مهجورة'**
  String get abDeclare;

  /// No description provided for @abDeclareWarn.
  ///
  /// In ar, this message translates to:
  /// **'إجراء نظامي لا رجعة فيه: تُسجَّل السيارة مهجورة وتُضاف رسوم التخزين إلى المطالبة تمهيداً للتنفيذ.'**
  String get abDeclareWarn;

  /// No description provided for @abDeclared.
  ///
  /// In ar, this message translates to:
  /// **'أُعلنت المركبة مهجورة'**
  String get abDeclared;

  /// No description provided for @abReason.
  ///
  /// In ar, this message translates to:
  /// **'السبب (اختياري)'**
  String get abReason;

  /// No description provided for @abCustomerReady.
  ///
  /// In ar, this message translates to:
  /// **'سيارتك جاهزة — استلمها الآن. التأخر يرتب رسوم تخزين وقد تُعدّ السيارة مهجورة نظاماً.'**
  String get abCustomerReady;

  /// No description provided for @abCustomerDeclared.
  ///
  /// In ar, this message translates to:
  /// **'أُعلنت السيارة مهجورة لعدم الاستلام — تواصل مع الورشة فوراً لتسوية المستحقات.'**
  String get abCustomerDeclared;

  /// No description provided for @accAddItems.
  ///
  /// In ar, this message translates to:
  /// **'أضفها لأمر العمل'**
  String get accAddItems;

  /// No description provided for @accAddItemsHint.
  ///
  /// In ar, this message translates to:
  /// **'تُضاف كنسخة جديدة تحتاج إعادة اعتماد العميل.'**
  String get accAddItemsHint;

  /// No description provided for @accItemsAdded.
  ///
  /// In ar, this message translates to:
  /// **'أُضيفت البنود — أرسلها للاعتماد'**
  String get accItemsAdded;

  /// No description provided for @accPriceEach.
  ///
  /// In ar, this message translates to:
  /// **'سعّر كل بند قبل الإضافة'**
  String get accPriceEach;

  /// No description provided for @flStatements.
  ///
  /// In ar, this message translates to:
  /// **'الكشوف الشهرية'**
  String get flStatements;

  /// No description provided for @flStatementsBody.
  ///
  /// In ar, this message translates to:
  /// **'ملخص شهري لفواتير أسطولك — جاهز للمحاسبة.'**
  String get flStatementsBody;

  /// No description provided for @flStatementsEmpty.
  ///
  /// In ar, this message translates to:
  /// **'لا كشوف بعد'**
  String get flStatementsEmpty;

  /// No description provided for @flStatementsEmptyBody.
  ///
  /// In ar, this message translates to:
  /// **'أنشئ كشف الشهر لتحصل على ملخص فواتير أسطولك في ملف واحد.'**
  String get flStatementsEmptyBody;

  /// No description provided for @flGenerateStatement.
  ///
  /// In ar, this message translates to:
  /// **'أنشئ كشف هذا الشهر'**
  String get flGenerateStatement;

  /// No description provided for @flStatementGenerated.
  ///
  /// In ar, this message translates to:
  /// **'جُهّز كشف الشهر'**
  String get flStatementGenerated;

  /// No description provided for @flInvoicesCount.
  ///
  /// In ar, this message translates to:
  /// **'{n} فاتورة'**
  String flInvoicesCount(int n);

  /// No description provided for @flCopyCsv.
  ///
  /// In ar, this message translates to:
  /// **'نسخ CSV'**
  String get flCopyCsv;

  /// No description provided for @flCsvCopied.
  ///
  /// In ar, this message translates to:
  /// **'نُسخ الكشف — ألصقه في جداولك'**
  String get flCsvCopied;

  /// No description provided for @srFix.
  ///
  /// In ar, this message translates to:
  /// **'أصلح سيارتي'**
  String get srFix;

  /// No description provided for @srFixBody.
  ///
  /// In ar, this message translates to:
  /// **'صف المشكلة، وقارن عروض الورش القريبة.'**
  String get srFixBody;

  /// No description provided for @srDescribe.
  ///
  /// In ar, this message translates to:
  /// **'صف المشكلة'**
  String get srDescribe;

  /// No description provided for @srDescribeHint.
  ///
  /// In ar, this message translates to:
  /// **'ما الذي تسمعه أو تراه؟ الصورة تغني عن ألف كلمة.'**
  String get srDescribeHint;

  /// No description provided for @srWhere.
  ///
  /// In ar, this message translates to:
  /// **'موقعك'**
  String get srWhere;

  /// No description provided for @srWhereHint.
  ///
  /// In ar, this message translates to:
  /// **'الصق رابط خرائط أو إحداثيات مثل 24.71, 46.67'**
  String get srWhereHint;

  /// No description provided for @srRadius.
  ///
  /// In ar, this message translates to:
  /// **'نطاق البحث'**
  String get srRadius;

  /// No description provided for @srKm.
  ///
  /// In ar, this message translates to:
  /// **'{n} كم'**
  String srKm(int n);

  /// No description provided for @srWhen.
  ///
  /// In ar, this message translates to:
  /// **'متى تريد الإصلاح؟'**
  String get srWhen;

  /// No description provided for @srNow.
  ///
  /// In ar, this message translates to:
  /// **'الآن'**
  String get srNow;

  /// No description provided for @srToday.
  ///
  /// In ar, this message translates to:
  /// **'اليوم'**
  String get srToday;

  /// No description provided for @srThisWeek.
  ///
  /// In ar, this message translates to:
  /// **'هذا الأسبوع'**
  String get srThisWeek;

  /// No description provided for @srSend.
  ///
  /// In ar, this message translates to:
  /// **'أرسل الطلب'**
  String get srSend;

  /// No description provided for @srSent.
  ///
  /// In ar, this message translates to:
  /// **'أُرسل طلبك — العروض ستظهر هنا'**
  String get srSent;

  /// No description provided for @srMine.
  ///
  /// In ar, this message translates to:
  /// **'طلبات الإصلاح'**
  String get srMine;

  /// No description provided for @srOffers.
  ///
  /// In ar, this message translates to:
  /// **'العروض'**
  String get srOffers;

  /// No description provided for @srNoOffers.
  ///
  /// In ar, this message translates to:
  /// **'لا عروض بعد — الورش القريبة تدرس طلبك.'**
  String get srNoOffers;

  /// No description provided for @srWiden.
  ///
  /// In ar, this message translates to:
  /// **'وسّع النطاق إلى {n} كم'**
  String srWiden(int n);

  /// No description provided for @srWidened.
  ///
  /// In ar, this message translates to:
  /// **'وُسّع نطاق البحث'**
  String get srWidened;

  /// No description provided for @srFreeInspection.
  ///
  /// In ar, this message translates to:
  /// **'معاينة مجانية'**
  String get srFreeInspection;

  /// No description provided for @srEstimate.
  ///
  /// In ar, this message translates to:
  /// **'سعر تقديري'**
  String get srEstimate;

  /// No description provided for @srPriceRange.
  ///
  /// In ar, this message translates to:
  /// **'من {min} إلى {max}'**
  String srPriceRange(String min, String max);

  /// No description provided for @srFinalPriceNote.
  ///
  /// In ar, this message translates to:
  /// **'السعر النهائي يُعتمد بعد الفحص وبتوقيعك — لا مفاجآت.'**
  String get srFinalPriceNote;

  /// No description provided for @srAccepted.
  ///
  /// In ar, this message translates to:
  /// **'قُبل العرض — أُنشئ أمر العمل'**
  String get srAccepted;

  /// No description provided for @srNearestBadge.
  ///
  /// In ar, this message translates to:
  /// **'الأقرب'**
  String get srNearestBadge;

  /// No description provided for @srTopRatedBadge.
  ///
  /// In ar, this message translates to:
  /// **'الأعلى تقييماً'**
  String get srTopRatedBadge;

  /// No description provided for @srPrevUsedBadge.
  ///
  /// In ar, this message translates to:
  /// **'سبق تعاملك معها'**
  String get srPrevUsedBadge;

  /// No description provided for @srNearby.
  ///
  /// In ar, this message translates to:
  /// **'طلبات إصلاح قريبة'**
  String get srNearby;

  /// No description provided for @srNearbyCount.
  ///
  /// In ar, this message translates to:
  /// **'{n} طلبات إصلاح قريبة'**
  String srNearbyCount(int n);

  /// No description provided for @srRespond.
  ///
  /// In ar, this message translates to:
  /// **'قدّم عرضك'**
  String get srRespond;

  /// No description provided for @srDiagnosis.
  ///
  /// In ar, this message translates to:
  /// **'تحليلك للمشكلة'**
  String get srDiagnosis;

  /// No description provided for @srDiagnosisHint.
  ///
  /// In ar, this message translates to:
  /// **'سطر يشرح ما تظنه السبب — هو ما يميّز عرضك.'**
  String get srDiagnosisHint;

  /// No description provided for @srPriceMin.
  ///
  /// In ar, this message translates to:
  /// **'السعر من'**
  String get srPriceMin;

  /// No description provided for @srPriceMax.
  ///
  /// In ar, this message translates to:
  /// **'إلى'**
  String get srPriceMax;

  /// No description provided for @srAvailability.
  ///
  /// In ar, this message translates to:
  /// **'متى تستقبل السيارة؟'**
  String get srAvailability;

  /// No description provided for @srOfferSent.
  ///
  /// In ar, this message translates to:
  /// **'أُرسل عرضك'**
  String get srOfferSent;

  /// No description provided for @srCancelRequest.
  ///
  /// In ar, this message translates to:
  /// **'ألغِ الطلب'**
  String get srCancelRequest;

  /// No description provided for @srSpecialistBadge.
  ///
  /// In ar, this message translates to:
  /// **'متخصصون في سيارتك'**
  String get srSpecialistBadge;

  /// No description provided for @srRespondsIn.
  ///
  /// In ar, this message translates to:
  /// **'يرد خلال ~{n} دقيقة'**
  String srRespondsIn(int n);

  /// No description provided for @voUnavailable.
  ///
  /// In ar, this message translates to:
  /// **'الإملاء الصوتي غير متاح على هذا الجهاز.'**
  String get voUnavailable;

  /// No description provided for @voSpeak.
  ///
  /// In ar, this message translates to:
  /// **'تكلم الآن'**
  String get voSpeak;

  /// No description provided for @voListening.
  ///
  /// In ar, this message translates to:
  /// **'أستمع…'**
  String get voListening;

  /// No description provided for @voHeardNothing.
  ///
  /// In ar, this message translates to:
  /// **'لم أسمع شيئاً — جرّب مرة أخرى'**
  String get voHeardNothing;

  /// No description provided for @voAgain.
  ///
  /// In ar, this message translates to:
  /// **'أعد'**
  String get voAgain;

  /// No description provided for @voDone.
  ///
  /// In ar, this message translates to:
  /// **'تم'**
  String get voDone;

  /// No description provided for @voDictateItems.
  ///
  /// In ar, this message translates to:
  /// **'أملِ البنود صوتاً'**
  String get voDictateItems;

  /// No description provided for @voReviewTitle.
  ///
  /// In ar, this message translates to:
  /// **'راجع ما سُمع'**
  String get voReviewTitle;

  /// No description provided for @voHeard.
  ///
  /// In ar, this message translates to:
  /// **'سُمع: {text}'**
  String voHeard(String text);

  /// No description provided for @voNeedsPrice.
  ///
  /// In ar, this message translates to:
  /// **'يحتاج سعراً'**
  String get voNeedsPrice;

  /// No description provided for @voApply.
  ///
  /// In ar, this message translates to:
  /// **'أضف البنود المسعّرة'**
  String get voApply;

  /// No description provided for @voApplied.
  ///
  /// In ar, this message translates to:
  /// **'أُضيفت البنود — تحتاج إعادة اعتماد العميل'**
  String get voApplied;

  /// No description provided for @voDiscard.
  ///
  /// In ar, this message translates to:
  /// **'تجاهل'**
  String get voDiscard;

  /// No description provided for @voUploadFailed.
  ///
  /// In ar, this message translates to:
  /// **'لم يُرفع التسجيل — نصك محفوظ، أعد المحاولة'**
  String get voUploadFailed;

  /// No description provided for @voRetryUpload.
  ///
  /// In ar, this message translates to:
  /// **'أعد الرفع'**
  String get voRetryUpload;

  /// No description provided for @assistantTooltip.
  ///
  /// In ar, this message translates to:
  /// **'المساعد الصوتي'**
  String get assistantTooltip;

  /// No description provided for @assistantTitle.
  ///
  /// In ar, this message translates to:
  /// **'تكلّم — أنا أسمع'**
  String get assistantTitle;

  /// No description provided for @assistantAck.
  ///
  /// In ar, this message translates to:
  /// **'حاضر —'**
  String get assistantAck;

  /// No description provided for @assistantTryCustomer.
  ///
  /// In ar, this message translates to:
  /// **'لم أفهم — جرّب: «اطلب سطحة» أو «أصلح سيارتي»'**
  String get assistantTryCustomer;

  /// No description provided for @assistantTryPartner.
  ///
  /// In ar, this message translates to:
  /// **'لم أفهم — جرّب: «أمر جديد» أو «الطلبات القريبة»'**
  String get assistantTryPartner;

  /// No description provided for @voDevTyped.
  ///
  /// In ar, this message translates to:
  /// **'بيئة تطوير — الإملاء غير متاح على المحاكي'**
  String get voDevTyped;

  /// No description provided for @voDevTypedHint.
  ///
  /// In ar, this message translates to:
  /// **'اكتب ما كنت ستقوله'**
  String get voDevTypedHint;

  /// No description provided for @voDevBroken.
  ///
  /// In ar, this message translates to:
  /// **'بيئة تطوير — الإملاء لا يعمل على هذا المحاكي'**
  String get voDevBroken;

  /// No description provided for @voTypeInstead.
  ///
  /// In ar, this message translates to:
  /// **'اكتب بدلاً'**
  String get voTypeInstead;

  /// No description provided for @ptSendDelivery.
  ///
  /// In ar, this message translates to:
  /// **'أرسلها بتوصيل المنصة'**
  String get ptSendDelivery;

  /// No description provided for @ptDeliverySent.
  ///
  /// In ar, this message translates to:
  /// **'أُرسلت — نبحث عن سائق قريب'**
  String get ptDeliverySent;

  /// No description provided for @ptDeliveryTitle.
  ///
  /// In ar, this message translates to:
  /// **'توصيل المنصة'**
  String get ptDeliveryTitle;

  /// No description provided for @ptManualShip.
  ///
  /// In ar, this message translates to:
  /// **'شُحنت يدوياً (خارج توصيل المنصة)'**
  String get ptManualShip;

  /// No description provided for @ptDeliveryPickedUp.
  ///
  /// In ar, this message translates to:
  /// **'القطعة مع السائق'**
  String get ptDeliveryPickedUp;

  /// No description provided for @srNoVehicle.
  ///
  /// In ar, this message translates to:
  /// **'أضف سيارتك أولاً'**
  String get srNoVehicle;

  /// No description provided for @srNoVehicleBody.
  ///
  /// In ar, this message translates to:
  /// **'الورش تسعّر حسب نوع السيارة وموديلها — بدونها لا تستطيع تقدير التكلفة.'**
  String get srNoVehicleBody;

  /// No description provided for @srAddVehicle.
  ///
  /// In ar, this message translates to:
  /// **'أضف سيارة'**
  String get srAddVehicle;

  /// No description provided for @ptEndedNoBids.
  ///
  /// In ar, this message translates to:
  /// **'انتهى بلا عروض — أعد النشر بنطاق أوسع أو اشترِ من نتائج البحث'**
  String get ptEndedNoBids;

  /// No description provided for @ptToolsTitle.
  ///
  /// In ar, this message translates to:
  /// **'أدواتي'**
  String get ptToolsTitle;

  /// No description provided for @ptTradeRowSub.
  ///
  /// In ar, this message translates to:
  /// **'حسابك الآجل مع المورّدين'**
  String get ptTradeRowSub;

  /// No description provided for @wsQuickAdd.
  ///
  /// In ar, this message translates to:
  /// **'أضف بنداً بسطر'**
  String get wsQuickAdd;

  /// No description provided for @wsQuickAddHint.
  ///
  /// In ar, this message translates to:
  /// **'تغيير زيت وفلتر بمئتين وستين'**
  String get wsQuickAddHint;

  /// No description provided for @wsQuickAddNeedsPrice.
  ///
  /// In ar, this message translates to:
  /// **'أضف السعر ليكتمل البند'**
  String get wsQuickAddNeedsPrice;

  /// No description provided for @wsItemDetails.
  ///
  /// In ar, this message translates to:
  /// **'تفاصيل أكثر (ضمان، حالة القطعة)'**
  String get wsItemDetails;

  /// No description provided for @wsPaint.
  ///
  /// In ar, this message translates to:
  /// **'سمكرة ودهان'**
  String get wsPaint;

  /// No description provided for @wsDiagnostic.
  ///
  /// In ar, this message translates to:
  /// **'فحص'**
  String get wsDiagnostic;

  /// No description provided for @wsTowing.
  ///
  /// In ar, this message translates to:
  /// **'سطحة'**
  String get wsTowing;

  /// No description provided for @sar.
  ///
  /// In ar, this message translates to:
  /// **'ر.س'**
  String get sar;

  /// No description provided for @vinScan.
  ///
  /// In ar, this message translates to:
  /// **'امسح رقم الهيكل'**
  String get vinScan;

  /// No description provided for @vinScanNotFound.
  ///
  /// In ar, this message translates to:
  /// **'هذا الرمز ليس رقم هيكل — جرّب ملصق عمود الباب'**
  String get vinScanNotFound;

  /// No description provided for @wsInbox.
  ///
  /// In ar, this message translates to:
  /// **'ما يحتاجك الآن'**
  String get wsInbox;

  /// No description provided for @wsInboxCount.
  ///
  /// In ar, this message translates to:
  /// **'{n} بند'**
  String wsInboxCount(int n);

  /// No description provided for @wsInboxDisputes.
  ///
  /// In ar, this message translates to:
  /// **'نزاعات مفتوحة — المبلغ مجمّد حتى القرار'**
  String get wsInboxDisputes;

  /// No description provided for @wsInboxAbandonRisk.
  ///
  /// In ar, this message translates to:
  /// **'سيارات جاهزة لم يستلمها أصحابها'**
  String get wsInboxAbandonRisk;

  /// No description provided for @wsInboxAwaitingApproval.
  ///
  /// In ar, this message translates to:
  /// **'أوامر تنتظر اعتماد العميل'**
  String get wsInboxAwaitingApproval;

  /// No description provided for @wsInboxReady.
  ///
  /// In ar, this message translates to:
  /// **'جاهزة للتسليم'**
  String get wsInboxReady;

  /// No description provided for @wsInboxCheckout.
  ///
  /// In ar, this message translates to:
  /// **'تحتاج فحص تسليم'**
  String get wsInboxCheckout;

  /// No description provided for @wsInboxServiceRequests.
  ///
  /// In ar, this message translates to:
  /// **'طلبات إصلاح قريبة تنتظر عرضك'**
  String get wsInboxServiceRequests;

  /// No description provided for @wsInboxPartBids.
  ///
  /// In ar, this message translates to:
  /// **'طلبات قطع تنتظر عرضك'**
  String get wsInboxPartBids;

  /// No description provided for @wsInboxUnpaid.
  ///
  /// In ar, this message translates to:
  /// **'مسلَّمة بلا فاتورة'**
  String get wsInboxUnpaid;

  /// No description provided for @wsTitleOptional.
  ///
  /// In ar, this message translates to:
  /// **'وصف مختصر (اختياري)'**
  String get wsTitleOptional;

  /// No description provided for @wsTitleAuto.
  ///
  /// In ar, this message translates to:
  /// **'إن تركته فارغاً يُسمّى الأمر ببنوده.'**
  String get wsTitleAuto;

  /// No description provided for @wsNeedCar.
  ///
  /// In ar, this message translates to:
  /// **'أضف لوحة السيارة أو رقم الهيكل.'**
  String get wsNeedCar;

  /// No description provided for @wsNeedItem.
  ///
  /// In ar, this message translates to:
  /// **'أضف بنداً واحداً على الأقل.'**
  String get wsNeedItem;

  /// No description provided for @dueOnYou.
  ///
  /// In ar, this message translates to:
  /// **'مستحقّ عليك'**
  String get dueOnYou;

  /// No description provided for @dueOverdueHint.
  ///
  /// In ar, this message translates to:
  /// **'تأخّر السداد — يبدأ الإنذار الرسمي ثم التنفيذ.'**
  String get dueOverdueHint;

  /// No description provided for @dueCount.
  ///
  /// In ar, this message translates to:
  /// **'{n, plural, =1{فاتورة واحدة بانتظار السداد} =2{فاتورتان بانتظار السداد} other{{n} بانتظار السداد}}'**
  String dueCount(int n);

  /// No description provided for @loginPromise.
  ///
  /// In ar, this message translates to:
  /// **'سيارتك من العطل إلى الطريق — في مكان واحد.'**
  String get loginPromise;

  /// No description provided for @loginTrustSign.
  ///
  /// In ar, this message translates to:
  /// **'اعتماد موقّع'**
  String get loginTrustSign;

  /// No description provided for @loginTrustEscrow.
  ///
  /// In ar, this message translates to:
  /// **'المبلغ محفوظ'**
  String get loginTrustEscrow;

  /// No description provided for @loginTrustInvoice.
  ///
  /// In ar, this message translates to:
  /// **'فاتورة نظامية'**
  String get loginTrustInvoice;

  /// No description provided for @loginNafathNote.
  ///
  /// In ar, this message translates to:
  /// **'برقم جوالك تدخل، وبتوقيعك تعتمد.'**
  String get loginNafathNote;

  /// No description provided for @drvOnline.
  ///
  /// In ar, this message translates to:
  /// **'متصل — تصلك المهام'**
  String get drvOnline;

  /// No description provided for @drvOffline.
  ///
  /// In ar, this message translates to:
  /// **'غير متصل'**
  String get drvOffline;

  /// No description provided for @drvNearby.
  ///
  /// In ar, this message translates to:
  /// **'مهام قريبة منك'**
  String get drvNearby;

  /// No description provided for @drvNeedOrg.
  ///
  /// In ar, this message translates to:
  /// **'اربط حسابك بمنشأة النقل قبل قبول المهام — الفاتورة تصدر باسم المنشأة.'**
  String get drvNeedOrg;

  /// No description provided for @drvPickup.
  ///
  /// In ar, this message translates to:
  /// **'الاستلام'**
  String get drvPickup;

  /// No description provided for @drvDropoff.
  ///
  /// In ar, this message translates to:
  /// **'التسليم'**
  String get drvDropoff;

  /// No description provided for @drvKm.
  ///
  /// In ar, this message translates to:
  /// **'{km} كم'**
  String drvKm(String km);

  /// No description provided for @drvOfflineTitle.
  ///
  /// In ar, this message translates to:
  /// **'أنت غير متصل'**
  String get drvOfflineTitle;

  /// No description provided for @drvOfflineBody.
  ///
  /// In ar, this message translates to:
  /// **'فعّل الاتصال أعلاه لترى المهام القريبة منك.'**
  String get drvOfflineBody;

  /// No description provided for @drvNoOffersTitle.
  ///
  /// In ar, this message translates to:
  /// **'لا مهام قريبة الآن'**
  String get drvNoOffersTitle;

  /// No description provided for @drvNoOffersBody.
  ///
  /// In ar, this message translates to:
  /// **'سنعرض لك أي طلب سطحة يصل قرب موقعك.'**
  String get drvNoOffersBody;

  /// No description provided for @drvActStart.
  ///
  /// In ar, this message translates to:
  /// **'في الطريق للاستلام'**
  String get drvActStart;

  /// No description provided for @drvActLoaded.
  ///
  /// In ar, this message translates to:
  /// **'حمّلت السيارة'**
  String get drvActLoaded;

  /// No description provided for @drvActHeading.
  ///
  /// In ar, this message translates to:
  /// **'في الطريق للتسليم'**
  String get drvActHeading;

  /// No description provided for @drvActDeliver.
  ///
  /// In ar, this message translates to:
  /// **'تسليم وإثبات'**
  String get drvActDeliver;

  /// No description provided for @drvActDone.
  ///
  /// In ar, this message translates to:
  /// **'تمّت'**
  String get drvActDone;

  /// No description provided for @truckFlatbed.
  ///
  /// In ar, this message translates to:
  /// **'سطحة'**
  String get truckFlatbed;

  /// No description provided for @truckWheelLift.
  ///
  /// In ar, this message translates to:
  /// **'رافعة عجلات'**
  String get truckWheelLift;

  /// No description provided for @truckPartsDelivery.
  ///
  /// In ar, this message translates to:
  /// **'توصيل قطع'**
  String get truckPartsDelivery;

  /// No description provided for @drvProofTitle.
  ///
  /// In ar, this message translates to:
  /// **'إثبات التسليم'**
  String get drvProofTitle;

  /// No description provided for @drvProofWhy.
  ///
  /// In ar, this message translates to:
  /// **'صورة السيارة عند التسليم، ورمزٌ تقرؤه من المستلم. بهما تُغلق المهمة ويُصرف المبلغ.'**
  String get drvProofWhy;

  /// No description provided for @drvPhotoStep.
  ///
  /// In ar, this message translates to:
  /// **'صوّر السيارة في مكان التسليم'**
  String get drvPhotoStep;

  /// No description provided for @drvPhotoDone.
  ///
  /// In ar, this message translates to:
  /// **'الصورة جاهزة'**
  String get drvPhotoDone;

  /// No description provided for @drvTakePhoto.
  ///
  /// In ar, this message translates to:
  /// **'التقط صورة'**
  String get drvTakePhoto;

  /// No description provided for @drvRetakePhoto.
  ///
  /// In ar, this message translates to:
  /// **'إعادة التصوير'**
  String get drvRetakePhoto;

  /// No description provided for @drvCodeStep.
  ///
  /// In ar, this message translates to:
  /// **'اطلب الرمز ليصل إلى جوال المستلم، ثم اقرأه منه.'**
  String get drvCodeStep;

  /// No description provided for @drvCodeSent.
  ///
  /// In ar, this message translates to:
  /// **'أُرسل الرمز إلى جوال المستلم.'**
  String get drvCodeSent;

  /// No description provided for @drvSendCode.
  ///
  /// In ar, this message translates to:
  /// **'أرسل الرمز'**
  String get drvSendCode;

  /// No description provided for @drvResendCode.
  ///
  /// In ar, this message translates to:
  /// **'إعادة الإرسال'**
  String get drvResendCode;

  /// No description provided for @drvComplete.
  ///
  /// In ar, this message translates to:
  /// **'إنهاء المهمة'**
  String get drvComplete;

  /// No description provided for @tabDriverJobs.
  ///
  /// In ar, this message translates to:
  /// **'مهامي'**
  String get tabDriverJobs;

  /// No description provided for @flPolicyTitle.
  ///
  /// In ar, this message translates to:
  /// **'قواعد الصرف'**
  String get flPolicyTitle;

  /// No description provided for @flPolicyName.
  ///
  /// In ar, this message translates to:
  /// **'سياسة الأسطول'**
  String get flPolicyName;

  /// No description provided for @flPolicyWhy.
  ///
  /// In ar, this message translates to:
  /// **'ثلاثة أرقام تحكم كل أمر إصلاح: ما يمرّ بلا اعتماد، وما يحتاج شخصين، وسقف الشهر.'**
  String get flPolicyWhy;

  /// No description provided for @flPolicyAuto.
  ///
  /// In ar, this message translates to:
  /// **'اعتماد تلقائي تحت'**
  String get flPolicyAuto;

  /// No description provided for @flPolicyAutoHint.
  ///
  /// In ar, this message translates to:
  /// **'أقل من هذا المبلغ يمرّ بلا انتظار أحد.'**
  String get flPolicyAutoHint;

  /// No description provided for @flPolicyTwo.
  ///
  /// In ar, this message translates to:
  /// **'يحتاج معتمدَين فوق'**
  String get flPolicyTwo;

  /// No description provided for @flPolicyTwoHint.
  ///
  /// In ar, this message translates to:
  /// **'اتركه فارغاً إن كان اعتماد شخص واحد يكفي دائماً.'**
  String get flPolicyTwoHint;

  /// No description provided for @flPolicyBudget.
  ///
  /// In ar, this message translates to:
  /// **'ميزانية الشهر'**
  String get flPolicyBudget;

  /// No description provided for @flPolicyBudgetHint.
  ///
  /// In ar, this message translates to:
  /// **'يُرفض ما يتجاوزها. اتركه فارغاً بلا سقف.'**
  String get flPolicyBudgetHint;

  /// No description provided for @flPolicyMeaning.
  ///
  /// In ar, this message translates to:
  /// **'ماذا يعني ذلك'**
  String get flPolicyMeaning;

  /// No description provided for @flPolicySave.
  ///
  /// In ar, this message translates to:
  /// **'حفظ القواعد'**
  String get flPolicySave;

  /// No description provided for @flPolicyContradiction.
  ///
  /// In ar, this message translates to:
  /// **'حدّ المعتمدَين أقل من حدّ الاعتماد التلقائي — لن يمرّ أي أمر باعتماد واحد.'**
  String get flPolicyContradiction;

  /// No description provided for @flOutAuto.
  ///
  /// In ar, this message translates to:
  /// **'يمرّ تلقائياً'**
  String get flOutAuto;

  /// No description provided for @flOutOne.
  ///
  /// In ar, this message translates to:
  /// **'اعتماد واحد'**
  String get flOutOne;

  /// No description provided for @flOutTwo.
  ///
  /// In ar, this message translates to:
  /// **'اعتماد شخصين'**
  String get flOutTwo;

  /// No description provided for @flOutOverBudget.
  ///
  /// In ar, this message translates to:
  /// **'يتجاوز الميزانية'**
  String get flOutOverBudget;

  /// No description provided for @flPolicyEntry.
  ///
  /// In ar, this message translates to:
  /// **'قواعد الصرف'**
  String get flPolicyEntry;

  /// No description provided for @spAddPhoto.
  ///
  /// In ar, this message translates to:
  /// **'صوّر القطعة'**
  String get spAddPhoto;

  /// No description provided for @spAddMorePhotos.
  ///
  /// In ar, this message translates to:
  /// **'صورة أخرى ({n} متبقية)'**
  String spAddMorePhotos(int n);

  /// No description provided for @ptSeePart.
  ///
  /// In ar, this message translates to:
  /// **'صور القطعة'**
  String get ptSeePart;

  /// No description provided for @inNewService.
  ///
  /// In ar, this message translates to:
  /// **'طلب إصلاح وصلك الآن'**
  String get inNewService;

  /// No description provided for @inNewPart.
  ///
  /// In ar, this message translates to:
  /// **'طلب قطعة وصلك الآن'**
  String get inNewPart;

  /// No description provided for @inMore.
  ///
  /// In ar, this message translates to:
  /// **'+{n} آخر'**
  String inMore(int n);

  /// No description provided for @inOpen.
  ///
  /// In ar, this message translates to:
  /// **'شوف الطلب'**
  String get inOpen;

  /// No description provided for @inIgnore.
  ///
  /// In ar, this message translates to:
  /// **'تجاهل'**
  String get inIgnore;

  /// No description provided for @srWhatYouNotice.
  ///
  /// In ar, this message translates to:
  /// **'ما الذي تلاحظه؟'**
  String get srWhatYouNotice;

  /// No description provided for @srPickMore.
  ///
  /// In ar, this message translates to:
  /// **'اختر كل ما ينطبق — كلما وضّحت، جاء العرض أدقّ.'**
  String get srPickMore;

  /// No description provided for @srNoteOptional.
  ///
  /// In ar, this message translates to:
  /// **'تفاصيل تساعد الورشة (اختياري)'**
  String get srNoteOptional;

  /// No description provided for @srNoteHint.
  ///
  /// In ar, this message translates to:
  /// **'متى يحدث؟ ومنذ متى؟'**
  String get srNoteHint;

  /// No description provided for @srHere.
  ///
  /// In ar, this message translates to:
  /// **'موقعك الحالي'**
  String get srHere;

  /// No description provided for @srLocating.
  ///
  /// In ar, this message translates to:
  /// **'نحدّد موقعك…'**
  String get srLocating;

  /// No description provided for @srLocateFailed.
  ///
  /// In ar, this message translates to:
  /// **'تعذّر تحديد موقعك'**
  String get srLocateFailed;

  /// No description provided for @srLocateManual.
  ///
  /// In ar, this message translates to:
  /// **'أدخله يدوياً'**
  String get srLocateManual;

  /// No description provided for @srUseMyLocation.
  ///
  /// In ar, this message translates to:
  /// **'استعمل موقعي'**
  String get srUseMyLocation;

  /// No description provided for @srWhenAsk.
  ///
  /// In ar, this message translates to:
  /// **'متى يناسبك؟'**
  String get srWhenAsk;

  /// No description provided for @srOffersComing.
  ///
  /// In ar, this message translates to:
  /// **'ستصلك عروض الورش القريبة خلال دقائق — تقارنها وتختار.'**
  String get srOffersComing;

  /// No description provided for @reqFixHero.
  ///
  /// In ar, this message translates to:
  /// **'سيارتك فيها مشكلة؟'**
  String get reqFixHero;

  /// No description provided for @reqFixHeroBody.
  ///
  /// In ar, this message translates to:
  /// **'صف ما تلاحظه، وتصلك عروض الورش القريبة — تقارنها وتختار بلا أن تدور عليها.'**
  String get reqFixHeroBody;

  /// No description provided for @reqNearby.
  ///
  /// In ar, this message translates to:
  /// **'ورش قريبة منك'**
  String get reqNearby;

  /// No description provided for @reqNearbySpecialised.
  ///
  /// In ar, this message translates to:
  /// **'متخصّصة بسيارتك'**
  String get reqNearbySpecialised;

  /// No description provided for @reqNearbyNew.
  ///
  /// In ar, this message translates to:
  /// **'جديدة'**
  String get reqNearbyNew;

  /// No description provided for @reqNearbyAsk.
  ///
  /// In ar, this message translates to:
  /// **'اطلب منها'**
  String get reqNearbyAsk;

  /// No description provided for @tabHome.
  ///
  /// In ar, this message translates to:
  /// **'الرئيسية'**
  String get tabHome;

  /// No description provided for @tabMyOrders.
  ///
  /// In ar, this message translates to:
  /// **'طلباتي'**
  String get tabMyOrders;

  /// No description provided for @homeGreeting.
  ///
  /// In ar, this message translates to:
  /// **'ما الذي تحتاجه لسيارتك؟'**
  String get homeGreeting;

  /// No description provided for @homeNothingLive.
  ///
  /// In ar, this message translates to:
  /// **'لا يوجد شيء جارٍ الآن'**
  String get homeNothingLive;

  /// No description provided for @myOrdersEmpty.
  ///
  /// In ar, this message translates to:
  /// **'لا طلبات جارية'**
  String get myOrdersEmpty;

  /// No description provided for @myOrdersEmptyBody.
  ///
  /// In ar, this message translates to:
  /// **'كل ما تطلبه — إصلاح أو قطعة أو سطحة — يظهر هنا حتى ينتهي.'**
  String get myOrdersEmptyBody;

  /// No description provided for @moRepairs.
  ///
  /// In ar, this message translates to:
  /// **'الإصلاح'**
  String get moRepairs;

  /// No description provided for @moParts.
  ///
  /// In ar, this message translates to:
  /// **'القطع'**
  String get moParts;

  /// No description provided for @moTow.
  ///
  /// In ar, this message translates to:
  /// **'السطحة'**
  String get moTow;

  /// No description provided for @moDue.
  ///
  /// In ar, this message translates to:
  /// **'مستحقّ عليك'**
  String get moDue;

  /// No description provided for @obTitle.
  ///
  /// In ar, this message translates to:
  /// **'سجّل ورشتك'**
  String get obTitle;

  /// No description provided for @obBody.
  ///
  /// In ar, this message translates to:
  /// **'دقائق، ثم تصلك طلبات العملاء حولك.'**
  String get obBody;

  /// No description provided for @obName.
  ///
  /// In ar, this message translates to:
  /// **'اسم الورشة'**
  String get obName;

  /// No description provided for @obNameHint.
  ///
  /// In ar, this message translates to:
  /// **'كما في السجل التجاري'**
  String get obNameHint;

  /// No description provided for @obCr.
  ///
  /// In ar, this message translates to:
  /// **'رقم السجل التجاري'**
  String get obCr;

  /// No description provided for @obCrHint.
  ///
  /// In ar, this message translates to:
  /// **'10 أرقام'**
  String get obCrHint;

  /// No description provided for @obCrOptional.
  ///
  /// In ar, this message translates to:
  /// **'تستطيع إضافته لاحقاً'**
  String get obCrOptional;

  /// No description provided for @obType.
  ///
  /// In ar, this message translates to:
  /// **'نوع النشاط'**
  String get obType;

  /// No description provided for @obTypeWorkshop.
  ///
  /// In ar, this message translates to:
  /// **'ورشة'**
  String get obTypeWorkshop;

  /// No description provided for @obTypeBody.
  ///
  /// In ar, this message translates to:
  /// **'سمكرة ودهان'**
  String get obTypeBody;

  /// No description provided for @obTypeService.
  ///
  /// In ar, this message translates to:
  /// **'مركز خدمة'**
  String get obTypeService;

  /// No description provided for @obTypeScrap.
  ///
  /// In ar, this message translates to:
  /// **'تشليح'**
  String get obTypeScrap;

  /// No description provided for @obTypeParts.
  ///
  /// In ar, this message translates to:
  /// **'قطع غيار'**
  String get obTypeParts;

  /// No description provided for @obLocation.
  ///
  /// In ar, this message translates to:
  /// **'أين ورشتك؟'**
  String get obLocation;

  /// No description provided for @obLocationBody.
  ///
  /// In ar, this message translates to:
  /// **'موقعك يحدّد من يصله طلبك — العملاء حولك يرونك أولاً.'**
  String get obLocationBody;

  /// No description provided for @obUseMyLocation.
  ///
  /// In ar, this message translates to:
  /// **'استعمل موقعي الحالي'**
  String get obUseMyLocation;

  /// No description provided for @obCity.
  ///
  /// In ar, this message translates to:
  /// **'المدينة'**
  String get obCity;

  /// No description provided for @obDistrict.
  ///
  /// In ar, this message translates to:
  /// **'الحي'**
  String get obDistrict;

  /// No description provided for @obDocs.
  ///
  /// In ar, this message translates to:
  /// **'وثيقتان للتحقّق'**
  String get obDocs;

  /// No description provided for @obDocsBody.
  ///
  /// In ar, this message translates to:
  /// **'السجل التجاري وهوية المالك. لا يراهما إلا فريق المراجعة.'**
  String get obDocsBody;

  /// No description provided for @obDocCr.
  ///
  /// In ar, this message translates to:
  /// **'السجل التجاري'**
  String get obDocCr;

  /// No description provided for @obDocId.
  ///
  /// In ar, this message translates to:
  /// **'هوية المالك'**
  String get obDocId;

  /// No description provided for @obUpload.
  ///
  /// In ar, this message translates to:
  /// **'أرفق'**
  String get obUpload;

  /// No description provided for @obUploaded.
  ///
  /// In ar, this message translates to:
  /// **'أُرفقت'**
  String get obUploaded;

  /// No description provided for @obSubmit.
  ///
  /// In ar, this message translates to:
  /// **'أرسل للمراجعة'**
  String get obSubmit;

  /// No description provided for @obNext.
  ///
  /// In ar, this message translates to:
  /// **'التالي'**
  String get obNext;

  /// No description provided for @obCreate.
  ///
  /// In ar, this message translates to:
  /// **'أنشئ الورشة'**
  String get obCreate;

  /// No description provided for @obPending.
  ///
  /// In ar, this message translates to:
  /// **'ورشتك قيد المراجعة'**
  String get obPending;

  /// No description provided for @obPendingBody.
  ///
  /// In ar, this message translates to:
  /// **'يراجعها فريق المنصة عادةً خلال يوم عمل، ونُشعرك فور اعتمادها — عندها تبدأ طلبات العملاء بالوصول.'**
  String get obPendingBody;

  /// No description provided for @obDraft.
  ///
  /// In ar, this message translates to:
  /// **'أكمل تسجيل ورشتك'**
  String get obDraft;

  /// No description provided for @obRejected.
  ///
  /// In ar, this message translates to:
  /// **'المراجعة تحتاج تعديلاً'**
  String get obRejected;

  /// No description provided for @obStepInfo.
  ///
  /// In ar, this message translates to:
  /// **'بيانات الورشة'**
  String get obStepInfo;

  /// No description provided for @obStepPlace.
  ///
  /// In ar, this message translates to:
  /// **'الموقع'**
  String get obStepPlace;

  /// No description provided for @obStepDocs.
  ///
  /// In ar, this message translates to:
  /// **'الوثائق'**
  String get obStepDocs;

  /// No description provided for @welcomeSkip.
  ///
  /// In ar, this message translates to:
  /// **'تخطَّ'**
  String get welcomeSkip;

  /// No description provided for @welcomeNext.
  ///
  /// In ar, this message translates to:
  /// **'التالي'**
  String get welcomeNext;

  /// No description provided for @welcomeStart.
  ///
  /// In ar, this message translates to:
  /// **'ابدأ'**
  String get welcomeStart;

  /// No description provided for @welcome1Title.
  ///
  /// In ar, this message translates to:
  /// **'قول وش فيها.. والعروض تجيك'**
  String get welcome1Title;

  /// No description provided for @welcome1Body.
  ///
  /// In ar, this message translates to:
  /// **'وصّف العطل بكم نقرة، والعروض توصلك — قارن واختر.'**
  String get welcome1Body;

  /// No description provided for @welcome2Title.
  ///
  /// In ar, this message translates to:
  /// **'فلوسك محفوظة بضمان'**
  String get welcome2Title;

  /// No description provided for @welcome2Body.
  ///
  /// In ar, this message translates to:
  /// **'فلوسك في حساب ضامن، وما تنصرف إلا بعد الاستلام أو نهاية المهلة.'**
  String get welcome2Body;

  /// No description provided for @welcome3Title.
  ///
  /// In ar, this message translates to:
  /// **'كل شي موثّق باسمك'**
  String get welcome3Title;

  /// No description provided for @welcome3Body.
  ///
  /// In ar, this message translates to:
  /// **'سعر باعتمادك، وصور قبل وبعد، وفاتورة نظامية.'**
  String get welcome3Body;

  /// No description provided for @setupTitle.
  ///
  /// In ar, this message translates to:
  /// **'جهّز حسابك'**
  String get setupTitle;

  /// No description provided for @setupSubtitle.
  ///
  /// In ar, this message translates to:
  /// **'دقيقة وحدة: اسمك وسيارتك'**
  String get setupSubtitle;

  /// No description provided for @setupStepName.
  ///
  /// In ar, this message translates to:
  /// **'اسمك'**
  String get setupStepName;

  /// No description provided for @setupStepCar.
  ///
  /// In ar, this message translates to:
  /// **'سيارتك'**
  String get setupStepCar;

  /// No description provided for @setupNameTitle.
  ///
  /// In ar, this message translates to:
  /// **'وش نناديك؟'**
  String get setupNameTitle;

  /// No description provided for @setupNameBody.
  ///
  /// In ar, this message translates to:
  /// **'يطلع في اعتماداتك وفواتيرك.'**
  String get setupNameBody;

  /// No description provided for @setupNameLabel.
  ///
  /// In ar, this message translates to:
  /// **'الاسم'**
  String get setupNameLabel;

  /// No description provided for @setupNameHint.
  ///
  /// In ar, this message translates to:
  /// **'مثال: مشعل العتيبي'**
  String get setupNameHint;

  /// No description provided for @setupNameShort.
  ///
  /// In ar, this message translates to:
  /// **'اكتب اسماً من حرفين على الأقل'**
  String get setupNameShort;

  /// No description provided for @setupNext.
  ///
  /// In ar, this message translates to:
  /// **'التالي'**
  String get setupNext;

  /// No description provided for @setupCarTitle.
  ///
  /// In ar, this message translates to:
  /// **'أضف سيارتك'**
  String get setupCarTitle;

  /// No description provided for @setupCarBody.
  ///
  /// In ar, this message translates to:
  /// **'برقم الهيكل أو اللوحة — وسجلّها يمشي معها.'**
  String get setupCarBody;

  /// No description provided for @setupAddCar.
  ///
  /// In ar, this message translates to:
  /// **'أضف سيارتي'**
  String get setupAddCar;

  /// No description provided for @setupLater.
  ///
  /// In ar, this message translates to:
  /// **'لاحقاً'**
  String get setupLater;

  /// No description provided for @vcInService.
  ///
  /// In ar, this message translates to:
  /// **'في الورشة الآن — تابعها'**
  String get vcInService;

  /// No description provided for @vcNoHistory.
  ///
  /// In ar, this message translates to:
  /// **'سجلها يبدأ من أول صيانة'**
  String get vcNoHistory;

  /// No description provided for @vcLastService.
  ///
  /// In ar, this message translates to:
  /// **'آخر صيانة {date}'**
  String vcLastService(Object date);

  /// No description provided for @vcWarranties.
  ///
  /// In ar, this message translates to:
  /// **'{n} ضمان ساري'**
  String vcWarranties(Object n);

  /// No description provided for @editProfile.
  ///
  /// In ar, this message translates to:
  /// **'تعديل الملف'**
  String get editProfile;

  /// No description provided for @emailLabel.
  ///
  /// In ar, this message translates to:
  /// **'البريد الإلكتروني (اختياري)'**
  String get emailLabel;

  /// No description provided for @emailWhy.
  ///
  /// In ar, this message translates to:
  /// **'لإرسال فواتيرك وإيصالاتك — لا نستخدمه لغير ذلك.'**
  String get emailWhy;

  /// No description provided for @nameFromNafath.
  ///
  /// In ar, this message translates to:
  /// **'الاسم موثّق عبر نفاذ'**
  String get nameFromNafath;

  /// No description provided for @nameLockedUntil.
  ///
  /// In ar, this message translates to:
  /// **'الاسم يوقّع اعتماداتك — يمكن تغييره بعد {date}'**
  String nameLockedUntil(Object date);

  /// No description provided for @awaitingPricing.
  ///
  /// In ar, this message translates to:
  /// **'بانتظار التسعير'**
  String get awaitingPricing;

  /// No description provided for @aboutTitle.
  ///
  /// In ar, this message translates to:
  /// **'عن صناعية'**
  String get aboutTitle;

  /// No description provided for @supportTitle.
  ///
  /// In ar, this message translates to:
  /// **'الدعم'**
  String get supportTitle;

  /// No description provided for @aboutPromise.
  ///
  /// In ar, this message translates to:
  /// **'سيارتك من العطل إلى الطريق — في مكان واحد. كل اتفاق موقّع، وكل مبلغ محفوظ حتى تستلم، وكل شيء موثّق باسمك.'**
  String get aboutPromise;

  /// No description provided for @aboutVersion.
  ///
  /// In ar, this message translates to:
  /// **'النسخة {v}'**
  String aboutVersion(Object v);

  /// No description provided for @supportBody.
  ///
  /// In ar, this message translates to:
  /// **'واجهتك مشكلة أو عندك اقتراح؟ كلمنا وبنرد عليك بأسرع ما نقدر.'**
  String get supportBody;

  /// No description provided for @supportWhatsApp.
  ///
  /// In ar, this message translates to:
  /// **'راسلنا على واتساب'**
  String get supportWhatsApp;

  /// No description provided for @supportCall.
  ///
  /// In ar, this message translates to:
  /// **'اتصل بنا'**
  String get supportCall;

  /// No description provided for @termsNote.
  ///
  /// In ar, this message translates to:
  /// **'باستخدامك صناعية أنت توافق على شروط الاستخدام وسياسة الخصوصية — تُنشر نسختها الكاملة قبل الإطلاق العام.'**
  String get termsNote;
}

class _L10nDelegate extends LocalizationsDelegate<L10n> {
  const _L10nDelegate();

  @override
  Future<L10n> load(Locale locale) {
    return SynchronousFuture<L10n>(lookupL10n(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['ar', 'en'].contains(locale.languageCode);

  @override
  bool shouldReload(_L10nDelegate old) => false;
}

L10n lookupL10n(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'ar':
      return L10nAr();
    case 'en':
      return L10nEn();
  }

  throw FlutterError(
    'L10n.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
