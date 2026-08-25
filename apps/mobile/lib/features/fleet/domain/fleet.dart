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

/// قاعدة الصرف كما يضبطها مسؤول الأسطول — الحدود نصوص لأن المبالغ لا تُخزَّن أرقاماً عشرية.
class FleetPolicy {
  final String? id; final String nameAr;
  final String autoApproveBelow; final String? requiresTwoApproversAbove; final String? monthlyBudget;
  final List<String> allowedOrgIds; final bool isActive;
  const FleetPolicy({this.id, required this.nameAr, required this.autoApproveBelow,
    this.requiresTwoApproversAbove, this.monthlyBudget, this.allowedOrgIds = const [], this.isActive = true});
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

/// One invoice line inside a monthly statement.
class FleetStatementLine { final String invoiceId; final String number; final DateTime issueDate; final String? workOrderNumber; final String? plate; final String? assetCode; final String total; final String status; const FleetStatementLine({required this.invoiceId, required this.number, required this.issueDate, this.workOrderNumber, this.plate, this.assetCode, required this.total, required this.status}); }
/// The month's invoices as one accounting-ready document (Step 26; idempotent per period on the API).
class FleetStatement { final String id; final DateTime periodStart; final DateTime periodEnd; final String total; final String status; final int invoiceCount; final List<FleetStatementLine> lines; const FleetStatement({required this.id, required this.periodStart, required this.periodEnd, required this.total, required this.status, required this.invoiceCount, this.lines = const []}); }
