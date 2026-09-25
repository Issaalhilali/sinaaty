import 'package:flutter_test/flutter_test.dart';
import 'package:sinaaty/core/api/api_host_probe.dart';

void main() {
  group('البحث عن الخادم حين يشيخ العنوان', () {
    test('المُهيّأ أولاً دائماً — لا نُبدّل بلا سبب', () {
      final c = ApiHostProbe.candidates('http://mac.local:3000');
      expect(c.first, 'http://mac.local:3000');
    });

    test('يشمل مضيف محاكي أندرويد ومحاكي iOS', () {
      final c = ApiHostProbe.candidates('http://mac.local:3000');
      expect(c, contains('http://10.0.2.2:3000'));
      expect(c, contains('http://localhost:3000'));
    });

    test('بلا تكرار: عنوانٌ مُهيّأ يطابق أحد البدائل لا يُجرَّب مرتين', () {
      expect(ApiHostProbe.candidates('http://localhost:3000').length, 2);
    });
  });
}
