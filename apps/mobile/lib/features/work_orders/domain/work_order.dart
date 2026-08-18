class WoItem { final String id; final String type; final String descriptionAr; final String quantity; final String unitPrice; final String lineTotal; final int warrantyDays; const WoItem({required this.id, required this.type, required this.descriptionAr, required this.quantity, required this.unitPrice, required this.lineTotal, required this.warrantyDays}); }
class WorkOrder {
  final String id; final String number; final String status; final String paymentTerms; final int currentVersion; final String? titleAr; final String vehicleId; final String orgId;
  final String subtotal; final String vatAmount; final String total; final String depositRequired; final DateTime createdAt; final DateTime? promisedReadyAt; final List<WoItem> items;
  const WorkOrder({required this.id, required this.number, required this.status, required this.paymentTerms, required this.currentVersion, this.titleAr, required this.vehicleId, required this.orgId, required this.subtotal, required this.vatAmount, required this.total, required this.depositRequired, required this.createdAt, this.promisedReadyAt, required this.items});
  bool get awaitingApproval => status == 'awaiting_approval';
  bool get isActive => !const {'closed', 'cancelled', 'abandoned'}.contains(status);
}
class WoHistory { final String? from; final String to; final DateTime at; final String? noteAr; const WoHistory({this.from, required this.to, required this.at, this.noteAr}); }
class WoVersionSummary { final int version; final String sha256; final bool signed; final String? reasonAr; final DateTime createdAt; const WoVersionSummary({required this.version, required this.sha256, required this.signed, this.reasonAr, required this.createdAt}); }
class WoInspection { final String id; final String type; final int? odometerKm; final int damagesCount; final List<String> mediaIds; final DateTime performedAt; const WoInspection({required this.id, required this.type, this.odometerKm, required this.damagesCount, required this.mediaIds, required this.performedAt}); }
class WoMedia { final String mediaId; final String? label; final String mimeType; const WoMedia({required this.mediaId, this.label, required this.mimeType}); }
class WoTimeline { final String status; final List<WoHistory> history; final List<WoVersionSummary> versions; final List<WoInspection> inspections; final List<WoMedia> media; const WoTimeline({required this.status, required this.history, required this.versions, required this.inspections, required this.media}); }
/// The signed snapshot the customer approves — rendered as-is (source of truth is the server hash).
class WoVersion {
  final int version; final String sha256; final bool signed; final String? signedMethod; final String orgNameAr; final String vehicleLine; final String paymentTerms; final String depositRequired; final String? reasonAr;
  final List<({String descriptionAr, String quantity, String unitPrice, String lineTotal, int warrantyDays})> items; final String subtotal; final String vat; final String total;
  const WoVersion({required this.version, required this.sha256, required this.signed, this.signedMethod, required this.orgNameAr, required this.vehicleLine, required this.paymentTerms, required this.depositRequired, this.reasonAr, required this.items, required this.subtotal, required this.vat, required this.total});
}
class ApproveInit { final String method; final int version; final String? transactionId; final String? random; final String? debugCode; const ApproveInit({required this.method, required this.version, this.transactionId, this.random, this.debugCode}); }
/// Customer-visible order of statuses for the timeline.
const woFlow = ['received', 'inspecting', 'awaiting_approval', 'in_progress', 'quality_check', 'ready', 'delivered', 'closed'];
