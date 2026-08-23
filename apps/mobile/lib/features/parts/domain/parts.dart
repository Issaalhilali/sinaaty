/// Parts hub entities (workshop buyer side + supplier side).
class PartOffer { final String inventoryId; final String supplierOrgId; final String? supplierNameAr; final String titleAr; final String? partNumber; final String? brandAr; final String condition; final String? price; final String? tradePrice; final String? tradeAccountId; final int quantity; final int warrantyDays; final int? leadTimeHours; final bool isSerialized; final String fitmentSource; final String? whereText;
  const PartOffer({required this.inventoryId, required this.supplierOrgId, this.supplierNameAr, required this.titleAr, this.partNumber, this.brandAr, required this.condition, this.price, this.tradePrice, this.tradeAccountId, required this.quantity, required this.warrantyDays, this.leadTimeHours, required this.isSerialized, required this.fitmentSource, this.whereText});
  String? get bestPrice => tradePrice ?? price; }
class FitResult { final String? make; final String? model; final int? year; final List<PartOffer> offers; const FitResult({this.make, this.model, this.year, required this.offers}); String get vehicleLine => [make, model, year?.toString()].whereType<String>().join(' '); }
class PartBid { final String id; final String supplierOrgId; final String condition; final String unitPrice; final int quantity; final String deliveryFee; final int? etaHours; final int warrantyDays; final String? notesAr; final String status; final DateTime createdAt; final String? whereText; final String? distanceKm; const PartBid({required this.id, required this.supplierOrgId, required this.condition, required this.unitPrice, required this.quantity, required this.deliveryFee, this.etaHours, required this.warrantyDays, this.notesAr, required this.status, required this.createdAt, this.whereText, this.distanceKm}); }
class PartRequest { final String id; final String number; final String partNameAr; final String? vin; final String? descriptionAr; final List<String> acceptedConditions; final int quantity; final DateTime biddingEndsAt; final String status; final String? awardedBidId; final int bidsCount; final String? lowestBid; final List<PartBid> bids; final String? requesterOrgId; final DateTime createdAt;
  const PartRequest({required this.id, required this.number, required this.partNameAr, this.vin, this.descriptionAr, required this.acceptedConditions, required this.quantity, required this.biddingEndsAt, required this.status, this.awardedBidId, this.bidsCount = 0, this.lowestBid, this.bids = const [], this.requesterOrgId, required this.createdAt});
  bool get open => status == 'open' || status == 'bidding'; Duration get remaining => biddingEndsAt.difference(DateTime.now()); }
class PartOrderItem { final String descriptionAr; final String condition; final int quantity; final String unitPrice; final String lineTotal; final int warrantyDays; const PartOrderItem({required this.descriptionAr, required this.condition, required this.quantity, required this.unitPrice, required this.lineTotal, required this.warrantyDays}); }
class PartOrder { final String id; final String number; final String source; final String status; final String paymentTerms; final String supplierOrgId; final String? buyerOrgId; final String? buyerUserId; final String? workOrderId; final String total; final DateTime? deliveredAt; final DateTime? autoConfirmAt; final DateTime createdAt; final List<PartOrderItem> items; final String? invoiceId;
  /// Platform-delivery summary when the supplier handed the order to logistics — the order then follows the DRIVER.
  final ({String id, String number, String status, String? price})? delivery;
  const PartOrder({required this.id, required this.number, required this.source, required this.status, required this.paymentTerms, required this.supplierOrgId, this.buyerOrgId, this.buyerUserId, this.workOrderId, required this.total, this.deliveredAt, this.autoConfirmAt, required this.createdAt, required this.items, this.invoiceId, this.delivery});
  bool get isActive => !const {'confirmed', 'returned', 'cancelled'}.contains(status); }
class TradeAccount { final String id; final String sellerOrgId; final String buyerOrgId; final String status; final String creditLimit; final String outstanding; final String available; final int paymentTermsDays; final int discountBps; final String? counterpartyAr; const TradeAccount({required this.id, required this.sellerOrgId, required this.buyerOrgId, required this.status, required this.creditLimit, required this.outstanding, required this.available, required this.paymentTermsDays, required this.discountBps, this.counterpartyAr}); }
class SerialVerify { final bool genuine; final bool alert; final String? status; final String? serialNumber; final String? partNameAr; final String? partNumber; final String? brandAr; final String? issuerAr; final String messageAr; final String messageEn; const SerialVerify({required this.genuine, required this.alert, this.status, this.serialNumber, this.partNameAr, this.partNumber, this.brandAr, this.issuerAr, required this.messageAr, required this.messageEn}); }
class Warranty { final String id; final String number; final String covers; final String coverageAr; final DateTime startsAt; final DateTime endsAt; final String status; final String? partOrderId; final String? vehicleId; final String? issuerAr; const Warranty({required this.id, required this.number, required this.covers, required this.coverageAr, required this.startsAt, required this.endsAt, required this.status, this.partOrderId, this.vehicleId, this.issuerAr}); bool get valid => status == 'active' && endsAt.isAfter(DateTime.now()); }
class InventoryItem { final String id; final String titleAr; final String? partNumber; final String condition; final String? price; final String? tradePrice; final int quantity; final int reservedQty; final String? externalSku; const InventoryItem({required this.id, required this.titleAr, this.partNumber, required this.condition, this.price, this.tradePrice, required this.quantity, required this.reservedQty, this.externalSku}); }

/// Which bid wins on which axis — the customer compares three things and nothing else:
/// price, how soon it arrives, and how long it is guaranteed. Ties give every tied bid the tag.
enum BidHighlight { cheapest, fastest, longestWarranty, nearest }

Map<String, Set<BidHighlight>> bidHighlights(List<PartBid> bids) {
  final live = bids.where((b) => b.status == 'submitted' || b.status == 'accepted').toList();
  final out = <String, Set<BidHighlight>>{};
  if (live.length < 2) return out;
  void mark(BidHighlight h, Iterable<PartBid> winners) { for (final b in winners) { out.putIfAbsent(b.id, () => <BidHighlight>{}).add(h); } }
  final prices = live.map((b) => double.tryParse(b.unitPrice) ?? double.infinity).toList();
  final min = prices.reduce((a, b) => a < b ? a : b);
  if (min.isFinite) mark(BidHighlight.cheapest, live.where((b) => (double.tryParse(b.unitPrice) ?? double.infinity) == min));
  final withEta = live.where((b) => b.etaHours != null).toList();
  if (withEta.isNotEmpty) { final fastest = withEta.map((b) => b.etaHours!).reduce((a, b) => a < b ? a : b); mark(BidHighlight.fastest, withEta.where((b) => b.etaHours == fastest)); }
  final maxW = live.map((b) => b.warrantyDays).reduce((a, b) => a > b ? a : b);
  if (maxW > 0) mark(BidHighlight.longestWarranty, live.where((b) => b.warrantyDays == maxW));
  final withKm = live.where((b) => double.tryParse(b.distanceKm ?? '') != null).toList();
  if (withKm.isNotEmpty) { final nearest = withKm.map((b) => double.parse(b.distanceKm!)).reduce((a, b) => a < b ? a : b); mark(BidHighlight.nearest, withKm.where((b) => double.parse(b.distanceKm!) == nearest)); }
  return out;
}

/// Cheapest first — the order the customer expects when comparing offers.
List<PartBid> sortedForCompare(List<PartBid> bids) {
  final list = [...bids];
  list.sort((a, b) {
    int rank(PartBid x) => x.status == 'accepted' ? 0 : x.status == 'submitted' ? 1 : 2;
    final r = rank(a).compareTo(rank(b));
    if (r != 0) return r;
    return (double.tryParse(a.unitPrice) ?? double.infinity).compareTo(double.tryParse(b.unitPrice) ?? double.infinity);
  });
  return list;
}
