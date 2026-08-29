import 'package:flutter_test/flutter_test.dart';
import 'package:sinaaty/core/scan/vin.dart';

/// رقم الهيكل من ملصق الباركود: متسامح مع ما تضيفه الملصقات، صارم في النتيجة — رقم خاطئ يعني
/// سيارةً أخرى في السجل، وهو أسوأ من حقل فارغ.
void main() {
  test('ملصق نظيف', () => expect(extractVin('JTDKN3DU0A0123456'), 'JTDKN3DU0A0123456'));
  test('حروف صغيرة ومسافات وأسطر', () => expect(extractVin(' jtdkn3du0a0123456 \n'), 'JTDKN3DU0A0123456'));
  test('بادئة I في Code 39 تُزال', () => expect(extractVin('IJTDKN3DU0A0123456'), 'JTDKN3DU0A0123456'));
  test('رمز أطول من رقم هيكل يُرفض ولا يُقتطع منه', () => expect(extractVin('12345678901234567890'), isNull));
  test('رمز أقصر يُرفض', () => expect(extractVin('ABC123'), isNull));
  test('لا شيء يُرفض بهدوء', () { expect(extractVin(null), isNull); expect(extractVin('   '), isNull); });

  test('ملصق عمود الباب الحقيقي: حقول مجاورة لا تُفسد الرقم', () {
    // هذا ما كسر الماسح على جهاز المالك: تجريد الفواصل قبل البحث كان يلصق الحقول ببعضها فيصير
    // سطراً من ٢٥ خانة، فيُرفض كله ويُقال «لم أجد رقم هيكل» على ملصق سليم.
    expect(extractVin('1FTFW1ET5DFC10312 GVWR 2812'), '1FTFW1ET5DFC10312');
    expect(extractVin('VIN:JTDKN3DU0A0123456\nYR:2019'), 'JTDKN3DU0A0123456');
    expect(extractVin('JTDKN3DU0A0123456,AB12'), 'JTDKN3DU0A0123456');
  });

  test('وحقلٌ مجاور طوله ١٧ خانة صالحة لا يُخلط بالرقم الأول', () {
    // أول ما يطابق يفوز؛ والمهم ألّا يُرفض الملصق كله لمجرد وجود جار.
    expect(extractVin('JTDKN3DU0A0123456 1FTFW1ET5DFC10312'), 'JTDKN3DU0A0123456');
  });
}
