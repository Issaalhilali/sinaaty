import 'package:flutter_test/flutter_test.dart';
import 'package:sinaaty/features/fleet/domain/fleet_import.dart';

void main() {
  test('one line per car: VIN recognised, anything else is a plate, separators and blanks tolerated', () {
    final rows = parseImportLines('أ ب ج 1234\n4t1b11hk5ku123456 ; \n\n, ن ق ل 99\n');
    expect(rows.length, 3);
    expect(rows[0], (vin: null, plate: 'أ ب ج 1234'));
    expect(rows[1], (vin: '4T1B11HK5KU123456', plate: null));   // uppercased, spaces stripped
    expect(rows[2], (vin: null, plate: 'ن ق ل 99'));
  });
  test('a 17-char string with I/O/Q is not a VIN — it is sent as a plate and the server judges', () {
    expect(parseImportLines('IOQ1234567890ABCD').single.vin, isNull);
  });
}
