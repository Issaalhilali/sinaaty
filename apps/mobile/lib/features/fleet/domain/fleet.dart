/// The fleet manager's day, as one card of numbers.
class FleetOverview {
  final int vehicles;
  final int openWorkOrders;
  final int awaitingApproval;
  final String monthSpend;
  final String? budgetRemaining;
  final String? budgetUsedPct;
  final int openNotes;
  final String? policyNameAr;
  final String? autoApproveBelow;
  final String? monthlyBudget;
  const FleetOverview({required this.vehicles, required this.openWorkOrders, required this.awaitingApproval, required this.monthSpend, this.budgetRemaining, this.budgetUsedPct, required this.openNotes, this.policyNameAr, this.autoApproveBelow, this.monthlyBudget});
}

class FleetApprovalRecord { final String? byNameAr; final String decision; final String? noteAr; final DateTime at; const FleetApprovalRecord({this.byNameAr, required this.decision, this.noteAr, required this.at}); }

/// One repair waiting on the fleet, with what its own policy says about it.
class FleetPending {
  final String workOrderId;
  final String number;
  final String total;
  final String? workshopNameAr;
  final String? plate;
  final String? assetCode;
  final DateTime requestedAt;
  final String outcome;           // auto | one_approver | two_approvers | workshop_not_allowed | over_budget
  final int approvalsRequired;
  final bool blocked;
  final String policyReasonAr;
  final List<FleetApprovalRecord> approvals;
  final bool readyToSign;
  const FleetPending({required this.workOrderId, required this.number, required this.total, this.workshopNameAr, this.plate, this.assetCode, required this.requestedAt, required this.outcome, required this.approvalsRequired, required this.blocked, required this.policyReasonAr, required this.approvals, required this.readyToSign});
  int get approvedCount => approvals.where((a) => a.decision == 'approved').length;
  bool get rejected => approvals.any((a) => a.decision == 'rejected');
}

class FleetDecision { final String decision; final int approvals; final int approvalsRequired; final bool readyToSign; const FleetDecision({required this.decision, required this.approvals, required this.approvalsRequired, required this.readyToSign}); }
