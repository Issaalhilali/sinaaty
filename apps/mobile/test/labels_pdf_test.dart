import 'package:flutter_test/flutter_test.dart';
import 'package:sinaaty/features/parts/domain/parts.dart';
import 'package:sinaaty/features/parts/presentation/labels_pdf.dart';

/// ورقة الملصقات تُبنى بخط Almarai (عربي) ورموز QR حقيقية — ملفٌ صالح غير فارغ لأي عدد، صفحةً لكل ١٢.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  test('labels PDF builds a valid document for 14 labels (two pages)', () async {
    final labels = [for (var i = 1; i <= 14; i++) PartLabel(id: '$i', serialNumber: 'UMU-B20260923-${i.toString().padLeft(5, '0')}', qrToken: 'tok$i', batchCode: 'B20260923', status: 'issued')];
    final bytes = await buildLabelsPdf(labels: labels, partName: 'دينمو كامري مستعمل', batch: 'B20260923', scanLine: 'امسح للتحقق · صناعية', brand: 'صناعية');
    expect(String.fromCharCodes(bytes.take(4)), '%PDF');
    expect(bytes.length, greaterThan(5000), reason: 'يحمل الخط والرموز لا ورقة فارغة');
    expect(RegExp(r'/Type\s*/Page[^s]').allMatches(String.fromCharCodes(bytes)).length, 2);
  });
}
