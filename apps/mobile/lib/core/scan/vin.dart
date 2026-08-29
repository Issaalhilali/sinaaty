/// رقم الهيكل من ملصق الباركود.
///
/// **لماذا:** إدخال ١٧ خانة بإصبع على شاشة أثقل حقل في المنتج كله — خانة واحدة خاطئة تعني سيارة
/// أخرى، وفحص قطع لا يطابق، وسجل مركبة على مركبة غيرها. وكل سيارة تحمل الرقم مطبوعاً باركوداً على
/// عمود الباب، والكاميرا في التطبيق أصلاً.
///
/// الاستخراج متسامح مع ما تضيفه الملصقات (بادئة `I` في Code 39، مسافات، أسطر، حقول مجاورة) وصارم
/// في النتيجة: رقم الهيكل لا يحوي I ولا O ولا Q إطلاقاً — وهذا ما يميّزه عن أي باركود آخر على
/// السيارة.
library;

final _vinExact = RegExp(r'^[A-HJ-NPR-Z0-9]{17}$');
final _vinRun = RegExp(r'[A-HJ-NPR-Z0-9]{17}');

/// يُعيد رقم الهيكل من حمولة الباركود، أو null إن لم يكن فيها رقم صالح — فلا يُملأ الحقل بشيء
/// يشبه الرقم ولا يكون هو.
String? extractVin(String? raw) {
  if (raw == null) return null;
  final text = raw.toUpperCase();

  // أولاً: الحقول كما فصلها الملصق. أغلب ملصقات عمود الباب تحمل أكثر من حقل (الوزن، الطراز، سنة
  // الصنع) مفصولةً بمسافات أو أسطر أو نقطتين. تجريد الفواصل قبل البحث يلصق الحقول ببعضها فيصير
  // سطراً من ٢٥ خانة، فيُرفض كله — وهذا ما جعل الماسح «لا يعمل» على ملصق حقيقي.
  for (final token in text.split(RegExp(r'[^A-Z0-9]+'))) {
    final t = token.startsWith('I') && token.length == 18 ? token.substring(1) : token;
    if (_vinExact.hasMatch(t)) return t;
  }

  // ثم: باركود حقلٍ واحد بلا فواصل إطلاقاً.
  final cleaned = text.replaceAll(RegExp(r'[^A-Z0-9]'), '');
  if (cleaned.isEmpty) return null;
  final body = cleaned.startsWith('I') && cleaned.length == 18 ? cleaned.substring(1) : cleaned;
  final m = _vinRun.firstMatch(body);
  if (m == null) return null;
  // سطرٌ متصل أطول من ١٧ خانة ليس رقم هيكل — لا نقتطع منه ونزعم أنه هو.
  return RegExp('[A-Z0-9]{18,}').hasMatch(body) ? null : m.group(0)!;
}
