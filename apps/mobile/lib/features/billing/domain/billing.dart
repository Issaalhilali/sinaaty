class InvoiceLine { final String descriptionAr; final String quantity; final String unitPrice; final String vatAmount; final String lineTotal; const InvoiceLine({required this.descriptionAr, required this.quantity, required this.unitPrice, required this.vatAmount, required this.lineTotal}); }
class Invoice {
  final String id; final String number; final String type; final String status; final String? workOrderId; final String sellerNameAr; final String subtotal; final String vatTotal; final String total; final String paidTotal; final String paymentTerms; final DateTime? issueDate; final DateTime? dueDate; final String? qrBase64; final List<InvoiceLine> lines;
  const Invoice({required this.id, required this.number, required this.type, required this.status, this.workOrderId, required this.sellerNameAr, required this.subtotal, required this.vatTotal, required this.total, required this.paidTotal, required this.paymentTerms, this.issueDate, this.dueDate, this.qrBase64, required this.lines});
  bool get isPaid => status == 'paid'; bool get payable => const {'issued', 'sent', 'partially_paid', 'overdue'}.contains(status);
  String get remaining => ((double.tryParse(total) ?? 0) - (double.tryParse(paidTotal) ?? 0)).toStringAsFixed(2);
}
class PaymentIntent { final String paymentId; final String amount; final String? redirectUrl; const PaymentIntent({required this.paymentId, required this.amount, this.redirectUrl}); }
class NoteEvent { final String toStatus; final String? amountDelta; final String? noteAr; final DateTime at; const NoteEvent({required this.toStatus, this.amountDelta, this.noteAr, required this.at}); }
class PromissoryNote {
  final String id; final String number; final String status; final String amount; final String outstanding; final DateTime? dueDate; final bool overdue; final String? workOrderId; final String? invoiceId; final String? nafezReference; final List<NoteEvent> events; final ({String id, String number, DateTime issuedAt})? settlement;
  const PromissoryNote({required this.id, required this.number, required this.status, required this.amount, required this.outstanding, this.dueDate, this.overdue = false, this.workOrderId, this.invoiceId, this.nafezReference, this.events = const [], this.settlement});
  bool get isOpen => const {'issued', 'partially_settled', 'in_enforcement'}.contains(status);
}
