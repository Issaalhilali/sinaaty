import 'package:flutter_test/flutter_test.dart';
import 'package:sinaaty/features/service_market/domain/symptoms.dart';

void main() {
  const noise = Symptom('noise', 'صوت غريب', 'graphic_eq');
  const brakes = Symptom('brakes', 'صوت أو ضعف في المكابح', 'do_not_step');

  group('عنوان الطلب كما تقرؤه الورشة', () {
    test('الأعراض أولاً ثم كلامه — البطاقة سطرٌ واحد فليكن أدلّ ما عنده', () {
      expect(requestTitle(picked: [noise, brakes], note: 'يزيد مع السرعة'),
          'صوت غريب · صوت أو ضعف في المكابح — يزيد مع السرعة');
    });
    test('أعراض بلا كلام، وكلام بلا أعراض — كلاهما عنوان صالح', () {
      expect(requestTitle(picked: [noise], note: ''), 'صوت غريب');
      expect(requestTitle(picked: [], note: 'ترتج عند التسارع'), 'ترتج عند التسارع');
    });
    test('يأخذ أول سطر من الوصف الطويل — لا فقرة في بطاقة', () {
      expect(requestTitle(picked: [noise], note: 'يبدأ بعد ٦٠\nويزيد مع المطبات'), 'صوت غريب — يبدأ بعد ٦٠');
    });
  });

  group('لا زرّ ميت: يقول ما ينقص', () {
    test('عرَضٌ واحد يكفي — لا نُلزمه بالكتابة', () {
      expect(canSend(picked: [noise], note: ''), isTrue);
      expect(missing(picked: [noise], note: '', hasVehicle: true, hasPlace: true), isNull);
    });
    test('السيارة أولاً: بلا سيارة لا معنى لأمر إصلاح', () {
      expect(missing(picked: [noise], note: '', hasVehicle: false, hasPlace: true), 'اختر السيارة أولاً');
    });
    test('ولا شيء مختار: يقول ماذا يفعل لا «خطأ»', () {
      expect(missing(picked: [], note: 'ااا', hasVehicle: true, hasPlace: true), contains('اختر ما تلاحظه'));
    });
    test('الموقع آخر ما يُطلب — يُقرأ من الجهاز فلا يُزعج به إلا عند تعذّره', () {
      expect(missing(picked: [noise], note: '', hasVehicle: true, hasPlace: false), contains('موقعك'));
    });
  });
}
