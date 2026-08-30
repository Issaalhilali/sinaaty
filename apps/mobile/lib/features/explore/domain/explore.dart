import '../../../core/result/result.dart';

/// منشأة كما يراها ضيفٌ لم يسجّل بعد — بيانات عامة فقط (الاستكشاف عام في الخادم أصلاً).
class NearbyOrg {
  final String id;
  final String type;
  final String nameAr;
  final String ratingAvg;
  final int ratingCount;
  final String? city;
  final double? distanceKm;
  const NearbyOrg({required this.id, required this.type, required this.nameAr, required this.ratingAvg, required this.ratingCount, this.city, this.distanceKm});
}

abstract interface class ExploreRepository {
  /// الورش والمحلات القريبة من نقطة — وبنصّ بحثٍ اختياري.
  Future<Result<List<NearbyOrg>>> nearby({required double lat, required double lng, double radiusKm, String? q});
}
