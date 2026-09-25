import 'package:flutter_test/flutter_test.dart';
import 'package:sinaaty/core/result/result.dart';
import 'package:sinaaty/features/auth/domain/normalize_phone.dart';
void main() {
  test('Result maps and unwraps', () {
    const r = Result<int>.ok(2);
    expect(r.map((v) => v * 2).valueOrNull, 4);
    const e = Result<int>.err(NetworkFailure());
    expect(e.failureOrNull?.code, 'NETWORK'); expect(e.when(ok: (_) => 'ok', err: (f) => f.message('ar')), contains('اتصال'));
  });
  test('Saudi phone normalisation mirrors the API', () {
    for (final v in ['0501234567', '501234567', '+966501234567', '00966501234567', '٠٥٠١٢٣٤٥٦٧']) { expect(normalizeSaudiPhone(v), '+966501234567'); }
    expect(normalizeSaudiPhone('0111234567'), isNull);
  });
}
