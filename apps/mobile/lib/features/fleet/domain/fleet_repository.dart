import '../../../core/result/result.dart';
import 'fleet.dart';

abstract interface class FleetRepository {
  Future<Result<FleetOverview>> overview(String orgId);
  Future<Result<List<FleetPending>>> pending(String orgId);
  /// One approver's decision on one repair version. The signature itself stays a separate, personal act.
  Future<Result<FleetDecision>> decide(String workOrderId, {required String decision, String? noteAr});
  Future<Result<List<FleetStatement>>> statements(String orgId);
  Future<Result<FleetStatement>> statement(String id);
  /// Idempotent per month on the API (YYYY-MM).
  Future<Result<FleetStatement>> generateStatement(String orgId, String month);
  Future<Result<String>> statementCsv(String id);
}
