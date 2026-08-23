import 'package:flutter_test/flutter_test.dart';
import 'package:sinaaty/features/workshop/domain/quick_line.dart';

/// سطر يكتبه صاحب الورشة كما يتكلم → بند كامل. القواعد مرآة لمحرك الاستخراج في الخادم، والاختبار
/// يثبتها بجمل حقيقية من ورشة سعودية لا بحالات مصطنعة.
void main() {
  group('السطر السريع', () {
    test('فعل في المقدمة = أجرة عمل، والسعر منطوقاً بالحروف', () {
      final p = parseQuickLine('تغيير زيت وفلتر بمئتين وستين')!;
      expect(p.type, 'labor');            // «تغيير زيت» عمل لا كيس زيت
      expect(p.descriptionAr, 'تغيير زيت وفلتر');
      expect(p.unitPrice, '260');
      expect(p.quantity, '1');
      expect(p.isComplete, isTrue);
    });

    test('قطعة بكمية وسعر بأرقام عربية', () {
      final p = parseQuickLine('دسكات أمامية عدد ٢ بسعر ٤٨٠')!;
      expect(p.type, 'part');
      expect(p.quantity, '2');
      expect(p.unitPrice, '480');
      expect(p.descriptionAr, 'دسكات أمامية');   // لا الكمية ولا السعر يتسربان إلى الوصف
    });

    test('السعر رقماً وحيداً بلا كلمة سعر', () {
      final p = parseQuickLine('غسيل وتلميع 150')!;
      expect(p.type, 'labor');
      expect(p.unitPrice, '150');
      expect(p.descriptionAr, 'غسيل وتلميع');
    });

    test('سمكرة ودهان تُصنَّف صحيحاً', () {
      expect(parseQuickLine('سمكرة الرفرف الأيمن بألف وخمسمئة')!.type, 'paint');
      expect(parseQuickLine('سمكرة الرفرف الأيمن بألف وخمسمئة')!.unitPrice, '1500');
    });

    test('بلا سعر: البند ناقص ولا يُخمَّن — العميل يوقّع على هذا المبلغ', () {
      final p = parseQuickLine('تغيير طقم الفرامل')!;
      expect(p.unitPrice, isNull);
      expect(p.isComplete, isFalse);      // الواجهة تطلب السعر بدل أن تخترعه
      expect(p.descriptionAr, 'تغيير طقم الفرامل');
    });

    test('سطر أقصر من أن يعني شيئاً يُهمل بلا ضجيج', () {
      expect(parseQuickLine(''), isNull);
      expect(parseQuickLine('أ'), isNull);
    });

    test('الأرقام العربية والإنجليزية سواء', () {
      expect(parseSpokenNumber('٤٨٠'), 480);
      expect(parseSpokenNumber('480'), 480);
      expect(parseSpokenNumber('مئتين وستين'), 260);
      expect(parseSpokenNumber('ألف وخمسمئة'), 1500);
      expect(parseSpokenNumber('بدون رقم'), isNull);
    });
  });
}
