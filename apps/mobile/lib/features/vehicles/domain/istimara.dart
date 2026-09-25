/// قراءة استمارة المركبة السعودية من نصٍّ التقطته الكاميرا.
///
/// **لماذا:** أثقل حقلين في المنتج هما رقم الهيكل (١٧ خانة) واللوحة، والاستمارة في السيارة تحمل
/// الاثنين مطبوعَين مع سنة الصنع والماركة. صورةٌ واحدة تُغني عن كتابة كلها.
///
/// **قرار جوهري:** القراءة تجري **على الجهاز** لا على خادم. الاستمارة وثيقة تحمل اسم المالك ورقم
/// هويته، وإرسالها إلى خدمة خارجية قرارُ إقامة بيانات لا ميزة منتج (قاعدة المشروع §5.4). القراءة
/// داخل الجوال تُلغي السؤال من أصله.
///
/// **وما لا تفعله هذه الدالة:** لا تملأ حقلاً بثقة كاذبة. ما لم تجده تتركه فارغاً، والشاشة تعرض
/// ما قرأته ليصحّحه صاحبه — استمارةٌ تُقرأ خطأً تُنشئ سجلاً على سيارة أخرى، وهو أسوأ من حقل فارغ.
library;

import '../../../core/scan/vin.dart';

/// ما استُخرج من الاستمارة. كل حقل قد يكون null — والصورة الواحدة نادراً ما تعطي كل شيء.
class IstimaraRead {
  final String? vin;
  final String? plate;
  final int? year;
  final String? makeEn;

  /// الطراز كما تطبعه الاستمارة (كامري، سوناتا). **للعرض وحده**: الخادم يشتقّ الطراز من رقم
  /// الهيكل، ولا نُرسل قراءةً ضوئية لتصير سجلاً. فائدته أن يرى صاحبها «تويوتا كامري ٢٠١٩»
  /// فيتأكد أن الورقة المصوَّرة هي ورقة سيارته لا ورقة أخرى في الدرج.
  final String? modelEn;

  const IstimaraRead({this.vin, this.plate, this.year, this.makeEn, this.modelEn});
  bool get isEmpty => vin == null && plate == null && year == null && makeEn == null;
  int get found => [vin, plate, year?.toString(), makeEn].where((x) => x != null).length;

  /// سطر التأكيد: «تويوتا كامري · 2019» بما توفّر منه.
  String get carLine => [?makeEn, ?modelEn, if (year != null) '$year'].join(' · ');
}

/// الماركات الشائعة في السعودية — تُقرأ من الاستمارة بالإنجليزية غالباً.
const _makes = <String, String>{
  'TOYOTA': 'تويوتا', 'LEXUS': 'لكزس', 'HYUNDAI': 'هيونداي', 'KIA': 'كيا', 'NISSAN': 'نيسان',
  'FORD': 'فورد', 'CHEVROLET': 'شيفروليه', 'GMC': 'جي إم سي', 'HONDA': 'هوندا', 'MAZDA': 'مازدا',
  'MITSUBISHI': 'ميتسوبيشي', 'ISUZU': 'إيسوزو', 'MG': 'إم جي', 'CHANGAN': 'شانجان',
  'GEELY': 'جيلي', 'JETOUR': 'جيتور', 'CHERY': 'شيري', 'HAVAL': 'هافال', 'HONGQI': 'هونشي',
  'BMW': 'بي إم دبليو', 'MERCEDES': 'مرسيدس', 'AUDI': 'أودي', 'LAND ROVER': 'لاند روفر',
  'JEEP': 'جيب', 'DODGE': 'دودج', 'INFINITI': 'إنفينيتي', 'SUZUKI': 'سوزوكي', 'RENAULT': 'رينو',
};

final _year = RegExp(r'\b(19[8-9]\d|20[0-4]\d)\b');
/// «MODEL: CAMRY» أو «الطراز CAMRY» — كلمة أو كلمتان بعد العنوان، بلا أرقام السنة.
final _model = RegExp(r'(?:MODEL|TYPE|الطراز)\s*[:\-]?\s*([A-Z][A-Z0-9\-]{1,14}(?:\s[A-Z][A-Z0-9\-]{1,14})?)');
/// لوحة سعودية بالحروف اللاتينية على الاستمارة: ثلاثة حروف وأربعة أرقام بأي ترتيب.
final _plateLatin = RegExp(r'\b([A-Z]{3})[\s\-]?(\d{3,4})\b|\b(\d{3,4})[\s\-]?([A-Z]{3})\b');

/// [text] كامل ما قرأته الكاميرا (أسطر مفصولة بأسطر جديدة).
IstimaraRead parseIstimara(String text) {
  final up = text.toUpperCase();

  // رقم الهيكل بنفس المستخرِج المستعمل في مسح الباركود — قاعدة واحدة لرقم واحد، لا نسختان تختلفان.
  final vin = extractVin(up);

  String? make;
  for (final entry in _makes.entries) {
    if (up.contains(entry.key)) { make = entry.value; break; }
  }

  // سنة الصنع: تُؤخذ من الخانة العاشرة في رقم الهيكل حين يوجد (معيار عالمي أدقّ من قراءة ضوئية)،
  // وإلا فأول سنة معقولة في النص.
  int? year;
  // حذر: `replaceAll('', …)` يُدخل بديلاً بين كل حرفين ويُفتّت النص. فلا يُحذف إلا رقم موجود.
  final withoutVin = vin == null ? up : up.replaceAll(vin, ' ');
  final ym = _year.firstMatch(withoutVin);
  if (ym != null) year = int.tryParse(ym.group(0)!);

  String? plate;
  // ولا نبحث عن اللوحة داخل رقم الهيكل نفسه — فيه حروف وأرقام تشبهها.
  final pm = _plateLatin.firstMatch(withoutVin);
  if (pm != null) {
    final letters = pm.group(1) ?? pm.group(4)!;
    final digits = pm.group(2) ?? pm.group(3)!;
    plate = '$letters $digits';
  }

  // «MODEL YEAR 2019» عنوانٌ لا طراز، وهو يسبق «MODEL: CAMRY» على أغلب الاستمارات — فلا نتوقّف
  // عند أول مطابقة بل نتخطّى العناوين ونُكمل. التوقّف عند الأولى كان يُسقط الطراز دائماً.
  String? model;
  for (final mm in _model.allMatches(withoutVin)) {
    final raw = mm.group(1)!.trim();
    if (RegExp(r'^(YEAR|NO|NUMBER)\b').hasMatch(raw)) continue;
    model = raw; break;
  }

  return IstimaraRead(vin: vin, plate: plate, year: year, makeEn: make, modelEn: model);
}
