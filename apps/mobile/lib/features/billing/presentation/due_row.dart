import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/format/format.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../../work_orders/presentation/providers.dart';
import '../domain/due.dart';
import 'providers.dart';

/// سطر «مستحقّ عليك» على شاشة العميل الأولى — يفتح المحفظة، ولا يفعل شيئاً بالنيابة عنه.
///
/// سطرٌ واحد لا لوحة: المستحقّ رقمٌ يُقرأ ويُطمئن أو يُنبّه، والسداد له شاشته. ولا يظهر إطلاقاً حين
/// لا شيء مستحق. يُركَّب من مزوّدَي المحفظة نفسيهما — من فتح التطبيق مرة واحدة دفع ثمن نداءَين.
class DueRow extends ConsumerWidget {
  const DueRow({super.key});

  @override Widget build(BuildContext context, WidgetRef ref) {
    final invoices = ref.watch(invoicesProvider).value?.valueOrNull ?? const [];
    final notes = ref.watch(notesProvider).value?.valueOrNull ?? const [];
    // الأوامر الجارية تُعرض ببطاقاتها فوق هذا السطر — فلا يُكرَّر مبلغها هنا.
    final active = <String>{for (final w in ref.watch(workOrdersProvider).value?.valueOrNull ?? const []) if (w.isActive) w.id};
    final due = dueSummary(
      invoices: [for (final i in invoices) (id: i.id, workOrderId: i.workOrderId, remaining: i.remaining, payable: i.payable)],
      notes: [for (final n in notes) (invoiceId: n.invoiceId, workOrderId: n.workOrderId, outstanding: n.outstanding, overdue: n.overdue, isOpen: n.isOpen)],
      activeWorkOrderIds: active,
    );
    if (due == null) return const SizedBox.shrink();

    final l = L10n.of(context); final t = Theme.of(context).textTheme; final scheme = Theme.of(context).colorScheme;
    final locale = Localizations.localeOf(context).languageCode;
    final tone = due.overdue ? scheme.error : SinaatyColors.brass;
    return Padding(
      padding: const EdgeInsets.only(bottom: SinaatySpace.md),
      child: SectionCard(
        onTap: () => context.go('/wallet'),
        child: Row(children: [
          Icon(due.overdue ? Icons.gavel_outlined : Icons.account_balance_wallet_outlined, size: 20, color: tone),
          const SizedBox(width: SinaatySpace.md),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(l.dueOnYou, style: t.titleSmall),
            const SizedBox(height: 2),
            // الجملة الوحيدة المسموحة تحت أثر قانوني: ما الذي يحدث إن تأخّر، بلا مصطلحات.
            Text(due.overdue ? l.dueOverdueHint : l.dueCount(due.count), style: t.bodySmall?.copyWith(color: due.overdue ? tone : scheme.onSurfaceVariant)),
          ])),
          const SizedBox(width: SinaatySpace.sm),
          MoneyText(Fmt.money(due.amount, locale: locale)),
        ]),
      ),
    );
  }
}
