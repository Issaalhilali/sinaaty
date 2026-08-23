import '../../../core/result/result.dart';
import 'parts.dart';
abstract interface class PartsRepository {
  // buyer (workshop / customer)
  Future<Result<FitResult>> fit({String? vin, String? vehicleId, String? categoryCode, String? text, String? buyerOrgId});
  Future<Result<PartOrder>> buyNow({String? orgId, String? workOrderId, required String paymentTerms, required List<({String inventoryId, int quantity})> items});
  Future<Result<PartRequest>> createRequest({String? orgId, String? workOrderId, String? vin, required String partNameAr, String? descriptionAr, List<String>? acceptedConditions, int quantity = 1, int? biddingMinutes});
  Future<Result<List<PartRequest>>> myRequests({String? orgId, bool asSupplier = false});
  Future<Result<PartRequest>> request(String id);
  Future<Result<PartOrder>> accept(String requestId, String bidId, {String paymentTerms = 'prepaid'});
  Future<Result<List<PartOrder>>> orders({String? orgId, bool asSupplier = false});
  Future<Result<PartOrder>> order(String id);
  Future<Result<void>> confirm(String orderId);
  /// «أرسلها بتوصيل المنصة» (paid/preparing only; once — the order then follows the driver).
  Future<Result<void>> requestDelivery(String orderId);
  Future<Result<List<TradeAccount>>> tradeAccounts({required String orgId, required bool asSeller});
  Future<Result<TradeAccount>> requestTradeAccount({required String sellerOrgId, required String buyerOrgId});
  Future<Result<TradeAccount>> approveTradeAccount(String id, {required String creditLimit, int termsDays = 30, int discountBps = 0});
  Future<Result<SerialVerify>> verify(String qrToken);
  Future<Result<Warranty>> install({required String qrToken, required String workOrderItemId, int laborWarrantyDays = 180});
  Future<Result<List<Warranty>>> warranties({String? orgId});
  // supplier
  Future<Result<PartBid>> bid(String requestId, {required String orgId, required String condition, required String unitPrice, int quantity = 1, String deliveryFee = '0', int? etaHours, int warrantyDays = 0, String? notesAr});
  Future<Result<PartOrder>> transition(String orderId, String to);
  Future<Result<List<InventoryItem>>> inventory(String orgId);
  Future<Result<({int issued, String batchCode})>> issueSerials({required String orgId, required String catalogId, required int count});
}
/// Camera QR scanning port (mobile_scanner impl in data/; tests inject a fake).
abstract interface class QrScanner { Future<String?> scan(); }
