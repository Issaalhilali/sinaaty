import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/format/format.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/l10n/labels.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../domain/workshop.dart';
import 'providers.dart';
/// Org wallet: available (hero) · held until customers confirm · in transit · payouts list. No charts (charter #6).
class OrgWalletScreen extends ConsumerWidget {
  const OrgWalletScreen({super.key});
  @override Widget build(BuildContext context, WidgetRef ref) {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode; final w = ref.watch(orgWalletProvider); final t = Theme.of(context).textTheme;
    return AsyncResultView<OrgWallet>(value: w, onRetry: () => ref.invalidate(orgWalletProvider), builder: (wl) => RefreshIndicator(onRefresh: () async => ref.invalidate(orgWalletProvider), child: ListView(padding: EdgeInsets.fromLTRB(SinaatySpace.lg, SinaatySpace.sm, SinaatySpace.lg, SinaatySpace.bottomClearance(context)), children: [
      SealCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(l.wsWalletAvailable, style: t.titleMedium?.copyWith(color: Colors.white)), const SizedBox(height: 4), MoneyText(Fmt.money(wl.available, locale: locale), hero: true, style: t.headlineMedium?.copyWith(color: Colors.white)), const SizedBox(height: SinaatySpace.md), Row(children: [Expanded(child: // المحجوز قيدٌ دائن في دفتر الخادم فيصل سالباً — وللورشة هو مبلغٌ موجود لا دَين:
          // «35,410.00-» على الشاشة كان يقرأ خصماً (جولة الجهاز ٢٩ أغسطس)
          _Mini(label: l.wsWalletHeld, value: Fmt.money(wl.held.replaceFirst('-', ''), locale: locale))), const SizedBox(width: 12), Expanded(child: _Mini(label: l.wsWalletTransit, value: Fmt.money(wl.inTransit, locale: locale)))])])),
      const SizedBox(height: SinaatySpace.md), SectionTitle(l.wsPayouts),
      if (wl.payouts.isEmpty) Text(l.wsNoPayouts, style: t.bodyMedium?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant)) else SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm), child: Column(children: [for (final p in wl.payouts) AppListRow(icon: Icons.account_balance_outlined, title: Fmt.money(p.amount, locale: locale), subtitle: Fmt.date(p.scheduledFor, locale: locale), trailing: StatusBadge(Labels.payoutStatus(l, p.status), tone: p.status == 'paid' ? BadgeTone.seal : BadgeTone.plain))])),
    ])));
  }
}
class _Mini extends StatelessWidget { final String label; final String value; const _Mini({required this.label, required this.value}); @override Widget build(BuildContext context) => Container(padding: const EdgeInsets.all(10), decoration: BoxDecoration(color: Colors.white.withValues(alpha: .12), borderRadius: BorderRadius.circular(14)), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(label, style: TextStyle(fontSize: 11.5, color: Colors.white.withValues(alpha: .8))), Text(value, style: const TextStyle(fontWeight: FontWeight.w700, color: Colors.white))])); }
