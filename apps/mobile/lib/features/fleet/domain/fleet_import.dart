/// يقرأ ما لصقه مدير الأسطول — سطرٌ لكل مركبة — ويقرّر بنفسه ما إذا كان السطر رقم هيكل أم لوحة.
///
/// ١٧ حرفاً ورقماً بلا I/O/Q هو رقم هيكل؛ وما عداه لوحة كما كُتبت (الخادم يطبّعها عربيةً كانت أم لاتينية).
/// الفواصل والفواصل المنقوطة تُعامل كأسطر، والأسطر الفارغة تُهمل: قائمةٌ منسوخة من جدول تصل بأشكالٍ شتّى.
List<({String? vin, String? plate})> parseImportLines(String text) {
  final vinRe = RegExp(r'^[A-HJ-NPR-Z0-9]{17}$');
  return text.split(RegExp(r'[\n,;]')).map((l) => l.trim()).where((l) => l.isNotEmpty).map((l) {
    final u = l.toUpperCase().replaceAll(' ', '');
    return vinRe.hasMatch(u) ? (vin: u, plate: null) : (vin: null, plate: l);
  }).toList();
}
