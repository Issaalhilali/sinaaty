import '../../../core/api/api_client.dart';
import '../../../core/api/api_error_mapper.dart';
import '../../../core/result/result.dart';
import '../domain/work_order.dart';
import '../domain/work_orders_repository.dart';
String _s(Object? v) => v?.toString() ?? '0';
WorkOrder workOrderFromJson(Map<String, dynamic> j) => WorkOrder(
  id: j['id'] as String, number: j['number'] as String, status: j['status'] as String, paymentTerms: j['paymentTerms'] as String, currentVersion: (j['currentVersion'] as num).toInt(), titleAr: j['titleAr'] as String?, vehicleId: j['vehicleId'] as String, orgId: j['orgId'] as String, vehicleLabelAr: j['vehicleLabelAr'] as String?, vehiclePlateAr: j['vehiclePlateAr'] as String?,
  subtotal: _s(j['subtotal']), vatAmount: _s(j['vatAmount']), total: _s(j['total']), depositRequired: _s(j['depositRequired']), createdAt: DateTime.parse(j['createdAt'] as String), promisedReadyAt: j['promisedReadyAt'] == null ? null : DateTime.tryParse(j['promisedReadyAt'] as String),
  items: ((j['items'] as List?) ?? []).map((e) => e as Map<String, dynamic>).where((i) => i['versionRemoved'] == null).map((i) => WoItem(id: i['id'] as String, type: i['type'] as String, descriptionAr: i['descriptionAr'] as String, quantity: _s(i['quantity']), unitPrice: _s(i['unitPrice']), lineTotal: _s(i['lineTotal']), warrantyDays: (i['warrantyDays'] as num?)?.toInt() ?? 0)).toList(),
);
class WorkOrdersRepositoryImpl implements WorkOrdersRepository {
  final ApiClient api; WorkOrdersRepositoryImpl(this.api);
  Future<Result<T>> _run<T>(Future<T> Function() f) async { try { return Result.ok(await f()); } catch (e) { return Result.err(mapDioError(e)); } }
  @override Future<Result<List<WorkOrder>>> list() => _run(() async => (await api.dio.get<List<dynamic>>('/work-orders')).data!.map((e) => workOrderFromJson(e as Map<String, dynamic>)).toList());
  @override Future<Result<WorkOrder>> get(String id) => _run(() async => workOrderFromJson((await api.dio.get<Map<String, dynamic>>('/work-orders/$id')).data!));
  @override Future<Result<WoTimeline>> timeline(String id) => _run(() async {
    final d = (await api.dio.get<Map<String, dynamic>>('/work-orders/$id/timeline')).data!;
    List<Map<String, dynamic>> l(String k) => ((d[k] as List?) ?? []).cast<Map<String, dynamic>>();
    return WoTimeline(status: d['status'] as String,
      history: l('history').map((h) => WoHistory(from: h['from'] as String?, to: h['to'] as String, at: DateTime.parse(h['createdAt'] as String), noteAr: h['noteAr'] as String?)).toList(),
      versions: l('versions').map((v) => WoVersionSummary(version: (v['version'] as num).toInt(), sha256: v['sha256'] as String, signed: v['signed'] as bool? ?? false, reasonAr: v['reasonAr'] as String?, createdAt: DateTime.parse(v['createdAt'] as String))).toList(),
      inspections: l('inspections').map((i) => WoInspection(id: i['id'] as String, type: i['type'] as String, odometerKm: (i['odometerKm'] as num?)?.toInt(), damagesCount: (i['damages'] as List?)?.length ?? 0, mediaIds: ((i['mediaIds'] as List?) ?? []).cast<String>(), performedAt: DateTime.parse(i['performedAt'] as String))).toList(),
      media: l('media').map((m) => WoMedia(mediaId: m['mediaId'] as String, label: m['label'] as String?, mimeType: m['mimeType'] as String)).toList());
  });
  @override Future<Result<WoVersion>> version(String id, int version) => _run(() async {
    final d = (await api.dio.get<Map<String, dynamic>>('/work-orders/$id/versions/$version')).data!; final s = d['snapshot'] as Map<String, dynamic>; final veh = (s['vehicle'] as Map?) ?? {}; final tot = (s['totals'] as Map?) ?? {}; final org = (s['org'] as Map?) ?? {};
    return WoVersion(version: (d['version'] as num).toInt(), sha256: d['sha256'] as String, signed: d['signed'] as bool? ?? false, signedMethod: (d['signature'] as Map?)?['method'] as String?, orgNameAr: (org['name_ar'] ?? '') as String,
      vehicleLine: [[veh['make_ar'], veh['model_ar'], veh['year']].where((x) => x != null).map((x) => x.toString()).join(' '), veh['plate']].where((x) => x != null && x.toString().isNotEmpty).join(' · '),
      paymentTerms: (s['payment_terms'] ?? '') as String, depositRequired: _s(s['deposit_required']), reasonAr: s['reason_ar'] as String?,
      items: ((s['items'] as List?) ?? []).cast<Map<String, dynamic>>().map((i) => (descriptionAr: i['description_ar'] as String, quantity: _s(i['quantity']), unitPrice: _s(i['unit_price']), lineTotal: _s(i['line_total']), warrantyDays: (i['warranty_days'] as num?)?.toInt() ?? 0)).toList(),
      subtotal: _s(tot['subtotal']), vat: _s(tot['vat']), total: _s(tot['total']));
  });
  @override Future<Result<ApproveInit>> approveInit(String id, {required String method, int? version}) => _run(() async { final d = (await api.dio.post<Map<String, dynamic>>('/work-orders/$id/approve', data: {'method': method, 'version': ?version})).data!; return ApproveInit(method: d['method'] as String, version: (d['version'] as num).toInt(), transactionId: d['transaction_id'] as String?, random: d['random']?.toString(), debugCode: d['debug_code'] as String?); });
  @override Future<Result<WorkOrder>> approveComplete(String id, {required String method, int? version, String? transactionId, String? code}) => _run(() async { final d = (await api.dio.post<Map<String, dynamic>>('/work-orders/$id/approve/complete', data: {'method': method, 'version': ?version, 'transaction_id': ?transactionId, 'code': ?code})).data!; return workOrderFromJson((d['work_order'] ?? d) as Map<String, dynamic>); });
  @override Future<Result<WorkOrder>> cancel(String id, String reasonAr) => _run(() async => workOrderFromJson(((await api.dio.post<Map<String, dynamic>>('/work-orders/$id/cancel', data: {'reason_ar': reasonAr})).data!['work_order'] ?? (await api.dio.get<Map<String, dynamic>>('/work-orders/$id')).data!) as Map<String, dynamic>));
  @override Future<Result<InspectionDiff>> inspectionDiff(String id) => _run(() async => inspectionDiffFromJson((await api.dio.get<Map<String, dynamic>>('/work-orders/$id/inspection-diff')).data!));
  @override Future<Result<void>> confirmReceipt(String id) => _run(() async { await api.dio.post<void>('/work-orders/$id/confirm-receipt'); });
}

DamageEntry _damageFromJson(Map<String, dynamic> j) => DamageEntry(
  zone: j['zone'] as String, zoneAr: (j['zone_ar'] ?? j['zone']) as String, severity: j['severity'] as String,
  noteAr: j['note_ar'] as String?, mediaIds: ((j['media_ids'] as List?) ?? []).cast<String>(),
  source: (j['source'] ?? 'inspector') as String,
  aiConfidence: (j['ai_confidence'] as num?)?.toDouble());

InspectionDiff inspectionDiffFromJson(Map<String, dynamic> j) {
  List<DamageEntry> list(String k) => ((j[k] as List?) ?? []).cast<Map<String, dynamic>>().map(_damageFromJson).toList();
  final ci = j['check_in'] as Map<String, dynamic>?; final co = j['check_out'] as Map<String, dynamic>?;
  return InspectionDiff(
    comparable: j['comparable'] as bool? ?? false,
    summaryAr: (j['summary_ar'] ?? '') as String,
    appeared: list('appeared'),
    worsened: ((j['worsened'] as List?) ?? []).cast<Map<String, dynamic>>().map((w) => WorsenedEntry(zone: w['zone'] as String, zoneAr: (w['zone_ar'] ?? w['zone']) as String, from: w['from'] as String, to: w['to'] as String)).toList(),
    repaired: list('repaired'),
    unchanged: list('unchanged'),
    checkInAt: ci == null ? null : DateTime.tryParse((ci['performed_at'] ?? '') as String),
    checkOutAt: co == null ? null : DateTime.tryParse((co['performed_at'] ?? '') as String),
    checkInPhotos: ((ci?['photos'] as List?) ?? []).cast<String>(),
    checkOutPhotos: ((co?['photos'] as List?) ?? []).cast<String>(),
  );
}
