import '../../../core/api/api_client.dart';
import '../../../core/api/api_error_mapper.dart';
import '../../../core/result/result.dart';
import '../domain/billing.dart';
import '../domain/billing_repository.dart';
String _s(Object? v) => v?.toString() ?? '0';
DateTime? _d(Object? v) => v is String ? DateTime.tryParse(v) : null;
Invoice invoiceFromJson(Map<String, dynamic> j) => Invoice(id: j['id'] as String, number: j['number'] as String, type: j['type'] as String, status: j['status'] as String, workOrderId: j['workOrderId'] as String?, sellerNameAr: ((j['sellerSnapshot'] as Map?)?['name_ar'] ?? '') as String, subtotal: _s(j['subtotal']), vatTotal: _s(j['vatTotal']), total: _s(j['total']), paidTotal: _s(j['paidTotal']), paymentTerms: (j['paymentTerms'] ?? '') as String, issueDate: _d(j['issueDate']), dueDate: _d(j['dueDate']), qrBase64: j['zatcaQr'] as String?,
  lines: ((j['lines'] as List?) ?? []).cast<Map<String, dynamic>>().map((l) => InvoiceLine(descriptionAr: l['descriptionAr'] as String, quantity: _s(l['quantity']), unitPrice: _s(l['unitPrice']), vatAmount: _s(l['vatAmount']), lineTotal: _s(l['lineTotal']))).toList());
PromissoryNote noteFromJson(Map<String, dynamic> j) { final st = j['settlement'] as Map<String, dynamic>?; return PromissoryNote(id: j['id'] as String, number: j['number'] as String, status: j['status'] as String, amount: _s(j['amount']), outstanding: _s(j['outstandingAmount']), dueDate: _d(j['dueDate']), overdue: j['overdue'] as bool? ?? false, workOrderId: j['workOrderId'] as String?, invoiceId: j['invoiceId'] as String?, nafezReference: j['nafezReference'] as String?,
  events: ((j['events'] as List?) ?? []).cast<Map<String, dynamic>>().map((e) => NoteEvent(toStatus: e['toStatus'] as String, amountDelta: e['amountDelta']?.toString(), noteAr: e['noteAr'] as String?, at: DateTime.parse(e['createdAt'] as String))).toList(),
  settlement: st == null ? null : (id: st['id'] as String, number: st['number'] as String, issuedAt: DateTime.parse(st['issuedAt'] as String))); }
class BillingRepositoryImpl implements BillingRepository {
  final ApiClient api; BillingRepositoryImpl(this.api);
  Future<Result<T>> _run<T>(Future<T> Function() f) async { try { return Result.ok(await f()); } catch (e) { return Result.err(mapDioError(e)); } }
  @override Future<Result<List<Invoice>>> invoices() => _run(() async => (await api.dio.get<List<dynamic>>('/invoices')).data!.map((e) => invoiceFromJson(e as Map<String, dynamic>)).toList());
  @override Future<Result<Invoice>> invoice(String id) => _run(() async => invoiceFromJson((await api.dio.get<Map<String, dynamic>>('/invoices/$id')).data!));
  @override Future<Result<PaymentIntent>> createPayment(String invoiceId, String method) => _run(() async { final d = (await api.dio.post<Map<String, dynamic>>('/payments', data: {'invoice_id': invoiceId, 'method': method})).data!; return PaymentIntent(paymentId: d['payment_id'] as String, amount: _s(d['amount']), redirectUrl: (d['intent'] as Map?)?['redirect_url'] as String?); });
  @override Future<Result<void>> mockPay(String paymentId) => _run(() async { await api.dio.post<void>('/payments/$paymentId/mock-pay'); });
  @override Future<Result<List<PromissoryNote>>> notes() => _run(() async => (await api.dio.get<List<dynamic>>('/promissory-notes')).data!.map((e) => noteFromJson(e as Map<String, dynamic>)).toList());
  @override Future<Result<PromissoryNote>> note(String id) => _run(() async => noteFromJson((await api.dio.get<Map<String, dynamic>>('/promissory-notes/$id')).data!));
}
