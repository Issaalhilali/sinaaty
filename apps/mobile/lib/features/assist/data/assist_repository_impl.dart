import 'package:dio/dio.dart';
import '../../../core/api/api_error_mapper.dart';
import '../../../core/result/result.dart';
import '../domain/assist.dart';

class AssistRepositoryImpl implements AssistRepository {
  final Dio _dio;
  AssistRepositoryImpl(this._dio);

  @override
  Future<Result<Triage>> analyze(String text) async {
    try {
      final r = await _dio.post<Map<String, dynamic>>('/assist/analyze', data: {'text': text},
          options: Options(extra: {'auth': false}));   // الضيف يفهم قبل أن يسجّل
      final d = r.data!;
      return Result.ok(Triage(
        kind: d['kind'] as String? ?? 'repair',
        titleAr: d['titleAr'] as String? ?? text,
        symptoms: [for (final s in (d['symptoms'] as List<dynamic>? ?? const [])) s as String],
        partNameAr: d['partNameAr'] as String?,
        urgent: d['urgent'] as bool? ?? false,
        confidence: (d['confidence'] as num?)?.toDouble() ?? .5,
        sayAr: d['sayAr'] as String? ?? '',
      ));
    } on DioException catch (e) {
      return Result.err(mapDioError(e));
    }
  }
}
