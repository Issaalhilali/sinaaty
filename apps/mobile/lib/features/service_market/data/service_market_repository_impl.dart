import 'package:crypto/crypto.dart' as crypto;
import 'package:dio/dio.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_error_mapper.dart';
import '../../../core/format/format.dart';
import '../../../core/result/result.dart';
import '../domain/service_request.dart';
import '../domain/service_market_repository.dart';

ServiceOffer offerFromJson(Map<String, dynamic> j) => ServiceOffer(
  id: j['id'] as String,
  workshopOrgId: (j['workshop_org_id'] ?? j['org_id']) as String?,
  workshopNameAr: (j['workshop_name_ar'] ?? j['org_name_ar']) as String?,
  rating: j['rating']?.toString(),
  distanceText: (j['distance_text'] ?? j['distance_ar']) as String?,
  offerType: (j['offer_type'] ?? 'estimate') as String,
  diagnosisAr: j['diagnosis_ar'] as String?,
  priceMin: j['price_min']?.toString(), priceMax: j['price_max']?.toString(),
  availability: j['availability'] as String?,
  availableAt: Fmt.parseDate(j['available_at']),
  etaNoteAr: j['eta_note_ar'] as String?,
  badges: ((j['badges'] as List?) ?? []).map((b) => b.toString()).toList(),
);

ServiceRequest requestFromJson(Map<String, dynamic> j) => ServiceRequest(
  id: j['id'] as String, number: (j['number'] ?? '') as String, status: (j['status'] ?? 'open') as String,
  titleAr: (j['title_ar'] ?? '') as String, descriptionAr: j['description_ar'] as String?,
  vehicleId: j['vehicle_id'] as String?,
  radiusKm: (j['radius_km'] as num?)?.toInt() ?? 15,
  preferredTime: j['preferred_time'] as String?,
  distanceText: (j['distance_text'] ?? j['distance_ar']) as String?,
  createdAt: Fmt.parseDate(j['created_at']) ?? DateTime.now(),
  mediaIds: ((j['media_ids'] as List?) ?? []).map((m) => m.toString()).toList(),
  offers: ((j['offers'] as List?) ?? []).cast<Map<String, dynamic>>().map(offerFromJson).toList(),
);

class ServiceMarketRepositoryImpl implements ServiceMarketRepository {
  final ApiClient api;
  ServiceMarketRepositoryImpl(this.api);
  Future<Result<T>> _run<T>(Future<T> Function() f) async { try { return Result.ok(await f()); } catch (e) { return Result.err(mapDioError(e)); } }

  @override Future<Result<ServiceRequest>> create({String? vehicleId, required String titleAr, String? descriptionAr, required double lat, required double lng, String? addressHint, required int radiusKm, String? preferredTime, List<String> mediaIds = const []}) =>
      _run(() async => requestFromJson((await api.dio.post<Map<String, dynamic>>('/service-requests', data: {
        'vehicle_id': ?vehicleId, 'title_ar': titleAr, 'description_ar': ?descriptionAr,
        'lat': lat, 'lng': lng, 'address_hint': ?addressHint, 'radius_km': radiusKm,
        'preferred_time': ?preferredTime, 'media_ids': mediaIds,
      })).data!));
  @override Future<Result<List<ServiceRequest>>> mine() => _run(() async => (await api.dio.get<List<dynamic>>('/service-requests', queryParameters: {'mine': 'true'})).data!.cast<Map<String, dynamic>>().map(requestFromJson).toList());
  @override Future<Result<List<ServiceRequest>>> nearby() => _run(() async => (await api.dio.get<List<dynamic>>('/service-requests', queryParameters: {'nearby': 'true'})).data!.cast<Map<String, dynamic>>().map(requestFromJson).toList());
  @override Future<Result<ServiceRequest>> byId(String id) => _run(() async => requestFromJson((await api.dio.get<Map<String, dynamic>>('/service-requests/$id')).data!));
  @override Future<Result<void>> offer(String id, {required String offerType, required String diagnosisAr, String? priceMin, String? priceMax, String? availability}) =>
      _run(() async => (await api.dio.put<Map<String, dynamic>>('/service-requests/$id/offer', data: {'offer_type': offerType, 'diagnosis_ar': diagnosisAr, 'price_min': ?priceMin, 'price_max': ?priceMax, 'availability': ?availability})).data);
  @override Future<Result<String>> accept(String id, {required String offerId}) =>
      _run(() async { final d = (await api.dio.post<Map<String, dynamic>>('/service-requests/$id/accept', data: {'offer_id': offerId})).data!; return (d['work_order_id'] ?? d['workOrderId']) as String; });
  @override Future<Result<void>> widen(String id, {required int radiusKm}) => _run(() async => (await api.dio.post<Map<String, dynamic>>('/service-requests/$id/widen', data: {'radius_km': radiusKm})).data);
  @override Future<Result<void>> cancel(String id) => _run(() async => (await api.dio.post<Map<String, dynamic>>('/service-requests/$id/cancel')).data);
  @override Future<Result<String>> uploadPhoto(List<int> bytes, {required String mimeType}) => _run(() async {
    final d = (await api.dio.post<Map<String, dynamic>>('/media/presign', data: {'kind': 'image', 'mime_type': mimeType, 'size_bytes': bytes.length, 'sha256': crypto.sha256.convert(bytes).toString(), 'purpose': 'work_order'})).data!;
    final url = ((d['upload'] as Map?)?['url'] ?? '') as String;
    if (url.isNotEmpty && !url.startsWith('mock://')) {
      await Dio().put<void>(url, data: Stream.fromIterable([bytes]), options: Options(headers: {'content-type': mimeType, 'content-length': bytes.length}));
    }
    return d['media_id'] as String;
  });
}
