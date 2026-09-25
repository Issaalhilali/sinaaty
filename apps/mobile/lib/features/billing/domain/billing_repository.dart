import '../../../core/result/result.dart';
import 'billing.dart';
abstract interface class BillingRepository {
  Future<Result<List<Invoice>>> invoices();
  Future<Result<Invoice>> invoice(String id);
  Future<Result<PaymentIntent>> createPayment(String invoiceId, String method);
  /// Dev/mock PSP only: simulates the card sheet + webhook. Live PSP opens redirectUrl instead.
  Future<Result<void>> mockPay(String paymentId);
  Future<Result<List<PromissoryNote>>> notes();
  Future<Result<PromissoryNote>> note(String id);
}
