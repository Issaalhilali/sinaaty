/// Workshop-side entities beyond the shared WorkOrder (features/work_orders/domain).
class NewItem { final String type; final String descriptionAr; final String quantity; final String unitPrice; final int warrantyDays; final String? partCondition; const NewItem({required this.type, required this.descriptionAr, this.quantity = '1', required this.unitPrice, this.warrantyDays = 0, this.partCondition}); }
class NewWorkOrder { final String orgId; final String? vin; final String? plate; final String customerPhone; final String titleAr; final String paymentTerms; final String? complaintAr; final List<NewItem> items; const NewWorkOrder({required this.orgId, this.vin, this.plate, required this.customerPhone, required this.titleAr, required this.paymentTerms, this.complaintAr, required this.items}); }
class Damage { final String zone; final String severity; final String? noteAr; const Damage({required this.zone, required this.severity, this.noteAr}); }
class NewInspection { final String type; final int? odometerKm; final int? fuelLevelPct; final List<Damage> damages; final List<String> mediaIds; final Map<String, String> anglesToMedia; const NewInspection({required this.type, this.odometerKm, this.fuelLevelPct, this.damages = const [], this.mediaIds = const [], this.anglesToMedia = const <String, String>{},}); }
class Presigned { final String mediaId; final String uploadUrl; const Presigned({required this.mediaId, required this.uploadUrl}); }
class OrgWallet { final String held; final String available; final String inTransit; final List<({String id, String amount, String status, DateTime scheduledFor})> payouts; const OrgWallet({required this.held, required this.available, required this.inTransit, required this.payouts}); }
/// One of the three legally-scheduled notices (the last is formal); sent when [sentAt] is set.
class AbandonedNoticeStep { final int step; final int afterDays; final bool formal; final DateTime? sentAt; const AbandonedNoticeStep({required this.step, required this.afterDays, required this.formal, this.sentAt}); bool get sent => sentAt != null; }
/// Where the uncollected car stands: notices, accruing storage, and whether a declaration is allowed — the server decides, never the client.
class AbandonedStatus {
  final String status; final int daysReady; final List<AbandonedNoticeStep> steps;
  final String storageAmount; final String perDay; final int freeDays; final int chargeableDays;
  final bool canDeclare; final String? reasonAr;
  const AbandonedStatus({required this.status, required this.daysReady, required this.steps, required this.storageAmount, required this.perDay, required this.freeDays, required this.chargeableDays, required this.canDeclare, this.reasonAr});
}
/// Statuses the workshop moves an order through with one tap (customer approval sits between inspecting and in_progress).
const workshopNext = <String, String>{'draft': 'received', 'received': 'inspecting', 'approved': 'in_progress', 'awaiting_parts': 'in_progress', 'in_progress': 'quality_check', 'quality_check': 'ready', 'ready': 'delivered'};
/// The 8 check-in angles (order matters for the grid).
const inspectionAngles = ['front', 'front_right', 'right', 'rear_right', 'rear', 'rear_left', 'left', 'front_left'];
