import 'package:flutter/foundation.dart' show kIsWeb;
import '../../../core/config/app_config.dart';

/// أيّ تجربةٍ يرى هذا المستخدم.
///
/// على الجوال النكهة مخبوزة: المتاجر تطلب تطبيقات منفصلة، ومن نزّل «صناعتي للشركاء» يريدها.
///
/// وعلى **الوِب** لا معنى لثلاثة روابط — ومن يفتح رابطاً لا يختار «نسخة». عضويّته في منشأة هي
/// التي تقول من هو: بلا منشأة عميل، ومعها شريك. رابطٌ واحد يخدم الثلاثة، وهذا ما يجعله منتجاً
/// واحداً لا ثلاثة تتشابه.
///
/// والأساطيل تبقى مخبوزة: عضويّتها منشأةٌ أيضاً، فلا يميّزها الحساب وحده — نكهةٌ صريحة لا تخمين.
AppFlavor effectiveFlavor({required AppFlavor built, required bool hasOrg, bool isWeb = kIsWeb}) {
  if (!isWeb || built == AppFlavor.fleet) return built;
  return hasOrg ? AppFlavor.partner : AppFlavor.customer;
}

/// هل يُساق هذا المستخدم إلى تسجيل منشأته؟
///
/// «بلا منشأة» حقيقةٌ تُقرأ من حساب **هذا** المستخدم لا من قائمةٍ محفوظة: قائمة المنشآت كانت
/// تبقى في الذاكرة بعد تسجيل الخروج، فيدخل صاحب ورشة النور فتستقبله شاشة «سجّل ورشتك» ثوانيَ
/// قبل أن تصل قائمته — يُقال لمن ورشته قائمة منذ سنة أن يُنشئها (مشي حيّ على الوِب ٢٧ أغسطس).
///
/// و`me` قيد التحميل ليس «بلا منشأة»: من لا حساب له بعدُ لا يُساق إلى تسجيل شيء.
bool shouldOnboard({required AppFlavor flavor, required bool signedIn, required bool hasOrg}) =>
    flavor == AppFlavor.partner && signedIn && !hasOrg;

/// هل يُقاد هذا العميل خطوةً بخطوة لتجهيز حسابه؟
///
/// **غياب السيارة هو السائق** — منتجٌ مهمّته «سيارتي معطّلة» بلا سيارةٍ مسجّلة فارغُ اليدين،
/// والاسم خطوةٌ تُدرج قبلها عند غيابه. (كان الشرط «بلا اسمٍ وبلا سيارة» معاً — فحفظُ الاسم
/// أخرج المستخدم من البوابة قبل خطوة السيارة: اختبار المسار كشفها قبل أن يعيشها أحد.)
/// ومن صرفها بيده («لاحقاً») لا تعود تلحّ عليه. و«القائمة لم تصل بعد» ليس «بلا سيارة» —
/// درس «سجّل ورشتك» نفسه.
bool shouldGuideSetup({required AppFlavor flavor, required bool signedIn, required bool carsLoaded, required bool hasCars, required bool dismissed}) =>
    flavor == AppFlavor.customer && signedIn && !dismissed && carsLoaded && !hasCars;
