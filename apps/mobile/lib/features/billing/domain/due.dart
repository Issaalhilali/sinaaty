/// «مستحقّ عليك» — الرقم الذي يجب ألّا يفاجئ صاحب السيارة.
///
/// **لماذا:** المستحقّات تسكن تبويب «محفظتي»، وشاشة العميل الأولى تعرض سياراته وأوامره فقط. فقد
/// يمرّ سندٌ إلى الإنذار الرسمي ثم إلى **ناجز** والعميل لم يفتح المحفظة منذ أسبوعين. تأخيرٌ من هذا
/// النوع ليس نسياناً محايداً: له مسار قانوني ورسوم. فيُعرض الرقم حيث تقع العين أول مرة.
///
/// **قاعدتا الجمع (وهما المهمّتان):**
/// ١. الفاتورة الآجلة يقابلها سند بنفس المبلغ. جمعُهما معاً يُظهر ضعف ما على العميل فعلاً — فيُحتسب
///    السند، وتُستثنى فاتورته. والفواتير التي لا سند لها تُجمع كما هي.
/// ٢. ما يخصّ أمر إصلاح **ما زال جارياً** لا يدخل هنا: بطاقة الأمر فوقه مباشرة تعرض مبلغه وحالته
///    وزرّه، فتكراره سطراً ثانياً رقمٌ مرتين على شاشة واحدة. حين تُسلَّم السيارة يخرج الأمر من
///    القائمة الجارية ويظهر ما بقي عليه هنا — وهو بالضبط الوقت الذي يصير فيه ديناً بلا سياق.
library;

class DueSummary {
  /// المتبقّي فعلاً بعد استثناء ازدواج الفاتورة/السند.
  final String amount;

  /// تأخّر سدادُ سندٍ واحد على الأقل — الحالة التي تفتح طريق الإنذار والتنفيذ.
  final bool overdue;

  /// عدد ما ينتظر السداد (فواتير + سندات) — «٢ بانتظار السداد».
  final int count;
  const DueSummary({required this.amount, required this.overdue, required this.count});
}

/// يعيد null حين لا شيء مستحق — ولا يُعرض شيء أصلاً (سطرٌ يقول «٠ ر.س» تدريبٌ على تجاهله).
DueSummary? dueSummary({
  required List<({String id, String? workOrderId, String remaining, bool payable})> invoices,
  required List<({String? invoiceId, String? workOrderId, String outstanding, bool overdue, bool isOpen})> notes,
  Set<String> activeWorkOrderIds = const {},
}) {
  bool ongoing(String? woId) => woId != null && activeWorkOrderIds.contains(woId);
  final openNotes = notes.where((n) => n.isOpen && !ongoing(n.workOrderId)).toList();
  final coveredByNote = {for (final n in openNotes) if (n.invoiceId != null) n.invoiceId!};
  final loose = invoices.where((i) => i.payable && !coveredByNote.contains(i.id) && !ongoing(i.workOrderId)).toList();

  var total = 0.0;
  for (final n in openNotes) {
    total += double.tryParse(n.outstanding) ?? 0;
  }
  for (final i in loose) {
    total += double.tryParse(i.remaining) ?? 0;
  }
  final count = openNotes.length + loose.length;
  if (count == 0 || total <= 0) return null;
  return DueSummary(amount: total.toStringAsFixed(2), overdue: openNotes.any((n) => n.overdue), count: count);
}
