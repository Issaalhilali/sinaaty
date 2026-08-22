/// The voice assistant's brain: a spoken sentence becomes one concrete destination in the app.
///
/// Pure and deterministic — keyword rules over normalized Arabic, no model and no network, so the
/// same sentence always does the same thing and the whole table is unit-testable. The assistant
/// NEVER executes money or legal actions (pay, approve, declare); it takes the user to the right
/// screen instantly — the action itself stays behind its own explicit tap (charter §5.0).
library;

/// Where a command lands. Tab targets are resolved to an index by the shell (tabs shift with
/// feature flags); route targets push a standalone screen.
enum AssistantTarget { tow, serviceRequest, partRequest, wallet, vehicles, account, notifications, warranties, newOrder, ordersTab, nearbyRequests, partsTab, today }

class AssistantCommand {
  final AssistantTarget target;
  final String labelAr;
  final String said;
  const AssistantCommand({required this.target, required this.labelAr, required this.said});
}

String _normalize(String s) => s
    .replaceAll(RegExp('[ً-ْـ]'), '') // tashkeel + tatweel
    .replaceAll(RegExp('[أإآ]'), 'ا')
    .replaceAll('ة', 'ه')
    .replaceAll('ى', 'ي')
    .toLowerCase();

class _Rule {
  final AssistantTarget target;
  final String labelAr;
  final List<String> keys;
  const _Rule(this.target, this.labelAr, this.keys);
}

// Specific before generic: «قطع غيار» must win before a generic «سياره» rule ever could.
const _customer = <_Rule>[
  _Rule(AssistantTarget.tow, 'طلب سطحة', ['سطحه', 'ونش', 'اسحب']),
  _Rule(AssistantTarget.partRequest, 'طلب قطعة غيار', ['قطعه', 'قطع غيار', 'قطع']),
  _Rule(AssistantTarget.serviceRequest, 'طلب إصلاح', ['اصلح', 'اصلاح', 'صيانه', 'عطل', 'مشكله', 'صوت غريب', 'تصليح']),
  _Rule(AssistantTarget.warranties, 'الضمانات', ['ضمان', 'الضمانات']),
  _Rule(AssistantTarget.notifications, 'الإشعارات', ['اشعارات', 'الاشعارات', 'التنبيهات']),
  _Rule(AssistantTarget.wallet, 'المحفظة', ['محفظ', 'فواتير', 'فاتور', 'مدفوعات', 'سندات']),
  _Rule(AssistantTarget.vehicles, 'سياراتي', ['سياراتي', 'سيارتي', 'مركباتي']),
  _Rule(AssistantTarget.account, 'حسابي', ['حسابي', 'الحساب']),
];

const _partner = <_Rule>[
  _Rule(AssistantTarget.newOrder, 'أمر عمل جديد', ['امر جديد', 'افتح امر', 'عميل جديد', 'استقبال سياره']),
  _Rule(AssistantTarget.nearbyRequests, 'الطلبات القريبة', ['طلبات قريبه', 'الطلبات القريبه', 'طلبات الاصلاح']),
  _Rule(AssistantTarget.partsTab, 'القطع', ['قطعه', 'قطع غيار', 'قطع', 'مخزون']),
  _Rule(AssistantTarget.ordersTab, 'الأوامر', ['الاوامر', 'اوامر', 'الطلبات']),
  _Rule(AssistantTarget.wallet, 'المحفظة', ['محفظ', 'فواتير', 'مدفوعات', 'تحويلات']),
  _Rule(AssistantTarget.notifications, 'الإشعارات', ['اشعارات', 'الاشعارات']),
  _Rule(AssistantTarget.today, 'اليوم', ['اليوم', 'الرئيسيه']),
];

/// Parses a spoken sentence into a command, or null when nothing matched (the caller shows
/// examples — never a dead end).
AssistantCommand? parseAssistant(String said, {required bool partner}) {
  final n = _normalize(said);
  if (n.trim().isEmpty) return null;
  for (final r in partner ? _partner : _customer) {
    if (r.keys.any(n.contains)) return AssistantCommand(target: r.target, labelAr: r.labelAr, said: said.trim());
  }
  return null;
}
