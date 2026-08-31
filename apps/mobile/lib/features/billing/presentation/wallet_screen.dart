import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/config/app_config.dart';
import '../../../core/di/core_providers.dart';
import '../../../core/flags/feature_flags.dart';
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
    final warrantiesOn = (ref.watch(featureFlagsProvider(null)).value ?? FeatureFlags.allVisible).enabled(Flags.warrantyWallet);
    final isFleet = ref.watch(appConfigProvider).flavor == AppFlavor.fleet;
    Future<void> refresh() async { ref.invalidate(invoicesProvider); ref.invalidate(notesProvider); }
    return AsyncResultView<List<Invoice>>(value: inv, onRetry: refresh, builder: (list) {
      final ns = notes.value?.valueOrNull ?? const <PromissoryNote>[]; final due = list.where((i) => i.payable).toList(); final rest = list.where((i) => !i.payable).toList();
      if (list.isEmpty && ns.isEmpty) return EmptyState(icon: Icons.account_balance_wallet_outlined, title: l.walletEmptyTitle, body: l.walletEmptyBody, actionLabel: warrantiesOn ? l.ptWarranties : null, onAction: warrantiesOn ? () => context.push('/warranties') : null);
      Widget invRow(Invoice i) => AppListRow(icon: Icons.receipt_long_outlined, title: i.sellerNameAr.isEmpty ? l.invoiceNumber(i.number) : i.sellerNameAr, subtitle: Fmt.meta([i.number, if (i.dueDate != null && i.payable) l.dueOn(Fmt.date(i.dueDate!, locale: locale))]), trailing: Column(crossAxisAlignment: CrossAxisAlignment.end, mainAxisSize: MainAxisSize.min, children: [Text(Fmt.money(i.payable ? i.remaining : i.total, locale: locale), style: const TextStyle(fontWeight: FontWeight.w600)), StatusBadge(Labels.invoiceStatus(l, i.status), tone: i.isPaid ? BadgeTone.seal : i.payable ? BadgeTone.brass : BadgeTone.plain)]), onTap: () => context.push('/invoices/${i.id}'));
      final dueTotal = due.fold<double>(0, (a, i) => a + (double.tryParse(i.remaining) ?? 0)); final openNotes = ns.where((n) => n.isOpen).length;
      return RefreshIndicator(onRefresh: refresh, child: ListView(padding: EdgeInsets.fromLTRB(SinaatySpace.lg, SinaatySpace.sm, SinaatySpace.lg, SinaatySpace.bottomClearance(context)), children: [
        if (due.isNotEmpty) ...[SealCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(l.due, style: Theme.of(context).textTheme.titleLarge?.copyWith(color: Colors.white)), Text('${due.length} ${l.invoices}${openNotes > 0 ? ' · $openNotes ${l.notes}' : ''}', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.white.withValues(alpha: .75)))])), Flexible(child: SealPill(l.amountHeld, icon: Icons.lock_outline))]),
          const SizedBox(height: SinaatySpace.md), MoneyText(Fmt.money(dueTotal.toStringAsFixed(2), locale: locale), hero: true, style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: Colors.white)),
          const SizedBox(height: SinaatySpace.lg), SealButton(label: l.payNow, onPressed: () => context.push('/invoices/${due.first.id}')),
        ])), const SizedBox(height: SinaatySpace.md), SectionTitle(l.due), SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm), child: RowGroup(children: [for (final i in due) invRow(i)])), const SizedBox(height: SinaatySpace.lg)],
        if (ns.isNotEmpty) ...[SectionTitle(l.notes), SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm), child: RowGroup(children: [for (final n in ns) AppListRow(icon: Icons.verified_outlined, title: l.noteNumber(n.number), subtitle: n.dueDate != null && n.isOpen ? l.dueOn(Fmt.date(n.dueDate!, locale: locale)) : Labels.noteStatus(l, n.status), trailing: Column(crossAxisAlignment: CrossAxisAlignment.end, mainAxisSize: MainAxisSize.min, children: [Text(Fmt.money(n.isOpen ? n.outstanding : n.amount, locale: locale), style: const TextStyle(fontWeight: FontWeight.w600)), StatusBadge(n.overdue ? l.overdue : Labels.noteStatus(l, n.status), tone: n.overdue ? BadgeTone.bad : n.isOpen ? BadgeTone.brass : BadgeTone.seal)]), onTap: () => context.push('/notes/${n.id}'))])), const SizedBox(height: SinaatySpace.lg)],
        if (isFleet) ...[
          SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm), child: AppListRow(icon: Icons.receipt_long_outlined, title: l.flStatements, subtitle: l.flStatementsBody, trailing: const Icon(Icons.chevron_left), onTap: () => context.push('/fleet/statements'))),
          const SizedBox(height: SinaatySpace.lg),
        ],
        if (warrantiesOn) ...[
          SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm), child: AppListRow(icon: Icons.verified_outlined, title: l.ptWarranties, subtitle: l.ptWarrantiesEmptyBody, trailing: const Icon(Icons.chevron_left), onTap: () => context.push('/warranties'))),
          const SizedBox(height: SinaatySpace.lg),
        ],
        if (rest.isNotEmpty) ...[SectionTitle(l.invoices), SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm), child: RowGroup(children: [for (final i in rest) invRow(i)]))],
      ]));
    });
  }
}
