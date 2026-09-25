/// سطر واحد يكتبه صاحب الورشة، يصير بنداً كاملاً.
///
/// **لماذا:** إضافة بند اليوم تعني فتح ورقة واختيار نوع وكتابة وصف وسعر وكمية وإغلاق — خمس لمسات
/// للبند الواحد، وصاحب الورشة يضيف خمسة بنود في الأمر الواحد عشرات المرات يومياً. الأسرع أن يكتب
/// كما يتكلم: «تغيير زيت وفلتر بمئتين وستين» أو «دسكات أمامية عدد ٢ بسعر ٤٨٠» — سطر واحد وانتهى.
///
/// **نقي بلا شبكة عمداً**: الورشة في قبو من خرسانة، والإشارة تذهب وتجيء، والكتابة يجب أن تستجيب في
/// اللحظة. القواعد هنا مرآة لمحرك الاستخراج في الخادم (`voice/domain/extraction.ts`) — ومن غيّر
/// أحدهما يغيّر الآخر. والخطر معدوم: **الناتج يُعرض قبل أن يُضاف**، فلا رقم يدخل أمراً بلا أن يراه إنسان.
library;

const _digits = {'٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9', '٫': '.'};

String normalizeDigits(String s) {
  final b = StringBuffer();
  for (final ch in s.split('')) {
    b.write(_digits[ch] ?? (ch == 'ـ' ? '' : ch));
  }
  return b.toString();
}

const _ones = {'واحد': 1, 'اثنين': 2, 'ثنتين': 2, 'ثلاثة': 3, 'ثلاث': 3, 'أربعة': 4, 'اربعة': 4, 'أربع': 4, 'اربع': 4, 'خمسة': 5, 'خمس': 5, 'ستة': 6, 'ست': 6, 'سبعة': 7, 'سبع': 7, 'ثمانية': 8, 'ثمان': 8, 'تسعة': 9, 'تسع': 9, 'عشرة': 10, 'عشر': 10};
const _tens = {'عشرين': 20, 'ثلاثين': 30, 'أربعين': 40, 'اربعين': 40, 'خمسين': 50, 'ستين': 60, 'سبعين': 70, 'ثمانين': 80, 'تسعين': 90};
const _hundreds = {'مئة': 100, 'مية': 100, 'مائة': 100, 'مئتين': 200, 'ميتين': 200, 'ثلاثمئة': 300, 'أربعمئة': 400, 'اربعمئة': 400, 'خمسمئة': 500, 'خمسمائة': 500, 'ستمئة': 600, 'سبعمئة': 700, 'ثمانمئة': 800, 'تسعمئة': 900};
const _thousands = {'ألف': 1000, 'الف': 1000, 'ألفين': 2000, 'الفين': 2000, 'آلاف': 1000};

/// «مئتين وستين» → 260 · «ألف وخمسمئة» → 1500 · «٤٨٠» → 480. وتُعيد null حين لا رقم في الكلام —
/// السعر الذي لم يُقل يبقى فارغاً ولا يُخمَّن، لأن العميل يوقّع على هذا المبلغ.
num? parseSpokenNumber(String input) {
  final text = normalizeDigits(input);
  final d = RegExp(r'(\d+(?:\.\d+)?)').firstMatch(text);
  if (d != null) return num.parse(d.group(1)!);

  var total = 0, pending = 0; var found = false;
  for (final raw in text.replaceAll(RegExp(r'[^ء-ي\s]'), ' ').split(RegExp(r'\s+')).where((w) => w.isNotEmpty)) {
    final w = raw.startsWith('و') && raw.length > 1 ? raw.substring(1) : raw;
    if (_thousands[w] != null) { total += (pending == 0 ? 1 : pending) * (w == 'آلاف' ? 1000 : _thousands[w]!); pending = 0; found = true; continue; }
    if (_hundreds[w] != null) { total += _hundreds[w]!; pending = 0; found = true; continue; }
    if (_tens[w] != null) { total += _tens[w]!; pending = 0; found = true; continue; }
    if (_ones[w] != null) { pending = _ones[w]!; total += _ones[w]!; found = true; continue; }
  }
  return found ? total : null;
}

/// الفعل في أول الجملة يعني عملاً حتى لو ذُكرت فيه قطعة: «تغيير زيت» أجرة عمل لا كيس زيت.
const _actionFirst = ['تغيير', 'تركيب', 'فك', 'صيانة', 'ضبط', 'برمجة', 'غسيل', 'إصلاح', 'اصلاح'];
const _rules = <String, List<String>>{
  'paint': ['سمكرة', 'دهان', 'بوية', 'رش'],
  'diagnostic': ['فحص', 'كشف', 'تشخيص'],
  'towing': ['سطحة', 'قطر'],
  'part': ['فلتر', 'دسكات', 'بطارية', 'مساعد', 'كمبروسر', 'ردياتير', 'طرمبة', 'قطعة', 'زيت', 'فحمات', 'إطار', 'اطار'],
  'labor': ['تغيير', 'تركيب', 'فك', 'صيانة', 'ضبط', 'برمجة', 'أجور', 'اجور', 'غسيل'],
};
const _priceWords = ['بسعر', 'بمبلغ', 'السعر', 'قيمته', 'قيمتها', 'المبلغ'];
final _numberStart = RegExp(r'^(?:[\d.]|مئ|مي|مائ|ألف|الف|خمس|ست|سبع|ثمان|تسع|عشر|ثلاث|أربع|اربع|واحد|اثن|ثنت)');

/// ما فُهم من السطر — يُعرض للمستخدم قبل الإضافة، فيرى ما سيُنشأ لا ما خمّنه الجهاز.
class QuickLine {
  final String type;
  final String descriptionAr;
  final String quantity;
  final String? unitPrice;
  const QuickLine({required this.type, required this.descriptionAr, required this.quantity, this.unitPrice});

  bool get isComplete => descriptionAr.trim().length >= 2 && unitPrice != null;
}

/// يقرأ السطر كما يكتبه صاحب الورشة. يعيد null إن كان السطر أقصر من أن يعني شيئاً.
QuickLine? parseQuickLine(String raw) {
  final text = normalizeDigits(raw).trim();
  if (text.length < 2) return null;

  var words = text.split(RegExp(r'\s+')).where((w) => w.isNotEmpty).toList();

  // الكمية: «عدد ٢» أو «٢×» أو «×٢» — تُنتزع أولاً كي لا تُقرأ سعراً.
  var quantity = '1';
  final qtyAt = words.indexWhere((w) => w == 'عدد' || w == 'كمية');
  if (qtyAt >= 0 && qtyAt + 1 < words.length) {
    final q = parseSpokenNumber(words[qtyAt + 1]);
    if (q != null) { quantity = '${q.toInt()}'; words = [...words.take(qtyAt), ...words.skip(qtyAt + 2)]; }
  } else {
    final xAt = words.indexWhere((w) => RegExp(r'^\d+\s*[×xX*]$|^[×xX*]\s*\d+$').hasMatch(w));
    if (xAt >= 0) {
      final q = parseSpokenNumber(words[xAt]);
      if (q != null) { quantity = '${q.toInt()}'; words = [...words.take(xAt), ...words.skip(xAt + 1)]; }
    }
  }

  // السعر: بعد كلمة سعر، أو ملتصقاً بالباء («بمئتين»)، أو الرقم الوحيد في السطر.
  num? price; var priceFrom = -1, priceTo = -1;
  final markerAt = words.indexWhere(_priceWords.contains);
  if (markerAt >= 0) {
    price = parseSpokenNumber(words.skip(markerAt + 1).join(' '));
    priceFrom = markerAt; priceTo = words.length;
  } else {
    final attachedAt = words.indexWhere((w) => w.length > 1 && w.startsWith('ب') && _numberStart.hasMatch(w.substring(1)));
    if (attachedAt >= 0) {
      price = parseSpokenNumber([words[attachedAt].substring(1), ...words.skip(attachedAt + 1)].join(' '));
      priceFrom = attachedAt; priceTo = words.length;
    } else {
      final numeric = words.where((w) => RegExp(r'^\d+(?:\.\d+)?$').hasMatch(w)).toList();
      if (numeric.length == 1) {
        price = num.parse(numeric.first);
        priceFrom = words.indexOf(numeric.first); priceTo = priceFrom + 1;
      }
    }
  }

  final descWords = priceFrom >= 0 ? [...words.take(priceFrom), ...words.skip(priceTo)] : words;
  final description = descWords.join(' ').trim();
  if (description.length < 2) return null;

  final startsWithAction = _actionFirst.any(description.startsWith);
  var type = 'labor';
  if (!startsWithAction) {
    for (final e in _rules.entries) {
      if (e.value.any(description.contains)) { type = e.key; break; }
    }
  }

  return QuickLine(
    type: type,
    descriptionAr: description,
    quantity: quantity,
    unitPrice: price == null ? null : (price % 1 == 0 ? price.toInt().toString() : price.toStringAsFixed(2)),
  );
}
