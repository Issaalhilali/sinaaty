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

/// فرع منشأة كما يظهر للضيف.
class GuestOrgBranch {
  final String? nameAr;
  final String city;
  final String? district;
  final bool isPrimary;
  const GuestOrgBranch({this.nameAr, required this.city, this.district, required this.isPrimary});
}

/// الملف العام لمنشأة — ما يصح أن يقرأه ضيفٌ غريب، لا أكثر (الخادم يقصّه بقائمة بيضاء).
class GuestOrgProfile {
  final String id;
  final String type;
  final String nameAr;
  final String? descriptionAr;
  final String ratingAvg;
  final int ratingCount;
  final bool acceptingRequests;
  final bool verified;
  final List<GuestOrgBranch> branches;
  final List<String> specialties;
  const GuestOrgProfile({required this.id, required this.type, required this.nameAr, this.descriptionAr,
      required this.ratingAvg, required this.ratingCount, required this.acceptingRequests,
      required this.verified, required this.branches, required this.specialties});
}

abstract interface class ExploreRepository {
  /// الورش والمحلات القريبة من نقطة — وبنصّ بحثٍ اختياري.
  Future<Result<List<NearbyOrg>>> nearby({required double lat, required double lng, double radiusKm, String? q});

  /// الملف العام لمنشأة واحدة.
  Future<Result<GuestOrgProfile>> publicProfile(String id);
}
