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
}
