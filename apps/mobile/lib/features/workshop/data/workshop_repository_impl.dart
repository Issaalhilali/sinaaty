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
  @override Future<Result<({String type, String nameAr})>> orgInfo(String orgId) => _run(() async { final d = (await api.dio.get<Map<String, dynamic>>('/organizations/$orgId')).data!; return (type: d['type'] as String, nameAr: (d['tradeNameAr'] ?? d['legalNameAr'] ?? '') as String); });
  @override Future<Result<List<WorkOrder>>> orgOrders(String orgId, {List<String>? status}) => _run(() async => (await api.dio.get<List<dynamic>>('/work-orders', queryParameters: {'org_id': orgId, 'limit': 100, if (status != null) 'status': status.join(',')})).data!.map((e) => workOrderFromJson(e as Map<String, dynamic>)).toList());
  @override Future<Result<WorkOrder>> create(NewWorkOrder w) => _run(() async => workOrderFromJson((await api.dio.post<Map<String, dynamic>>('/work-orders', data: {'org_id': w.orgId, 'vin': ?w.vin, 'plate': ?w.plate, 'customer_phone': w.customerPhone, 'title_ar': w.titleAr, 'payment_terms': w.paymentTerms, 'complaint_ar': ?w.complaintAr, 'items': w.items.map(_item).toList()})).data!));
  @override Future<Result<WorkOrder>> addItem(String woId, NewItem item) => _run(() async => workOrderFromJson((await api.dio.post<Map<String, dynamic>>('/work-orders/$woId/items', data: _item(item))).data!));
  @override Future<Result<WorkOrder>> removeItem(String woId, String itemId) => _run(() async => workOrderFromJson((await api.dio.delete<Map<String, dynamic>>('/work-orders/$woId/items/$itemId')).data!));
  @override Future<Result<WorkOrder>> transition(String woId, String to, {String? noteAr}) => _run(() async { final d = (await api.dio.post<Map<String, dynamic>>('/work-orders/$woId/transition', data: {'to': to, 'note_ar': ?noteAr})).data!; return workOrderFromJson((d['work_order'] ?? d) as Map<String, dynamic>); });
  @override Future<Result<void>> requestApproval(String woId) => _run(() async { await api.dio.post<void>('/work-orders/$woId/request-approval', data: {}); });
  @override Future<Result<Presigned>> presign({required String mimeType, required int sizeBytes, required String sha256, required String purpose}) => _run(() async { final d = (await api.dio.post<Map<String, dynamic>>('/media/presign', data: {'kind': 'image', 'mime_type': mimeType, 'size_bytes': sizeBytes, 'sha256': sha256, 'purpose': purpose})).data!; return Presigned(mediaId: d['media_id'] as String, uploadUrl: ((d['upload'] as Map?)?['url'] ?? '') as String); });
  @override Future<Result<void>> upload(Presigned p, List<int> bytes, String mimeType) => _run(() async { if (p.uploadUrl.isEmpty || p.uploadUrl.startsWith('mock://')) return; await Dio().put<void>(p.uploadUrl, data: Stream.fromIterable([bytes]), options: Options(headers: {'content-type': mimeType, 'content-length': bytes.length})); });
  @override Future<Result<void>> inspect(String woId, NewInspection i) => _run(() async { await api.dio.post<void>('/work-orders/$woId/inspections', data: {'type': i.type, 'odometer_km': ?i.odometerKm, 'fuel_level_pct': ?i.fuelLevelPct, 'checklist': {'angles': i.anglesToMedia}, 'damages': i.damages.map((d) => {'zone': d.zone, 'severity': d.severity, 'note_ar': ?d.noteAr}).toList(), 'media_ids': i.mediaIds}); });
  @override Future<Result<void>> attachMedia(String woId, List<String> mediaIds, {String label = 'progress'}) => _run(() async { await api.dio.post<void>('/work-orders/$woId/media', data: {'media_ids': mediaIds, 'label': label}); });
  @override Future<Result<String>> issueInvoice(String woId) => _run(() async => (await api.dio.post<Map<String, dynamic>>('/invoices', data: {'work_order_id': woId})).data!['id'] as String);
  @override Future<Result<OrgWallet>> wallet(String orgId) => _run(() async { final d = (await api.dio.get<Map<String, dynamic>>('/organizations/$orgId/wallet')).data!; return OrgWallet(held: d['held'].toString(), available: d['available'].toString(), inTransit: d['payouts_in_transit'].toString(), payouts: ((d['payouts'] as List?) ?? []).cast<Map<String, dynamic>>().map((p) => (id: p['id'] as String, amount: p['amount'].toString(), status: p['status'] as String, scheduledFor: DateTime.parse(p['scheduledFor'] as String))).toList()); });
}
