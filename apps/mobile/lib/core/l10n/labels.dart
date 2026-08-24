import '../../features/parts/domain/parts.dart';
import 'app_localizations.dart';
/// Enum → localized label (keeps Arabic out of widgets; ARB is the source).
abstract final class Labels {
  static String woStatus(L10n l, String s) => switch (s) { 'draft' => l.statusDraft, 'received' => l.statusReceived, 'inspecting' => l.statusInspecting, 'awaiting_approval' => l.statusAwaitingApproval, 'approved' => l.statusApproved, 'awaiting_parts' => l.statusAwaitingParts, 'in_progress' => l.statusInProgress, 'quality_check' => l.statusQualityCheck, 'ready' => l.statusReady, 'delivered' => l.statusDelivered, 'closed' => l.statusClosed, 'cancelled' => l.statusCancelled, 'disputed' => l.statusDisputed, 'abandoned' => l.statusAbandoned, _ => s };
  static String invoiceStatus(L10n l, String s) => switch (s) { 'issued' || 'sent' => l.invStatusIssued, 'paid' => l.invStatusPaid, 'partially_paid' => l.invStatusPartiallyPaid, 'void' => l.invStatusVoid, 'overdue' => l.invStatusOverdue, 'refunded' => l.invStatusRefunded, _ => s };
  static String noteStatus(L10n l, String s) => switch (s) { 'issued' => l.noteStatusIssued, 'partially_settled' => l.noteStatusPartiallySettled, 'closed' => l.noteStatusClosed, 'in_enforcement' || 'enforced' => l.noteStatusInEnforcement, 'cancelled' || 'rejected' => l.noteStatusCancelled, _ => l.noteStatusPending };
  static String condition(L10n l, String s) => switch (s) { 'oem_new' => l.ptCondOem, 'aftermarket_new' => l.ptCondAftermarket, 'used_scrapyard' => l.ptCondUsed, 'refurbished' => l.ptCondRefurb, _ => s };
  static String partOrderStatus(L10n l, String s) => switch (s) { 'pending_payment' => l.spAwaitingPayment, 'paid' => l.spPaid, 'preparing' => l.spPreparing, 'shipped' => l.spShip, 'delivered' => l.spDelivered, 'installed' => l.ptInstalled, 'confirmed' => l.spConfirmed, 'cancelled' => l.spCancelled, 'disputed' => l.spDisputed, 'returned' => l.spReturned, _ => s };
  static String covers(L10n l, String s) => switch (s) { 'part' => l.ptWarrantyPart, 'labor' => l.ptWarrantyLabor, _ => l.ptWarrantyBoth };
  static String transportStatus(L10n l, String s) => switch (s) { 'requested' => l.towStatusRequested, 'searching' => l.towStatusSearching, 'assigned' => l.towStatusAssigned, 'en_route_pickup' => l.towStatusEnRoutePickup, 'picked_up' => l.towStatusPickedUp, 'en_route_dropoff' => l.towStatusEnRouteDropoff, 'delivered' => l.towStatusDelivered, 'completed' => l.towStatusCompleted, 'cancelled' => l.towStatusCancelled, 'failed' => l.towStatusFailed, _ => s };
  static String bidHighlight(L10n l, BidHighlight h) => switch (h) { BidHighlight.cheapest => l.ptCheapest, BidHighlight.fastest => l.ptFastest, BidHighlight.longestWarranty => l.ptLongestWarranty, BidHighlight.nearest => l.srNearestBadge };
  static String terms(L10n l, String s) => switch (s) { 'prepaid' => l.termsPrepaid, 'on_delivery' => l.termsOnDelivery, 'deferred' => l.termsDeferred, 'installments' => l.termsInstallments, 'fleet_monthly' => l.termsFleetMonthly, _ => s };
  static String disputeStatus(L10n l, String s) => switch (s) { 'open' => l.dsStOpen, 'under_review' => l.dsStUnderReview, 'awaiting_parties' => l.dsStAwaiting, 'escalated' => l.dsStEscalated, 'resolved' => l.dsStResolved, 'closed' => l.dsStClosed, _ => s };
  static String disputeCategory(L10n l, String s) => switch (s) { 'scope' => l.dsCatScope, 'quality' => l.dsCatQuality, 'price' => l.dsCatPrice, 'delay' => l.dsCatDelay, 'damage' => l.dsCatDamage, 'part_defect' => l.dsCatPartDefect, 'no_show' => l.dsCatNoShow, _ => s };

  /// «ينتهي خلال ١٨ د» ثم «٣ ساعة» ثم «يومان» — الوحدة تكبر مع المدة، فلا يقرأ أحد «1064 د».
  static String endsIn(L10n l, Duration d) {
    final r = remainingIn(d);
    return switch (r.unit) {
      RemainingUnit.ended => l.ptEnded,
      RemainingUnit.minutes => l.ptEndsIn(r.value),
      RemainingUnit.hours => l.ptEndsInHours(r.value),
      RemainingUnit.days => l.ptEndsInDays(r.value),
    };
  }
}
