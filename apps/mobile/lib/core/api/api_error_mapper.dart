import 'package:dio/dio.dart';
import '../result/result.dart';
/// Maps Dio/HTTP errors to Failures using the API's bilingual envelope {code, message_ar, message_en, details}.
Failure mapDioError(Object e) {
  if (e is DioException) {
    if (e.type == DioExceptionType.connectionError || e.type == DioExceptionType.connectionTimeout || e.type == DioExceptionType.receiveTimeout || e.type == DioExceptionType.sendTimeout) return const NetworkFailure();
    final res = e.response;
    if (res != null) {
      final data = res.data;
      if (data is Map<String, dynamic> && data['code'] is String) {
        final code = data['code'] as String;
        if (res.statusCode == 401 && (code == 'UNAUTHORIZED' || code == 'TOKEN_INVALID' || code == 'TOKEN_REUSED')) return const UnauthorizedFailure();
        return ApiFailure(res.statusCode ?? 0, code, (data['message_ar'] as String?) ?? 'حدث خطأ غير متوقع.', (data['message_en'] as String?) ?? 'Unexpected error.', data['details']);
      }
      return ApiFailure(res.statusCode ?? 0, 'HTTP_${res.statusCode}', 'حدث خطأ غير متوقع، حاول مرة أخرى.', 'Unexpected error.', data);
    }
  }
  return UnknownFailure(e);
}
