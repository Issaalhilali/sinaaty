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
}
