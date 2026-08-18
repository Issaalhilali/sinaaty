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
  /// **'صناعتي'**
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
  /// **'أهلاً بك في صناعتي'**
  String get loginTitle;

  /// No description provided for @loginSubtitle.
  ///
  /// In ar, this message translates to:
  /// **'أدخل رقم جوالك لنرسل لك رمز التحقق'**
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
  /// **'أدخل رقم الهيكل (17 خانة) أو رقم اللوحة — سنتعرّف على السيارة تلقائياً.'**
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
  /// **'المبلغ محفوظ حتى تستلم سيارتك'**
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
