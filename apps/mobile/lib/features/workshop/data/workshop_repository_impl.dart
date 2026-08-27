import 'package:dio/dio.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_error_mapper.dart';
import '../../../core/result/result.dart';
import '../../work_orders/data/work_orders_repository_impl.dart' show workOrderFromJson;
import '../../work_orders/domain/work_order.dart';
import '../domain/workshop.dart';
import '../domain/workshop_repository.dart';
class WorkshopRepositoryImpl implements WorkshopRepository {
  final ApiClient api; WorkshopRepositoryImpl(this.api);
  Future<Result<T>> _run<T>(Future<T> Function() f) async { try { return Result.ok(await f()); } catch (e) { return Result.err(mapDioError(e)); } }
  Map<String, dynamic> _item(NewItem i) => {'type': i.type, 'description_ar': i.descriptionAr, 'quantity': i.quantity, 'unit_price': i.unitPrice, 'warranty_days': i.warrantyDays, 'part_condition': ?i.partCondition};
  @override Future<Result<List<OrgBrief>>> myOrgs() => _run(() async => (await api.dio.get<List<dynamic>>('/organizations/mine')).data!
      .cast<Map<String, dynamic>>()
      .map((d) => OrgBrief(id: d['id'] as String, nameAr: (d['name_ar'] ?? '') as String, type: d['type'] as String, status: d['status'] as String, role: d['role'] as String?))
      .toList());
  @override Future<Result<String>> registerOrg({required String type, required String legalNameAr, String? tradeNameAr, String? crNumber, String? phone}) =>
      _run(() async => (await api.dio.post<Map<String, dynamic>>('/organizations', data: {
            'type': type, 'legal_name_ar': legalNameAr, 'trade_name_ar': ?tradeNameAr, 'cr_number': ?crNumber, 'phone': ?phone,
          })).data!['id'] as String);

  @override Future<Result<void>> setOrgLocation(String orgId, {required String city, String? district, String? addressLine, required double lat, required double lng}) =>
      _run(() async { await api.dio.post<void>('/organizations/$orgId/locations', data: {
            'city': city, 'district': ?district, 'address_line': ?addressLine, 'lat': lat, 'lng': lng, 'is_primary': true,
          }); });

  @override Future<Result<void>> addKybDoc(String orgId, {required String type, required String mediaId}) =>
      _run(() async { await api.dio.post<void>('/organizations/$orgId/kyb-documents', data: {'type': type, 'media_id': mediaId}); });

  @override Future<Result<List<({String type, String status})>>> kybDocs(String orgId) => _run(() async {
        final rows = (await api.dio.get<List<dynamic>>('/organizations/$orgId/kyb-documents')).data ?? const [];
        return rows.cast<Map<String, dynamic>>().map((d) => (type: d['type'] as String, status: d['status'] as String)).toList();
      });

  @override Future<Result<void>> submitForReview(String orgId) =>
      _run(() async { await api.dio.post<void>('/organizations/$orgId/kyb/submit', data: {}); });

  @override Future<Result<List<WorkOrder>>> orgOrders(String orgId, {List<String>? status}) => _run(() async => (await api.dio.get<List<dynamic>>('/work-orders', queryParameters: {'org_id': orgId, 'limit': 100, if (status != null) 'status': status.join(',')})).data!.map((e) => workOrderFromJson(e as Map<String, dynamic>)).toList());
  @override Future<Result<WorkOrder>> create(NewWorkOrder w) => _run(() async => workOrderFromJson((await api.dio.post<Map<String, dynamic>>('/work-orders', data: {'org_id': w.orgId, 'vin': ?w.vin, 'plate': ?w.plate, 'customer_phone': w.customerPhone, 'title_ar': w.titleAr, 'payment_terms': w.paymentTerms, 'complaint_ar': ?w.complaintAr, 'items': w.items.map(_item).toList()})).data!));
  @override Future<Result<WorkOrder>> addItem(String woId, NewItem item) => _run(() async => workOrderFromJson((await api.dio.post<Map<String, dynamic>>('/work-orders/$woId/items', data: _item(item))).data!));
  @override Future<Result<AbandonedStatus>> abandonedStatus(String woId) => _run(() async {
    final j = (await api.dio.get<Map<String, dynamic>>('/work-orders/$woId/abandoned')).data!;
    final sent = {for (final n in ((j['notices_sent'] as List?) ?? []).cast<Map<String, dynamic>>()) (n['step'] as num).toInt(): DateTime.tryParse((n['at'] ?? '') as String)};
    final storage = (j['storage'] as Map?)?.cast<String, dynamic>() ?? const <String, dynamic>{};
    return AbandonedStatus(
      status: (j['status'] ?? '') as String,
      daysReady: (j['days_ready'] as num?)?.toInt() ?? 0,
      steps: [for (final s in ((j['schedule'] as List?) ?? []).cast<Map<String, dynamic>>()) AbandonedNoticeStep(step: (s['step'] as num).toInt(), afterDays: (s['after_days'] as num).toInt(), formal: s['formal'] as bool? ?? false, sentAt: sent[(s['step'] as num).toInt()])],
      storageAmount: (storage['amount'] ?? '0').toString(), perDay: (storage['per_day'] ?? '0').toString(),
      freeDays: (storage['free_days'] as num?)?.toInt() ?? 0, chargeableDays: (storage['chargeable_days'] as num?)?.toInt() ?? 0,
      canDeclare: j['can_declare'] as bool? ?? false, reasonAr: j['reason_ar'] as String?,
    );
  });
  @override Future<Result<VoiceNote>> createVoiceNote(String woId, {required String mediaId, String? hintAr}) => _run(() async {
    final j = (await api.dio.post<Map<String, dynamic>>('/work-orders/$woId/voice-notes', data: {'media_id': mediaId, 'hint_ar': ?hintAr})).data!;
    return VoiceNote(id: j['id'] as String, transcriptAr: j['transcript_ar'] as String?,
      items: ((j['items'] as List?) ?? []).cast<Map<String, dynamic>>().map((i) => VoiceProposal(
        type: (i['type'] ?? 'labor') as String, descriptionAr: (i['description_ar'] ?? '') as String,
        quantity: (i['quantity'] ?? '1').toString(), unitPrice: i['unit_price']?.toString(),
        heardAr: i['heard_ar'] as String?, needsPrice: i['needs_price'] as bool? ?? i['unit_price'] == null,
      )).toList());
  });
  @override Future<Result<void>> applyVoiceNote(String noteId, List<NewItem> items) => _run(() async =>
    (await api.dio.post<Map<String, dynamic>>('/voice-notes/$noteId/apply', data: {'items': [for (final i in items) {'type': i.type, 'description_ar': i.descriptionAr, 'quantity': i.quantity, 'unit_price': i.unitPrice, 'warranty_days': i.warrantyDays}]})).data);
  @override Future<Result<void>> abandonedDeclare(String woId, {String? reasonAr}) => _run(() async => (await api.dio.post<Map<String, dynamic>>('/work-orders/$woId/abandoned/declare', data: {'reason_ar': ?reasonAr})).data);
  @override Future<Result<WorkOrder>> removeItem(String woId, String itemId) => _run(() async => workOrderFromJson((await api.dio.delete<Map<String, dynamic>>('/work-orders/$woId/items/$itemId')).data!));
  @override Future<Result<WorkOrder>> transition(String woId, String to, {String? noteAr}) => _run(() async { final d = (await api.dio.post<Map<String, dynamic>>('/work-orders/$woId/transition', data: {'to': to, 'note_ar': ?noteAr})).data!; return workOrderFromJson((d['work_order'] ?? d) as Map<String, dynamic>); });
  @override Future<Result<void>> requestApproval(String woId) => _run(() async { await api.dio.post<void>('/work-orders/$woId/request-approval', data: {}); });
  @override Future<Result<Presigned>> presign({required String mimeType, required int sizeBytes, required String sha256, required String purpose}) => _run(() async { final d = (await api.dio.post<Map<String, dynamic>>('/media/presign', data: {'kind': 'image', 'mime_type': mimeType, 'size_bytes': sizeBytes, 'sha256': sha256, 'purpose': purpose})).data!; return Presigned(mediaId: d['media_id'] as String, uploadUrl: ((d['upload'] as Map?)?['url'] ?? '') as String); });
  @override Future<Result<void>> upload(Presigned p, List<int> bytes, String mimeType) => _run(() async { if (p.uploadUrl.isEmpty || p.uploadUrl.startsWith('mock://')) return; await Dio().put<void>(p.uploadUrl, data: Stream.fromIterable([bytes]), options: Options(headers: {'content-type': mimeType, 'content-length': bytes.length})); });
  @override Future<Result<void>> inspect(String woId, NewInspection i) => _run(() async { await api.dio.post<void>('/work-orders/$woId/inspections', data: {'type': i.type, 'odometer_km': ?i.odometerKm, 'fuel_level_pct': ?i.fuelLevelPct, 'checklist': {'angles': i.anglesToMedia}, 'damages': i.damages.map((d) => {'zone': d.zone, 'severity': d.severity, 'note_ar': ?d.noteAr}).toList(), 'media_ids': i.mediaIds}); });
  @override Future<Result<void>> attachMedia(String woId, List<String> mediaIds, {String label = 'progress'}) => _run(() async { await api.dio.post<void>('/work-orders/$woId/media', data: {'media_ids': mediaIds, 'label': label}); });
  @override Future<Result<Set<String>>> invoicedWorkOrderIds(String orgId) => _run(() async {
        final rows = (await api.dio.get<List<dynamic>>('/invoices', queryParameters: {'org_id': orgId, 'as': 'seller'})).data ?? const [];
        return {for (final r in rows) (r as Map<String, dynamic>)['workOrderId'] as String? ?? ''}..remove('');
      });
  @override Future<Result<String>> issueInvoice(String woId) => _run(() async => (await api.dio.post<Map<String, dynamic>>('/invoices', data: {'work_order_id': woId})).data!['id'] as String);
  @override Future<Result<OrgWallet>> wallet(String orgId) => _run(() async { final d = (await api.dio.get<Map<String, dynamic>>('/organizations/$orgId/wallet')).data!; return OrgWallet(held: d['held'].toString(), available: d['available'].toString(), inTransit: d['payouts_in_transit'].toString(), payouts: ((d['payouts'] as List?) ?? []).cast<Map<String, dynamic>>().map((p) => (id: p['id'] as String, amount: p['amount'].toString(), status: p['status'] as String, scheduledFor: DateTime.parse(p['scheduledFor'] as String))).toList()); });
}
