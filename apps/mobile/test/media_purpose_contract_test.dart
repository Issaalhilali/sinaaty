import 'dart:io';
import 'package:flutter_test/flutter_test.dart';

/// **عقد أغراض الرفع**: كل `purpose` يرسله التطبيق إلى `/media/presign` يجب أن يكون في قائمة الخادم.
///
/// على الجهاز (٢٣ سبتمبر ٢٠٢٦): سائق السطحة صوّر السيارة عند التسليم فردّ الخادم «البيانات المدخلة
/// غير صحيحة» — التطبيق أرسل `transport_proof` والخادم لا يعرف إلا `proof_of_delivery`؛ وكان توثيق
/// المنشأة يرسل `kyb` والخادم يريد `kyb_document`. الصورة شرطُ التسليم، فما كان سائقٌ ليُنهي مهمةً قط.
/// حارس شكل السلك يفحص المفاتيح لا القيم، فهذا الاختبار يقرأ قائمة الخادم من مصدرها ويقارن.
void main() {
  test('every media purpose the app sends exists in the API enum', () {
    final dto = File('../api/src/modules/media/application/media.dto.ts');
    if (!dto.existsSync()) { markTestSkipped('apps/api not checked out next to apps/mobile'); return; }
    final enumMatch = RegExp(r"purpose:\s*z\.enum\(\[([^\]]+)\]").firstMatch(dto.readAsStringSync());
    expect(enumMatch, isNotNull, reason: 'PresignDto.purpose enum not found — update the regex');
    final allowed = RegExp(r"'([a-z_]+)'").allMatches(enumMatch!.group(1)!).map((m) => m.group(1)!).toSet();
    final used = <String, String>{};
    for (final f in Directory('lib').listSync(recursive: true).whereType<File>().where((f) => f.path.endsWith('.dart'))) {
      for (final m in RegExp(r"purpose'?\s*:\s*'([a-z_]+)'").allMatches(f.readAsStringSync())) { used[m.group(1)!] = f.path; }
    }
    expect(used, isNotEmpty);
    for (final e in used.entries) { expect(allowed, contains(e.key), reason: '${e.value} sends purpose «${e.key}» which the API rejects (allowed: ${allowed.join(', ')})'); }
  });
}
