import 'package:flutter_test/flutter_test.dart';
import 'package:sinaaty/features/vehicles/domain/vehicle.dart';

Vehicle v({String? make, String? model, int? year, String? plate, String? vin}) =>
    Vehicle(id: 'x', makeAr: make, modelAr: model, year: year, plate: plate, vin: vin);

void main() {
  group('صفّ السيارة لا يقول شيئاً مرتين', () {
    test('سيارة بلوحتها وحدها: اللوحة عنواناً، ودعوةٌ لإكمال ما يعرّفها', () {
      final x = v(plate: 'أ ب ح 1234');
      expect(x.title, 'أ ب ح 1234');
      expect(x.subtitle, isNot(contains('أ ب ح 1234')));   // كان يكرّرها
      expect(x.subtitle, contains('رقم الهيكل'));
    });
    test('سيارة معروفة: اسمها عنواناً ولوحتها تحته', () {
      final x = v(make: 'تويوتا', model: 'كامري', year: 2019, plate: 'أ ب ح 1234');
      expect(x.title, 'تويوتا كامري 2019');
      expect(x.subtitle, contains('أ ب ح 1234'));
    });
    test('بلا نوع ولا لوحة لكن برقم هيكل: آخر ستّ خانات تكفي للتعرّف', () {
      expect(v(vin: 'JTDBE32K123456789').subtitle, contains('456789'));
    });
  });
}
