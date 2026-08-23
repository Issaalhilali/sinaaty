class WoItem { final String id; final String type; final String descriptionAr; final String quantity; final String unitPrice; final String lineTotal; final int warrantyDays; const WoItem({required this.id, required this.type, required this.descriptionAr, required this.quantity, required this.unitPrice, required this.lineTotal, required this.warrantyDays}); }
class WorkOrder {
  final String id; final String number; final String status; final String paymentTerms; final int currentVersion; final String? titleAr; final String vehicleId; final String orgId;
  /// Who the order is FOR — a workshop scans cars, not order numbers (owner review 2026-08-23).
  final String? vehicleLabelAr; final String? vehiclePlateAr;
  final String subtotal; final String vatAmount; final String total; final String depositRequired; final DateTime createdAt; final DateTime? promisedReadyAt; final List<WoItem> items;
  /// «تويوتا 2002 · د م و 777» — the row's identity; falls back to the technical title, then the number.
  String get carLine { final parts = [vehicleLabelAr, vehiclePlateAr].where((x) => x != null && x.trim().isNotEmpty).cast<String>().toList(); return parts.isEmpty ? (titleAr ?? number) : parts.join(' · '); }
  bool get knowsCar => (vehicleLabelAr ?? vehiclePlateAr) != null;
  const WorkOrder({required this.id, required this.number, required this.status, required this.paymentTerms, required this.currentVersion, this.titleAr, required this.vehicleId, required this.orgId, this.vehicleLabelAr, this.vehiclePlateAr, required this.subtotal, required this.vatAmount, required this.total, required this.depositRequired, required this.createdAt, this.promisedReadyAt, required this.items});
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

/// One damage as the comparison reports it. `source` tells the reader whether a person recorded it
/// or the system suggested it — a dispute is never decided on a machine's word alone.
class DamageEntry {
  final String zone; final String zoneAr; final String severity; final String? noteAr;
  final List<String> mediaIds; final String source; final double? aiConfidence;
  const DamageEntry({required this.zone, required this.zoneAr, required this.severity, this.noteAr, required this.mediaIds, required this.source, this.aiConfidence});
}

class WorsenedEntry { final String zone; final String zoneAr; final String from; final String to; const WorsenedEntry({required this.zone, required this.zoneAr, required this.from, required this.to}); }

/// Check-in vs check-out: the answer to «هل تضررت سيارتي عند الورشة؟», with photos on both sides.
class InspectionDiff {
  final bool comparable;
  final String summaryAr;
  final List<DamageEntry> appeared;
  final List<WorsenedEntry> worsened;
  final List<DamageEntry> repaired;
  final List<DamageEntry> unchanged;
  final DateTime? checkInAt; final DateTime? checkOutAt;
  final List<String> checkInPhotos; final List<String> checkOutPhotos;
  const InspectionDiff({required this.comparable, required this.summaryAr, required this.appeared, required this.worsened, required this.repaired, required this.unchanged, this.checkInAt, this.checkOutAt, required this.checkInPhotos, required this.checkOutPhotos});
  bool get clean => comparable && appeared.isEmpty && worsened.isEmpty;
}
