import 'package:crypto/crypto.dart' as crypto;
import 'package:dio/dio.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_error_mapper.dart';
import '../../../core/format/format.dart';
import '../../../core/result/result.dart';
import '../domain/dispute.dart';
import '../domain/disputes_repository.dart';

Dispute disputeFromJson(Map<String, dynamic> j) => Dispute(
  id: j['id'] as String,
  number: (j['number'] ?? '') as String,
  status: (j['status'] ?? 'open') as String,
  category: (j['category'] ?? 'quality') as String,
  descriptionAr: (j['descriptionAr'] ?? j['description_ar'] ?? '') as String,
  workOrderId: (j['workOrderId'] ?? j['work_order_id']) as String?,
  partOrderId: (j['partOrderId'] ?? j['part_order_id']) as String?,
  resolution: j['resolution'] as String?,
  resolutionNoteAr: (j['resolutionNoteAr'] ?? j['resolution_note_ar']) as String?,
  createdAt: Fmt.parseDate(j['createdAt'] ?? j['created_at']) ?? DateTime.now(),
  messages: ((j['messages'] as List?) ?? []).cast<Map<String, dynamic>>().map((m) => DisputeMessage(
    id: m['id'] as String, authorUserId: (m['authorUserId'] ?? m['author_user_id']) as String?,
    authorNameAr: (m['authorNameAr'] ?? m['author_name_ar']) as String?,
    bodyAr: (m['bodyAr'] ?? m['body_ar'] ?? '') as String,
    createdAt: Fmt.parseDate(m['createdAt'] ?? m['created_at']) ?? DateTime.now(),
  )).toList(),
  media: ((j['media'] as List?) ?? []).cast<Map<String, dynamic>>().map((m) => DisputeMedia(mediaId: (m['mediaId'] ?? m['media_id']) as String, mimeType: (m['mimeType'] ?? m['mime_type']) as String?)).toList(),
  escrow: j['escrow'] is Map ? (status: ((j['escrow'] as Map)['status'] ?? '') as String, amount: ((j['escrow'] as Map)['amount'] ?? '0').toString()) : null,
);

class DisputesRepositoryImpl implements DisputesRepository {
  final ApiClient api;
  DisputesRepositoryImpl(this.api);
  Future<Result<T>> _run<T>(Future<T> Function() f) async { try { return Result.ok(await f()); } catch (e) { return Result.err(mapDioError(e)); } }

  @override Future<Result<List<Dispute>>> mine() => _run(() async => (await api.dio.get<List<dynamic>>('/disputes', queryParameters: {'mine': 'true'})).data!.cast<Map<String, dynamic>>().map(disputeFromJson).toList());
  @override Future<Result<Dispute>> byId(String id) => _run(() async => disputeFromJson((await api.dio.get<Map<String, dynamic>>('/disputes/$id')).data!));
  @override Future<Result<Dispute>> open({String? workOrderId, String? partOrderId, required String category, required String descriptionAr, List<String> mediaIds = const []}) =>
      _run(() async => disputeFromJson((await api.dio.post<Map<String, dynamic>>('/disputes', data: {'work_order_id': ?workOrderId, 'part_order_id': ?partOrderId, 'category': category, 'description_ar': descriptionAr, 'media_ids': mediaIds})).data!));
  @override Future<Result<void>> message(String id, {required String bodyAr, List<String> mediaIds = const []}) =>
      _run(() async => (await api.dio.post<Map<String, dynamic>>('/disputes/$id/messages', data: {'body_ar': bodyAr, 'media_ids': mediaIds})).data);
  @override Future<Result<String>> uploadEvidence(List<int> bytes, {required String mimeType}) => _run(() async {
    final d = (await api.dio.post<Map<String, dynamic>>('/media/presign', data: {'kind': 'image', 'mime_type': mimeType, 'size_bytes': bytes.length, 'sha256': crypto.sha256.convert(bytes).toString(), 'purpose': 'dispute'})).data!;
    final url = ((d['upload'] as Map?)?['url'] ?? '') as String;
    if (url.isNotEmpty && !url.startsWith('mock://')) {
      await Dio().put<void>(url, data: Stream.fromIterable([bytes]), options: Options(headers: {'content-type': mimeType, 'content-length': bytes.length}));
    }
    return d['media_id'] as String;
  });
}
