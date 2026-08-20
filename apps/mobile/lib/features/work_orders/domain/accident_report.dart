/// An insurance accident file (منجز/تقدير) as the workshop sees it behind a repair.
class AccidentDamage { final String partCode; final String labelAr; final String severity; final String action; const AccidentDamage({required this.partCode, required this.labelAr, required this.severity, required this.action}); }
class AccidentSuggestedItem { final String type; final String descriptionAr; final String quantity; const AccidentSuggestedItem({required this.type, required this.descriptionAr, required this.quantity}); }

class AccidentReport {
  final String? id;                     // null while it is only a preview (lookup), before linking
  final String ref;
  final String status;
  final bool actionable;                // priced by the assessor — safe to work from
  final String? insurerNameAr;
  final String? claimNo;
  final String? approvedAmount;
  final String? deductibleAmount;
  final String? faultPercent;
  final List<AccidentDamage> damages;
  final List<AccidentSuggestedItem> suggestedItems;
  final String? customerEstimatedTotal; // deductible + fault share, capped — what the customer pays
  final String? repairSubmissionRef;    // set once FR-WO-10 was registered back with the provider
  const AccidentReport({this.id, required this.ref, required this.status, required this.actionable, this.insurerNameAr, this.claimNo, this.approvedAmount, this.deductibleAmount, this.faultPercent, required this.damages, required this.suggestedItems, this.customerEstimatedTotal, this.repairSubmissionRef});
  bool get linked => id != null;
  bool get submitted => repairSubmissionRef != null;
}
