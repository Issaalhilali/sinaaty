import '../../../core/result/result.dart';
import 'service_request.dart';

abstract interface class ServiceMarketRepository {
  Future<Result<ServiceRequest>> create({String? vehicleId, required String titleAr, String? descriptionAr, required double lat, required double lng, String? addressHint, required int radiusKm, String? preferredTime, List<String> mediaIds});
  Future<Result<List<ServiceRequest>>> mine();
  /// The workshop's inbox — the API indexes nearby requests by the receiving org.
  Future<Result<List<ServiceRequest>>> nearby({String? orgId});
  Future<Result<ServiceRequest>> byId(String id);
  /// Upsert — a workshop refines its offer, never stacks a second one.
  Future<Result<void>> offer(String id, {required String orgId, required String offerType, required String diagnosisAr, String? priceMin, String? priceMax, String? availability});
  /// Accepting creates the draft work order in the same transaction (the API owns that); returns its id.
  Future<Result<String>> accept(String id, {required String offerId});
  Future<Result<void>> widen(String id, {required int radiusKm});
  Future<Result<void>> cancel(String id);
  /// Presign + upload one problem photo → media id (existing pipeline).
  Future<Result<String>> uploadPhoto(List<int> bytes, {required String mimeType});
}

/// Live channel `service-request:{id}` (offer / accepted / widened): the comparison screen sees a
/// new offer the moment it lands — no pull-to-refresh ritual while workshops are answering.
abstract interface class ServiceRequestRealtime {
  Stream<void> changes(String requestId);
}
