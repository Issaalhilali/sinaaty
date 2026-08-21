import 'package:dio/dio.dart' show Options, ResponseType;
import '../../../core/api/api_client.dart';
import '../../../core/api/api_error_mapper.dart';
import '../../../core/result/result.dart';
import '../domain/fleet.dart';
import '../domain/fleet_repository.dart';

String _s(Object? v) => v?.toString() ?? '0';

FleetOverview overviewFromJson(Map<String, dynamic> j) {
  final p = j['policy'] as Map<String, dynamic>?;
  return FleetOverview(
    vehicles: (j['vehicles'] as num?)?.toInt() ?? 0,
    openWorkOrders: (j['openWorkOrders'] as num?)?.toInt() ?? 0,
    awaitingApproval: (j['awaitingApproval'] as num?)?.toInt() ?? 0,
    monthSpend: _s(j['monthSpend']),
    budgetRemaining: j['budget_remaining']?.toString(),
    budgetUsedPct: j['budget_used_pct']?.toString(),
    openNotes: (j['openNotes'] as num?)?.toInt() ?? 0,
    policyNameAr: p?['name_ar'] as String?,
    autoApproveBelow: p?['auto_approve_below']?.toString(),
    monthlyBudget: p?['monthly_budget']?.toString(),
  );
}

FleetPending pendingFromJson(Map<String, dynamic> j) {
  final policy = (j['policy'] as Map<String, dynamic>?) ?? const {};
  return FleetPending(
    workOrderId: j['id'] as String, number: j['number'] as String, total: _s(j['total']),
    workshopNameAr: j['workshopNameAr'] as String?, plate: j['plate'] as String?, assetCode: j['assetCode'] as String?,
    requestedAt: DateTime.tryParse((j['requestedAt'] ?? '') as String) ?? DateTime.now(),
    outcome: (policy['outcome'] ?? 'one_approver') as String,
    approvalsRequired: (policy['approvals_required'] as num?)?.toInt() ?? 1,
    blocked: policy['blocked'] as bool? ?? false,
    policyReasonAr: (policy['reason_ar'] ?? '') as String,
    approvals: ((j['approvals'] as List?) ?? []).cast<Map<String, dynamic>>().map((a) => FleetApprovalRecord(byNameAr: a['by'] as String?, decision: a['decision'] as String, noteAr: a['note_ar'] as String?, at: DateTime.tryParse((a['at'] ?? '') as String) ?? DateTime.now())).toList(),
    readyToSign: j['ready_to_sign'] as bool? ?? false,
  );
}

class FleetRepositoryImpl implements FleetRepository {
  final ApiClient api;
  FleetRepositoryImpl(this.api);
  Future<Result<T>> _run<T>(Future<T> Function() f) async { try { return Result.ok(await f()); } catch (e) { return Result.err(mapDioError(e)); } }

  @override Future<Result<FleetOverview>> overview(String orgId) => _run(() async => overviewFromJson((await api.dio.get<Map<String, dynamic>>('/fleet/$orgId/overview')).data!));
  @override Future<Result<List<FleetPending>>> pending(String orgId) => _run(() async => (await api.dio.get<List<dynamic>>('/fleet/$orgId/approvals')).data!.cast<Map<String, dynamic>>().map(pendingFromJson).toList());
  @override Future<Result<FleetDecision>> decide(String workOrderId, {required String decision, String? noteAr}) => _run(() async {
    final d = (await api.dio.post<Map<String, dynamic>>('/fleet/approvals/$workOrderId', data: {'decision': decision, 'note_ar': ?noteAr})).data!;
    return FleetDecision(decision: d['decision'] as String, approvals: (d['approvals'] as num).toInt(), approvalsRequired: (d['approvals_required'] as num).toInt(), readyToSign: d['ready_to_sign'] as bool? ?? false);
  });
  @override Future<Result<List<FleetStatement>>> statements(String orgId) => _run(() async => (await api.dio.get<List<dynamic>>('/fleet/$orgId/statements')).data!.cast<Map<String, dynamic>>().map(statementFromJson).toList());
  @override Future<Result<FleetStatement>> statement(String id) => _run(() async => statementFromJson((await api.dio.get<Map<String, dynamic>>('/fleet/statements/$id')).data!));
  @override Future<Result<FleetStatement>> generateStatement(String orgId, String month) => _run(() async => statementFromJson((await api.dio.post<Map<String, dynamic>>('/fleet/$orgId/statements', data: {'month': month})).data!));
  @override Future<Result<String>> statementCsv(String id) => _run(() async => (await api.dio.get<String>('/fleet/statements/$id/export.csv', options: Options(responseType: ResponseType.plain))).data!);
}

FleetStatement statementFromJson(Map<String, dynamic> j) => FleetStatement(
  id: j['id'] as String,
  periodStart: DateTime.tryParse((j['periodStart'] ?? '') as String) ?? DateTime.now(),
  periodEnd: DateTime.tryParse((j['periodEnd'] ?? '') as String) ?? DateTime.now(),
  total: _s(j['total']), status: (j['status'] ?? '') as String,
  invoiceCount: ((j['invoiceIds'] as List?) ?? []).length,
  lines: ((j['lines'] as List?) ?? []).cast<Map<String, dynamic>>().map((r) => FleetStatementLine(
    invoiceId: r['invoiceId'] as String, number: (r['number'] ?? '') as String,
    issueDate: DateTime.tryParse((r['issueDate'] ?? '') as String) ?? DateTime.now(),
    workOrderNumber: r['workOrderNumber'] as String?, plate: r['plate'] as String?, assetCode: r['assetCode'] as String?,
    total: _s(r['total']), status: (r['status'] ?? '') as String,
  )).toList(),
);
