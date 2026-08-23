/// رقم الهيكل من ملصق الباركود.
///
/// **لماذا:** إدخال ١٧ خانة بإصبع على شاشة أثقل حقل في المنتج كله — خانة واحدة خاطئة تعني سيارة
/// أخرى، وفحص قطع لا يطابق، وسجل مركبة على مركبة غيرها. وكل سيارة تحمل الرقم مطبوعاً باركوداً على
/// عمود الباب، والكاميرا في التطبيق أصلاً (ماسح رموز القطع).
///
/// الاستخراج متسامح مع ما تضيفه الملصقات (بادئة `I` في Code 39، مسافات، أسطر) وصارم في النتيجة:
/// رقم الهيكل لا يحوي I ولا O ولا Q إطلاقاً — وهذا ما يميّز الرقم عن أي باركود آخر على السيارة.
library;

final _vinRun = RegExp(r'[A-HJ-NPR-Z0-9]{17}');

/// يُعيد رقم الهيكل من حمولة الباركود، أو null إن لم يكن فيها رقم صالح — فلا يُملأ الحقل بشيء
/// يشبه الرقم ولا يكون هو.
String? extractVin(String? raw) {
  if (raw == null) return null;
  final cleaned = raw.toUpperCase().replaceAll(RegExp(r'[^A-Z0-9]'), '');
  if (cleaned.isEmpty) return null;
  // Code 39 على بعض الملصقات يسبق الرقم بحرف I — وهو حرف لا يوجد في أرقام الهياكل أصلاً.
  final body = cleaned.startsWith('I') && cleaned.length == 18 ? cleaned.substring(1) : cleaned;
  final m = _vinRun.firstMatch(body);
  if (m == null) return null;
  final vin = m.group(0)!;
  // ملصق فيه رقم أطول من ١٧ خانة متصلة ليس رقم هيكل — لا نقتطع منه ونزعم أنه هو.
  final around = RegExp('[A-Z0-9]{18,}').hasMatch(body);
  return around ? null : vin;
}
