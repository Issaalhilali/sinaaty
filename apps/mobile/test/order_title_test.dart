import 'package:flutter_test/flutter_test.dart';
import 'package:sinaaty/features/workshop/domain/order_title.dart';

/// الاسم التلقائي يجب أن يطابق `summariseItems` في الخادم حرفاً بحرف — وإلا رأت الورشة اسماً على
/// الشاشة وحُفظ غيره، وهو أسوأ من ألّا ترى شيئاً.
void main() {
  test('لا بنود بعد ⟵ لا اسم (الحقل يُظهر تلميحه المعتاد)', () {
    expect(autoTitle(const []), isNull);
    expect(autoTitle(const ['   ']), isNull);
  });

  test('بند واحد ⟵ البند نفسه', () {
    expect(autoTitle(const ['تغيير زيت وفلتر']), 'تغيير زيت وفلتر');
  });

  test('عدة بنود ⟵ الأول ثم عدد ما بعده', () {
    expect(autoTitle(const ['تغيير زيت وفلتر', 'فحص فرامل', 'غسيل']), 'تغيير زيت وفلتر +2');
  });

  test('الفراغات لا تُحتسب بنوداً', () {
    expect(autoTitle(const ['سمكرة رفرف', '  ', 'دهان']), 'سمكرة رفرف +1');
  });
}
