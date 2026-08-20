import '../../../core/api/api_client.dart';
import '../../../core/api/api_error_mapper.dart';
import '../../../core/result/result.dart';
import '../domain/accident_report.dart';
import '../domain/accidents_repository.dart';

AccidentReport accidentFromJson(Map<String, dynamic> j) => AccidentReport(
  id: j['id'] as String?,
  ref: j['ref'] as String,
  status: j['status'] as String,
  actionable: j['actionable'] as bool? ?? false,
  insurerNameAr: j['insurer_name_ar'] as String?,
  claimNo: j['claim_no'] as String?,
  approvedAmount: j['approved_amount']?.toString(),
  deductibleAmount: j['deductible_amount']?.toString(),
  faultPercent: j['fault_percent']?.toString(),
  damages: ((j['damages'] as List?) ?? []).cast<Map<String, dynamic>>().map((d) => AccidentDamage(partCode: (d['partCode'] ?? d['part_code'] ?? '') as String, labelAr: (d['labelAr'] ?? d['label_ar'] ?? '') as String, severity: (d['severity'] ?? 'minor') as String, action: (d['action'] ?? 'repair') as String)).toList(),
  suggestedItems: ((j['suggested_items'] as List?) ?? []).cast<Map<String, dynamic>>().map((s) => AccidentSuggestedItem(type: (s['type'] ?? 'labor') as String, descriptionAr: (s['descriptionAr'] ?? s['description_ar'] ?? '') as String, quantity: (s['quantity'] ?? '1').toString())).toList(),
  customerEstimatedTotal: (j['customer_estimate'] as Map<String, dynamic>?)?['estimated_customer_total']?.toString(),
  repairSubmissionRef: (j['repair_submission_ref'] ?? j['submission_ref']) as String?,
);

class AccidentsRepositoryImpl implements AccidentsRepository {
  final ApiClient api;
  AccidentsRepositoryImpl(this.api);
  Future<Result<T>> _run<T>(Future<T> Function() f) async { try { return Result.ok(await f()); } catch (e) { return Result.err(mapDioError(e)); } }

  @override Future<Result<AccidentReport>> lookup({required String ref, String? vin}) => _run(() async => accidentFromJson((await api.dio.post<Map<String, dynamic>>('/accident-reports/lookup', data: {'ref': ref, 'vin': ?vin})).data!));
  @override Future<Result<AccidentReport>> link({required String ref, required String workOrderId, required String orgId}) => _run(() async => accidentFromJson((await api.dio.post<Map<String, dynamic>>('/accident-reports', data: {'ref': ref, 'work_order_id': workOrderId, 'org_id': orgId})).data!));
  @override Future<Result<AccidentReport>> forWorkOrder(String workOrderId) => _run(() async => accidentFromJson((await api.dio.get<Map<String, dynamic>>('/work-orders/$workOrderId/accident-report')).data!));
  @override Future<Result<AccidentReport>> submitRepair(String reportId) => _run(() async => accidentFromJson((await api.dio.post<Map<String, dynamic>>('/accident-reports/$reportId/submit-repair', data: const {})).data!));
}
