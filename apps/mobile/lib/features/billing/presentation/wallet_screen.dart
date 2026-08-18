import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/format/format.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/l10n/labels.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../domain/billing.dart';
import 'providers.dart';
/// Tab «محفظتي»: what's due first, then notes (سندات), then history. No charts on mobile (charter #6).
class WalletScreen extends ConsumerWidget {
  const WalletScreen({super.key});
  @override Widget build(BuildContext context, WidgetRef ref) {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode; final inv = ref.watch(invoicesProvider); final notes = ref.watch(notesProvider);
    Future<void> refresh() async { ref.invalidate(invoicesProvider); ref.invalidate(notesProvider); }
    return AsyncResultView<List<Invoice>>(value: inv, onRetry: refresh, builder: (list) {
      final ns = notes.value?.valueOrNull ?? const <PromissoryNote>[]; final due = list.where((i) => i.payable).toList(); final rest = list.where((i) => !i.payable).toList();
      if (list.isEmpty && ns.isEmpty) return EmptyState(icon: Icons.account_balance_wallet_outlined, title: l.walletEmptyTitle, body: l.walletEmptyBody);
      Widget invRow(Invoice i) => AppListRow(icon: Icons.receipt_long_outlined, title: i.sellerNameAr.isEmpty ? l.invoiceNumber(i.number) : i.sellerNameAr, subtitle: [i.number, if (i.dueDate != null && i.payable) l.dueOn(Fmt.date(i.dueDate!, locale: locale))].join(' · '), trailing: Column(crossAxisAlignment: CrossAxisAlignment.end, mainAxisSize: MainAxisSize.min, children: [Text(Fmt.money(i.payable ? i.remaining : i.total, locale: locale), style: const TextStyle(fontWeight: FontWeight.w600)), StatusBadge(Labels.invoiceStatus(l, i.status), tone: i.isPaid ? BadgeTone.seal : i.payable ? BadgeTone.brass : BadgeTone.plain)]), onTap: () => context.push('/invoices/${i.id}'));
      return RefreshIndicator(onRefresh: refresh, child: ListView(padding: const EdgeInsets.all(SinaatySpace.lg), children: [
        if (due.isNotEmpty) ...[SectionTitle(l.due), SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm), child: Column(children: [for (final i in due) invRow(i)])), const SizedBox(height: SinaatySpace.lg)],
        if (ns.isNotEmpty) ...[SectionTitle(l.notes), SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm), child: Column(children: [for (final n in ns) AppListRow(icon: Icons.verified_outlined, title: l.noteNumber(n.number), subtitle: n.dueDate != null && n.isOpen ? l.dueOn(Fmt.date(n.dueDate!, locale: locale)) : Labels.noteStatus(l, n.status), trailing: Column(crossAxisAlignment: CrossAxisAlignment.end, mainAxisSize: MainAxisSize.min, children: [Text(Fmt.money(n.isOpen ? n.outstanding : n.amount, locale: locale), style: const TextStyle(fontWeight: FontWeight.w600)), StatusBadge(n.overdue ? l.overdue : Labels.noteStatus(l, n.status), tone: n.overdue ? BadgeTone.bad : n.isOpen ? BadgeTone.brass : BadgeTone.seal)]), onTap: () => context.push('/notes/${n.id}'))])), const SizedBox(height: SinaatySpace.lg)],
        if (rest.isNotEmpty) ...[SectionTitle(l.invoices), SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm), child: Column(children: [for (final i in rest) invRow(i)]))],
      ]));
    });
  }
}
