import '../../../core/result/result.dart';
import 'work_order.dart';
abstract interface class WorkOrdersRepository {
  Future<Result<List<WorkOrder>>> list();
  Future<Result<WorkOrder>> get(String id);
  Future<Result<WoTimeline>> timeline(String id);
  Future<Result<WoVersion>> version(String id, int version);
  Future<Result<ApproveInit>> approveInit(String id, {required String method, int? version});
  /// Nafath: pass transactionId; OTP: pass code. Returns the updated work order.
  Future<Result<WorkOrder>> approveComplete(String id, {required String method, int? version, String? transactionId, String? code});
  Future<Result<WorkOrder>> cancel(String id, String reasonAr);
  Future<Result<void>> confirmReceipt(String id);
  /// Check-in vs check-out comparison — the delivery evidence.
  Future<Result<InspectionDiff>> inspectionDiff(String id);
  /// تقييمي على هذا الأمر إن قيّمت — به تُعرض النجوم أو «شكراً لك».
  Future<Result<MyReview?>> myReview(String workOrderId);
  Future<Result<void>> submitReview(String workOrderId, {required int rating, String? commentAr});
}

class MyReview { final int rating; final String? commentAr; const MyReview({required this.rating, this.commentAr}); }
/// Live updates for `work-order:{id}` (Socket.IO under the hood; domain sees a stream of "changed" ticks).
abstract interface class WorkOrderRealtime { Stream<void> changes(String workOrderId); }
