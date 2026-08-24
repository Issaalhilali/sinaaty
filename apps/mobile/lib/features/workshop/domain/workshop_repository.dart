import '../../../core/result/result.dart';
import '../../work_orders/domain/work_order.dart';
import 'workshop.dart';
abstract interface class WorkshopRepository {
  Future<Result<List<OrgBrief>>> myOrgs();
  Future<Result<List<WorkOrder>>> orgOrders(String orgId, {List<String>? status});
  Future<Result<WorkOrder>> create(NewWorkOrder wo);
  Future<Result<WorkOrder>> addItem(String woId, NewItem item);
  Future<Result<WorkOrder>> removeItem(String woId, String itemId);
  Future<Result<WorkOrder>> transition(String woId, String to, {String? noteAr});
  Future<Result<void>> requestApproval(String woId);
  Future<Result<Presigned>> presign({required String mimeType, required int sizeBytes, required String sha256, required String purpose});
  Future<Result<void>> upload(Presigned p, List<int> bytes, String mimeType);
  Future<Result<void>> inspect(String woId, NewInspection ins);
  Future<Result<void>> attachMedia(String woId, List<String> mediaIds, {String label = 'progress'});
  Future<Result<String>> issueInvoice(String woId);
  Future<Result<OrgWallet>> wallet(String orgId);
  /// أرقام أوامر العمل التي صدرت لها فاتورة من هذه المنشأة — لمعرفة ما سُلّم بلا فاتورة.
  Future<Result<Set<String>>> invoicedWorkOrderIds(String orgId);
  /// Abandoned-vehicle path (Step 29): the machine may remind; only a person declares.
  Future<Result<AbandonedStatus>> abandonedStatus(String woId);
  Future<Result<void>> abandonedDeclare(String woId, {String? reasonAr});
  /// Voice → items (Step 27): the raw recording must be uploaded FIRST (audio/*, purpose voice_note);
  /// the on-device transcript rides as hint_ar. Returns the proposals for human review.
  Future<Result<VoiceNote>> createVoiceNote(String woId, {required String mediaId, String? hintAr});
  Future<Result<void>> applyVoiceNote(String noteId, List<NewItem> items);
}
/// Offline queue port: actions that must not be lost when the network drops (status updates, photo attachments).
abstract interface class PendingActions {
  Future<List<PendingAction>> all();
  Future<void> add(PendingAction a);
  Future<void> remove(String id);
}
class PendingAction { final String id; final String kind; final Map<String, dynamic> payload; final DateTime createdAt; const PendingAction({required this.id, required this.kind, required this.payload, required this.createdAt});
  Map<String, dynamic> toJson() => {'id': id, 'kind': kind, 'payload': payload, 'createdAt': createdAt.toIso8601String()};
  factory PendingAction.fromJson(Map<String, dynamic> j) => PendingAction(id: j['id'] as String, kind: j['kind'] as String, payload: (j['payload'] as Map).cast<String, dynamic>(), createdAt: DateTime.parse(j['createdAt'] as String)); }
