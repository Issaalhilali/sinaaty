import 'package:dio/dio.dart';
import '../../../core/api/api_error_mapper.dart';
import '../../../core/result/result.dart';
import '../domain/explore.dart';

/// GET /v1/organizations — عامّ في الخادم: يعمل بلا رمز دخول، فالضيف يستكشف قبل أن يسجّل.
class ExploreRepositoryImpl implements ExploreRepository {
  final Dio _dio;
  ExploreRepositoryImpl(this._dio);

  /// مخزن التطوير يوقّع روابط الصور على localhost — وعلى الجهاز localhost يعني الجهازَ نفسه،
  /// فتأتي القائمة بوجوهٍ بيضاء. يُعاد كتابة الأصل على أصل العميل الحي (الذي يصححه المسبار).
  /// روابط الإنتاج (S3 حقيقي) لا تبدأ بـlocalhost فتمرّ كما هي.
  String? publicUrl(String? url) {
    if (url == null) return null;
    final m = RegExp(r'^https?://(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?').firstMatch(url);
    if (m == null) return url;
    final origin = _dio.options.baseUrl.replaceFirst(RegExp(r'/v1/?$'), '');
    return url.replaceRange(0, m.end, origin);
  }

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
            coverUrl: publicUrl(e['coverUrl'] as String?),
          ),
      ]);
    } on DioException catch (e) {
      return Result.err(mapDioError(e));
    }
  }

  @override
  Future<Result<GuestOrgProfile>> publicProfile(String id) async {
    try {
      final r = await _dio.get<Map<String, dynamic>>('/organizations/$id/public', options: Options(extra: {'auth': false}));
      final d = r.data!;
      return Result.ok(GuestOrgProfile(
        id: d['id'] as String,
        type: d['type'] as String? ?? 'workshop',
        nameAr: d['tradeNameAr'] as String? ?? d['legalNameAr'] as String? ?? '',
        descriptionAr: d['descriptionAr'] as String?,
        ratingAvg: d['ratingAvg'] as String? ?? '0.00',
        ratingCount: (d['ratingCount'] as num?)?.toInt() ?? 0,
        acceptingRequests: d['acceptingRequests'] as bool? ?? true,
        coverUrl: publicUrl(d['coverUrl'] as String?),
        verified: d['verifiedAt'] != null,
        branches: [
          for (final l in (d['locations'] as List<dynamic>? ?? const []))
            GuestOrgBranch(nameAr: l['nameAr'] as String?, city: l['city'] as String? ?? '', district: l['district'] as String?, isPrimary: l['isPrimary'] as bool? ?? false),
        ],
        // التخصص يعرض ما سُمّي منه: فئة، أو ماركة، أو «فئة · ماركة» حين يجتمعان
        specialties: [
          for (final s in (d['specialties'] as List<dynamic>? ?? const []))
            [if (s['categoryAr'] != null) s['categoryAr'] as String, if (s['makeAr'] != null) s['makeAr'] as String].join(' · '),
        ].where((x) => x.isNotEmpty).toList(),
      ));
    } on DioException catch (e) {
      return Result.err(mapDioError(e));
    }
  }
}
