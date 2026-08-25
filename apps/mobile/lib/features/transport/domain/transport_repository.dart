import '../../../core/result/result.dart';
import 'transport.dart';

abstract interface class TransportRepository {
  Future<Result<TowQuote>> quote({required String type, required GeoPoint pickup, required GeoPoint dropoff});
  Future<Result<TransportJob>> createJob({
    required String type,
    required GeoPoint pickup,
    required GeoPoint dropoff,
    String? vehicleId,
    String? workOrderId,
    String? pickupAddress,
    String? dropoffAddress,
    String? notesAr,
  });
  Future<Result<List<TransportJob>>> myJobs();
  Future<Result<TransportJob>> job(String id);
  Future<Result<void>> cancel(String id, {String? reasonAr});

  // ---- السائق
  Future<Result<DriverProfile>> driverMe();
  Future<Result<DriverProfile>> upsertDriver({String? orgId, String? truckPlate, String? truckType});
  Future<Result<DriverProfile>> setOnline(bool online, {GeoPoint? at});
  /// العروض تعود بشكل مهمة كاملة كما يرسلها الخادم — لا كيان ثانٍ لنفس الشيء.
  Future<Result<List<TransportJob>>> offers({double? radiusKm});
  Future<Result<TransportJob>> acceptOffer(String id, {String? orgId});
  Future<Result<TransportJob>> driverTransition(String id, String to);
  Future<Result<List<TransportJob>>> driverJobs();
  Future<Result<void>> sendReceiverCode(String id);
  Future<Result<TransportJob>> completeWithProof(String id, {required String mediaId, required String code});
}

/// Live channel `transport:{id}` — the tow screen and the part order both follow the same driver feed.
abstract interface class TransportRealtime {
  Stream<void> changes(String jobId);
}
