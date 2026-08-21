import '../../../core/result/result.dart';
import 'dispute.dart';

abstract interface class DisputesRepository {
  Future<Result<List<Dispute>>> mine();
  Future<Result<Dispute>> byId(String id);
  Future<Result<Dispute>> open({String? workOrderId, String? partOrderId, required String category, required String descriptionAr, List<String> mediaIds});
  Future<Result<void>> message(String id, {required String bodyAr, List<String> mediaIds});
  /// Presign + upload one evidence photo → its media id (existing media pipeline, purpose `dispute`).
  Future<Result<String>> uploadEvidence(List<int> bytes, {required String mimeType});
}
