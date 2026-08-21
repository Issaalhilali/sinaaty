/// Tow / delivery jobs (سطحة) as the customer sees them.
class GeoPoint {
  final double lat;
  final double lng;
  const GeoPoint(this.lat, this.lng);
  bool get isValid => lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && !(lat == 0 && lng == 0);
  @override String toString() => '${lat.toStringAsFixed(5)}, ${lng.toStringAsFixed(5)}';
  @override bool operator ==(Object other) => other is GeoPoint && other.lat == lat && other.lng == lng;
  @override int get hashCode => Object.hash(lat, lng);
}

class TowQuote {
  final String type;
  final String distanceKm;
  final int etaMinutes;
  final String price;        // pre-VAT (kept for compatibility)
  /// VAT-inclusive figure from the API — computed by the invoice's own line math, so what the
  /// customer sees before requesting is exactly what the invoice will say (p1 scope §2).
  final String? total;
  const TowQuote({required this.type, required this.distanceKm, required this.etaMinutes, required this.price, this.total});
  String get displayTotal => total ?? price;
}

class TowDriver {
  final String? nameAr;
  final String? phone;
  final String? truckPlate;
  final String? rating;
  const TowDriver({this.nameAr, this.phone, this.truckPlate, this.rating});
}

class TransportJob {
  final String id;
  final String number;
  final String type;
  final String status;
  final String? vehicleId;
  final String? workOrderId;
  final GeoPoint? pickup;
  final String? pickupAddress;
  final GeoPoint? dropoff;
  final String? dropoffAddress;
  final String? distanceKm;
  final String quotedPrice;
  final String? finalPrice;
  final int? etaMinutes;
  final int driversNearby;
  final DateTime? assignedAt;
  final DateTime? pickedUpAt;
  final DateTime? deliveredAt;
  final String? notesAr;
  final DateTime createdAt;
  final TowDriver? driver;
  /// Issued automatically on proven delivery (p1 scope §2); paying it releases the held amount.
  final ({String id, String total, String status})? invoice;
  const TransportJob({
    required this.id, required this.number, required this.type, required this.status,
    this.vehicleId, this.workOrderId, this.pickup, this.pickupAddress, this.dropoff, this.dropoffAddress,
    this.distanceKm, required this.quotedPrice, this.finalPrice, this.etaMinutes, this.driversNearby = 0,
    this.assignedAt, this.pickedUpAt, this.deliveredAt, this.notesAr, required this.createdAt, this.driver, this.invoice,
  });

  static const _live = ['requested', 'searching', 'assigned', 'en_route_pickup', 'picked_up', 'en_route_dropoff'];
  bool get isLive => _live.contains(status);
  bool get isDone => status == 'delivered' || status == 'completed';
  /// Cancelling stops being fair once the car is on the truck (the API enforces the same rule).
  bool get canCancel => ['requested', 'searching', 'assigned', 'en_route_pickup'].contains(status);
  String get price => finalPrice ?? quotedPrice;
  bool get payable => invoice != null && invoice!.status != 'paid';
}

/// Ordered steps for the customer's timeline — one row per real milestone, nothing else.
const towSteps = ['requested', 'assigned', 'picked_up', 'delivered'];

/// Where the car is, without a map picker: people in Saudi share a location as a link on WhatsApp, so the
/// link itself is the input. Accepts a pasted Google/Apple Maps URL or plain "24.7136, 46.6753".
/// Short links (maps.app.goo.gl) cannot be resolved offline — the caller shows the "paste the full link" hint.
GeoPoint? parseLocationLink(String input) {
  final text = input.trim();
  if (text.isEmpty) return null;
  final patterns = <RegExp>[
    RegExp(r'[?&](?:q|ll|daddr|sll|center)=(-?\d{1,3}\.\d+)[,%2C]+\s*(-?\d{1,3}\.\d+)', caseSensitive: false),
    RegExp(r'@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)'),
    RegExp(r'/(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)'),
    RegExp(r'^\s*(-?\d{1,3}\.\d+)\s*[,،]\s*(-?\d{1,3}\.\d+)\s*$'),
  ];
  for (final re in patterns) {
    final m = re.firstMatch(text);
    if (m == null) continue;
    final lat = double.tryParse(m.group(1)!);
    final lng = double.tryParse(m.group(2)!);
    if (lat == null || lng == null) continue;
    final p = GeoPoint(lat, lng);
    if (p.isValid) return p;
  }
  return null;
}
