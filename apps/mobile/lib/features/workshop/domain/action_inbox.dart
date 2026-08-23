/// «ما يحتاجك الآن» — سطر واحد يجمع ما ينتظر الورشة من كل أنظمة المنصة.
///
/// **لماذا:** المنصة صارت سبعة أنظمة (أوامر، سوق إصلاح، قطع، نزاعات، فواتير، سندات، سطحات)، وكلٌّ
/// في تبويبه. وصاحب الورشة لا يفكّر بالأنظمة — يفكّر بسؤال واحد يفتح التطبيق من أجله:
/// **«ماذا ينتظرني؟»**. هذا الملف يجيبه: مصادر متفرقة ⟵ قائمة واحدة مرتّبة بالإلحاح.
///
/// **الترتيب قاعدة عمل لا ذوق**: المال المعرّض للخطر أولاً (نزاع مجمَّد، سيارة جاهزة تتحول مهجورة)،
/// ثم عميل ينتظر ردّاً (اعتماد، تسليم)، ثم فرصة قد تفوت (طلب إصلاح قريب، مزايدة قطعة). فرصةٌ فائتة
/// تُكلّف عملاً واحداً، وسيارةٌ منسيّة تُكلّف علاقةً ومالاً.
library;

enum InboxKind { dispute, abandonedRisk, awaitingApproval, readyToDeliver, needsCheckout, serviceRequest, partBid, unpaid }

class InboxItem {
  final InboxKind kind;
  final int count;
  /// المسار الذي يفتحه الصف — الصندوق يوصل، ولا يفعل شيئاً بالنيابة عن أحد.
  final String route;
  const InboxItem(this.kind, this.count, this.route);
}

/// حالات أمر العمل التي تعني «العميل ينتظرك».
const _awaitingApproval = 'awaiting_approval';
const _ready = 'ready';
const _delivered = 'delivered';

/// يبني الصندوق من المعطيات المتاحة أصلاً في الشاشات — بلا نداء إضافي واحد.
///
/// [orderStatuses] حالات أوامر المنشأة، و[readyDaysWaiting] عدد الأيام لكل أمر جاهز لم يُسلَّم
/// (سيارة تجاوزت [abandonRiskDays] تقترب من الهجر: إنذارات ورسوم حفظ ومسار قانوني كامل).
List<InboxItem> buildInbox({
  required List<String> orderStatuses,
  required List<int> readyDaysWaiting,
  required int openDisputes,
  required int nearbyServiceRequests,
  required int incomingPartRequests,
  required int deliveredUninvoiced,
  int abandonRiskDays = 10,
}) {
  int count(String s) => orderStatuses.where((x) => x == s).length;
  final atRisk = readyDaysWaiting.where((d) => d >= abandonRiskDays).length;

  final items = <InboxItem>[
    if (openDisputes > 0) InboxItem(InboxKind.dispute, openDisputes, '/disputes'),
    if (atRisk > 0) InboxItem(InboxKind.abandonedRisk, atRisk, '/ws/orders'),
    if (count(_awaitingApproval) > 0) InboxItem(InboxKind.awaitingApproval, count(_awaitingApproval), '/ws/orders'),
    if (count(_ready) > 0) InboxItem(InboxKind.readyToDeliver, count(_ready), '/ws/orders'),
    if (deliveredUninvoiced > 0) InboxItem(InboxKind.unpaid, deliveredUninvoiced, '/ws/orders'),
    if (nearbyServiceRequests > 0) InboxItem(InboxKind.serviceRequest, nearbyServiceRequests, '/ws/service-requests'),
    if (incomingPartRequests > 0) InboxItem(InboxKind.partBid, incomingPartRequests, '/ws/orders'),
  ];
  return items;
}

/// عدد ما ينتظر فعلاً — للشارة على التبويب، وللقرار: صندوق فارغ لا يُعرض إطلاقاً.
int inboxTotal(List<InboxItem> items) => items.fold(0, (a, i) => a + i.count);

/// هل فيه ما يمسّ المال أو الالتزام القانوني؟ يُلوّن البطاقة تحذيراً بدل هدوء.
bool inboxHasUrgent(List<InboxItem> items) =>
    items.any((i) => i.kind == InboxKind.dispute || i.kind == InboxKind.abandonedRisk);

/// حالة الأمر التي لا تنتظر أحداً — تُستثنى من العدّ كي لا يمتلئ الصندوق بما لا يُفعل.
bool isSettled(String status) => status == 'closed' || status == 'cancelled' || status == _delivered;
