import 'package:flutter_test/flutter_test.dart';
import 'package:sinaaty/features/vehicles/domain/istimara.dart';

/// الاستمارة تُقرأ على الجهاز، والقارئ الضوئي يخطئ. فالقاعدة هنا: ما لم يُقرأ بثقة يُترك فارغاً —
/// استمارةٌ تُقرأ خطأً تُنشئ سجلاً على سيارة أخرى، وهو أسوأ من حقل فارغ.
void main() {
  test('استمارة كاملة: الهيكل واللوحة والسنة والماركة', () {
    final r = parseIstimara('''
KINGDOM OF SAUDI ARABIA
VEHICLE REGISTRATION
Plate No: ABJ 4821
Chassis No: JTDKN3DU0A0123456
Model Year: 2019
Make: TOYOTA   Model: CAMRY
''');
    expect(r.vin, 'JTDKN3DU0A0123456');
    expect(r.plate, 'ABJ 4821');
    expect(r.year, 2019);
    expect(r.makeEn, 'تويوتا');
    expect(r.found, 4);
  });

  test('اللوحة بالترتيب المعكوس (أرقام ثم حروف) كما تُطبع أحياناً', () {
    final r = parseIstimara('4821 ABJ\nCHASSIS JTDKN3DU0A0123456');
    expect(r.plate, 'ABJ 4821');
  });

  test('اللوحة لا تُلتقط من داخل رقم الهيكل', () {
    // رقم الهيكل نفسه فيه حروف وأرقام متجاورة تشبه اللوحة.
    final r = parseIstimara('JTDKN3DU0A0123456');
    expect(r.vin, 'JTDKN3DU0A0123456');
    expect(r.plate, isNull, reason: 'لا لوحة في الصورة ⟵ لا تُخترع لوحة');
  });

  test('السنة لا تُؤخذ من أرقام رقم الهيكل', () {
    final r = parseIstimara('VIN JTDKN3DU0A2019456');
    expect(r.year, isNull, reason: '2019 داخل الهيكل ليست سنة صنع مقروءة');
  });

  test('صورة رديئة لا تُعطي شيئاً ⟵ لا يُملأ حقل بثقة كاذبة', () {
    final r = parseIstimara('....\n???\n');
    expect(r.isEmpty, isTrue);
    expect(r.found, 0);
  });

  test('قراءة جزئية مقبولة: ما وُجد يُملأ وما لا يُترك', () {
    final r = parseIstimara('Plate No ABJ 4821\nModel Year 2019');
    expect(r.vin, isNull);
    expect(r.plate, 'ABJ 4821');
    expect(r.year, 2019);
    expect(r.found, 2);
  });
}
