import 'package:dio/dio.dart';
import '../../../core/api/api_error_mapper.dart';
import '../../../core/result/result.dart';
import '../domain/explore.dart';

/// GET /v1/organizations — عامّ في الخادم: يعمل بلا رمز دخول، فالضيف يستكشف قبل أن يسجّل.
class ExploreRepositoryImpl implements ExploreRepository {
  final Dio _dio;
  ExploreRepositoryImpl(this._dio);

  @override
  Future<Result<List<NearbyOrg>>> nearby({required double lat, required double lng, double radiusKm = 40, String? q}) async {
    try {
      final r = await _dio.get<List<dynamic>>('/organizations', queryParameters: {
        'lat': lat, 'lng': lng, 'radius_km': radiusKm,
        if (q != null && q.trim().isNotEmpty) 'q': q.trim(),
      }, options: Options(extra: {'auth': false}));
      return Result.ok([
        for (final e in r.data ?? const [])
          NearbyOrg(
            id: e['id'] as String,
            type: e['type'] as String? ?? 'workshop',
            nameAr: e['tradeNameAr'] as String? ?? e['legalNameAr'] as String? ?? '',
            ratingAvg: e['ratingAvg'] as String? ?? '0.00',
            ratingCount: (e['ratingCount'] as num?)?.toInt() ?? 0,
            city: e['city'] as String?,
            distanceKm: (e['distanceKm'] as num?)?.toDouble(),
          ),
      ]);
    } on DioException catch (e) {
      return Result.err(mapDioError(e));
    }
  }
}
