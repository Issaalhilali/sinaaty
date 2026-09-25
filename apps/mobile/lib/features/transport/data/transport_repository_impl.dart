import '../../../core/api/api_client.dart';
import '../../../core/api/api_error_mapper.dart';
import '../../../core/result/result.dart';
import '../domain/transport.dart';
import '../domain/transport_repository.dart';

String _s(Object? v) => v?.toString() ?? '0';
DateTime? _d(Object? v) => v is String ? DateTime.tryParse(v) : null;
GeoPoint? _geo(Object? v) {
  if (v is! Map) return null;
  final lat = double.tryParse(_s(v['lat'])), lng = double.tryParse(_s(v['lng']));
  return lat == null || lng == null ? null : GeoPoint(lat, lng);
}

DriverProfile driverFromJson(Map<String, dynamic> j) => DriverProfile(
      userId: j['userId'] as String, orgId: j['orgId'] as String?,
      truckPlate: j['truckPlate'] as String?, truckType: j['truckType'] as String?,
      online: j['isOnline'] as bool? ?? false, lastGeo: _geo(j['lastGeo']), ratingAvg: j['ratingAvg']?.toString(),
    );

TransportJob jobFromJson(Map<String, dynamic> j) {
  final dr = j['driver'] as Map<String, dynamic>?;
  return TransportJob(
    id: j['id'] as String, number: j['number'] as String, type: j['type'] as String, status: j['status'] as String,
    vehicleId: j['vehicleId'] as String?, workOrderId: j['workOrderId'] as String?,
    pickup: _geo(j['pickup']), pickupAddress: j['pickupAddress'] as String?,
    dropoff: _geo(j['dropoff']), dropoffAddress: j['dropoffAddress'] as String?,
    distanceKm: j['distanceKm']?.toString(), quotedPrice: _s(j['quotedPrice']), finalPrice: j['finalPrice']?.toString(),
    etaMinutes: (j['eta_minutes'] as num?)?.toInt(), driversNearby: (j['drivers_nearby'] as num?)?.toInt() ?? 0,
    assignedAt: _d(j['assignedAt']), pickedUpAt: _d(j['pickedUpAt']), deliveredAt: _d(j['deliveredAt']),
    notesAr: j['notesAr'] as String?, createdAt: _d(j['createdAt']) ?? DateTime.now(),
    driver: dr == null ? null : TowDriver(nameAr: dr['name_ar'] as String?, phone: dr['phone'] as String?, truckPlate: dr['truck_plate'] as String?, rating: dr['rating']?.toString()),
    invoice: j['invoice'] is Map ? (id: (j['invoice'] as Map)['id'] as String, total: _s((j['invoice'] as Map)['total']), status: ((j['invoice'] as Map)['status'] ?? 'issued') as String) : null,
  );
}

class TransportRepositoryImpl implements TransportRepository {
  final ApiClient api;
  TransportRepositoryImpl(this.api);
  Future<Result<T>> _run<T>(Future<T> Function() f) async { try { return Result.ok(await f()); } catch (e) { return Result.err(mapDioError(e)); } }
  Map<String, double> _p(GeoPoint g) => {'lat': g.lat, 'lng': g.lng};

  @override Future<Result<TowQuote>> quote({required String type, required GeoPoint pickup, required GeoPoint dropoff}) => _run(() async {
    final d = (await api.dio.post<Map<String, dynamic>>('/transport/quote', data: {'type': type, 'pickup': _p(pickup), 'dropoff': _p(dropoff)})).data!;
    return TowQuote(type: d['type'] as String, distanceKm: _s(d['distance_km']), etaMinutes: (d['eta_minutes'] as num?)?.toInt() ?? 0, price: _s(d['price']), total: d['total']?.toString());
  });

  @override Future<Result<TransportJob>> createJob({required String type, required GeoPoint pickup, required GeoPoint dropoff, String? vehicleId, String? workOrderId, String? pickupAddress, String? dropoffAddress, String? notesAr}) => _run(() async =>
    jobFromJson((await api.dio.post<Map<String, dynamic>>('/transport/jobs', data: {
      'type': type, 'pickup': _p(pickup), 'dropoff': _p(dropoff),
      'vehicle_id': ?vehicleId, 'work_order_id': ?workOrderId,
      'pickup_address': ?pickupAddress, 'dropoff_address': ?dropoffAddress, 'notes_ar': ?notesAr,
    })).data!));

  @override Future<Result<List<TransportJob>>> myJobs() => _run(() async =>
    (await api.dio.get<List<dynamic>>('/transport/jobs')).data!.cast<Map<String, dynamic>>().map(jobFromJson).toList());

  @override Future<Result<TransportJob>> job(String id) => _run(() async => jobFromJson((await api.dio.get<Map<String, dynamic>>('/transport/jobs/$id')).data!));

  @override Future<Result<void>> cancel(String id, {String? reasonAr}) => _run(() async { await api.dio.post<void>('/transport/jobs/$id/cancel', data: {'reason_ar': ?reasonAr}); });

  // ---- السائق
  @override Future<Result<DriverProfile>> driverMe() => _run(() async => driverFromJson((await api.dio.get<Map<String, dynamic>>('/transport/driver/me')).data!));
  @override Future<Result<DriverProfile>> upsertDriver({String? orgId, String? truckPlate, String? truckType}) => _run(() async =>
      driverFromJson((await api.dio.put<Map<String, dynamic>>('/transport/driver/profile', data: {'org_id': ?orgId, 'truck_plate': ?truckPlate, 'truck_type': ?truckType})).data!));
  @override Future<Result<DriverProfile>> setOnline(bool online, {GeoPoint? at}) => _run(() async =>
      driverFromJson((await api.dio.put<Map<String, dynamic>>('/transport/driver/online', data: {'online': online, if (at != null) ...{'lat': at.lat, 'lng': at.lng}})).data!));
  @override Future<Result<List<TransportJob>>> offers({double? radiusKm}) => _run(() async =>
      ((await api.dio.get<List<dynamic>>('/transport/driver/offers', queryParameters: {'radius_km': ?radiusKm})).data ?? const [])
          .map((e) => jobFromJson(e as Map<String, dynamic>)).toList());
  @override Future<Result<TransportJob>> acceptOffer(String id, {String? orgId}) => _run(() async =>
      jobFromJson((await api.dio.post<Map<String, dynamic>>('/transport/jobs/$id/accept', data: {'org_id': ?orgId})).data!));
  @override Future<Result<TransportJob>> driverTransition(String id, String to) => _run(() async =>
      jobFromJson((await api.dio.post<Map<String, dynamic>>('/transport/jobs/$id/transition', data: {'to': to})).data!));
  @override Future<Result<List<TransportJob>>> driverJobs() => _run(() async =>
      ((await api.dio.get<List<dynamic>>('/transport/jobs', queryParameters: {'as': 'driver'})).data ?? const [])
          .map((e) => jobFromJson(e as Map<String, dynamic>)).toList());
  @override Future<Result<void>> sendReceiverCode(String id) => _run(() async { await api.dio.post<dynamic>('/transport/jobs/$id/proof/otp'); });
  @override Future<Result<TransportJob>> completeWithProof(String id, {required String mediaId, required String code}) => _run(() async =>
      jobFromJson((await api.dio.post<Map<String, dynamic>>('/transport/jobs/$id/complete', data: {'media_id': mediaId, 'code': code})).data!));
}
