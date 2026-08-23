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
}

/// Live channel `transport:{id}` — the tow screen and the part order both follow the same driver feed.
abstract interface class TransportRealtime {
  Stream<void> changes(String jobId);
}
