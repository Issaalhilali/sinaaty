import 'app_localizations.dart';
/// Enum → localized label (keeps Arabic out of widgets; ARB is the source).
abstract final class Labels {
  static String woStatus(L10n l, String s) => switch (s) { 'draft' => l.statusDraft, 'received' => l.statusReceived, 'inspecting' => l.statusInspecting, 'awaiting_approval' => l.statusAwaitingApproval, 'approved' => l.statusApproved, 'awaiting_parts' => l.statusAwaitingParts, 'in_progress' => l.statusInProgress, 'quality_check' => l.statusQualityCheck, 'ready' => l.statusReady, 'delivered' => l.statusDelivered, 'closed' => l.statusClosed, 'cancelled' => l.statusCancelled, 'disputed' => l.statusDisputed, 'abandoned' => l.statusAbandoned, _ => s };
  static String invoiceStatus(L10n l, String s) => switch (s) { 'issued' || 'sent' => l.invStatusIssued, 'paid' => l.invStatusPaid, 'partially_paid' => l.invStatusPartiallyPaid, 'void' => l.invStatusVoid, 'overdue' => l.invStatusOverdue, 'refunded' => l.invStatusRefunded, _ => s };
  static String noteStatus(L10n l, String s) => switch (s) { 'issued' => l.noteStatusIssued, 'partially_settled' => l.noteStatusPartiallySettled, 'closed' => l.noteStatusClosed, 'in_enforcement' || 'enforced' => l.noteStatusInEnforcement, 'cancelled' || 'rejected' => l.noteStatusCancelled, _ => l.noteStatusPending };
  static String terms(L10n l, String s) => switch (s) { 'prepaid' => l.termsPrepaid, 'on_delivery' => l.termsOnDelivery, 'deferred' => l.termsDeferred, 'installments' => l.termsInstallments, 'fleet_monthly' => l.termsFleetMonthly, _ => s };
}
