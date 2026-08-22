/// One workshop's answer to «أصلح سيارتي»: a diagnosis line, a price range OR a free inspection,
/// and when they can take the car. Badges and the distance line arrive READY from the API —
/// the client never computes them (scope §1/قبول 4).
class ServiceOffer {
  final String id;
  final String? workshopOrgId;
  final String? workshopNameAr;
  final String? rating;          // "4.7" — display only
  final String? distanceText;    // «حي الصناعية — 4.2 كم» as the API says it
  final String offerType;        // estimate | free_inspection
  final String? diagnosisAr;
  final String? priceMin;
  final String? priceMax;
  final String? availability;    // now | today | this_week
  final DateTime? availableAt;
  final String? etaNoteAr;
  final List<String> badges;     // cheapest | fastest | nearest | top_rated | previously_used | specialist
  final bool specialist;
  final int? respondsInMinutes;  // null for a workshop with no history — never an invented number
  const ServiceOffer({required this.id, this.workshopOrgId, this.workshopNameAr, this.rating, this.distanceText, required this.offerType, this.diagnosisAr, this.priceMin, this.priceMax, this.availability, this.availableAt, this.etaNoteAr, this.badges = const [], this.specialist = false, this.respondsInMinutes});
  bool get freeInspection => offerType == 'free_inspection';
}

/// A repair request: the customer's problem, thrown to the nearby workshops within a radius
/// the customer controls.
class ServiceRequest {
  final String id;
  final String number;
  final String status;           // open | accepted | expired | cancelled
  final String titleAr;
  final String? descriptionAr;
  final String? vehicleId;
  final int radiusKm;
  final String? preferredTime;   // now | today | this_week
  final String? distanceText;    // workshop view: how far the car is
  final DateTime createdAt;
  final List<String> mediaIds;
  final List<ServiceOffer> offers;
  /// The list view carries a count without the offers themselves — the badge never lies as zero.
  final int? offersCountRaw;
  const ServiceRequest({required this.id, required this.number, required this.status, required this.titleAr, this.descriptionAr, this.vehicleId, required this.radiusKm, this.preferredTime, this.distanceText, required this.createdAt, this.mediaIds = const [], this.offers = const [], this.offersCountRaw});
  bool get open => status == 'open';
  int get offersCount => offersCountRaw ?? offers.length;
}
