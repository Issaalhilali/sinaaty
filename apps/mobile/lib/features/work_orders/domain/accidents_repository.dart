import '../../../core/result/result.dart';
import 'accident_report.dart';

/// Kept apart from WorkOrdersRepository: the accident file is optional context on a repair, and most
/// orders never have one.
abstract interface class AccidentsRepository {
  /// Preview by reference — nothing is stored. A mistyped reference is NOT_FOUND, an ordinary case.
  Future<Result<AccidentReport>> lookup({required String ref, String? vin});
  Future<Result<AccidentReport>> link({required String ref, required String workOrderId, required String orgId});
  /// The file behind this repair, or NOT_FOUND when none was linked.
  Future<Result<AccidentReport>> forWorkOrder(String workOrderId);
  /// FR-WO-10: register the finished repair back with the provider. Idempotent server-side.
  Future<Result<AccidentReport>> submitRepair(String reportId);
}
