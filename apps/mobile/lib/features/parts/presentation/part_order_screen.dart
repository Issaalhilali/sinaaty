import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/format/format.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/l10n/labels.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../../workshop/presentation/providers.dart';
import '../domain/parts.dart';
import 'providers.dart';
/// Part order — buyer: pay (prepaid) → wait → confirm receipt; supplier: prepare → shipped → delivered. One primary action by role/state.
class PartOrderScreen extends ConsumerStatefulWidget { final String id; const PartOrderScreen({super.key, required this.id}); @override ConsumerState<PartOrderScreen> createState() => _PartOrderScreenState(); }
class _PartOrderScreenState extends ConsumerState<PartOrderScreen> {
  bool _busy = false;
  void _refresh() { ref.invalidate(partOrderProvider(widget.id)); ref.invalidate(myPartOrdersProvider); ref.invalidate(supplierOrdersProvider); }
  Future<void> _do(Future<dynamic> Function() f) async { setState(() => _busy = true); final r = await f(); if (!mounted) return; setState(() => _busy = false); (r as dynamic).when(ok: (_) => _refresh(), err: (f) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text((f as dynamic).message(Localizations.localeOf(context).languageCode) as String)))); }
  @override Widget build(BuildContext context) {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode; final t = Theme.of(context).textTheme; final v = ref.watch(partOrderProvider(widget.id)); final org = ref.watch(currentOrgIdProvider); final o = v.value?.valueOrNull; final repo = ref.read(partsRepositoryProvider);
    final supplier = o != null && o.supplierOrgId == org; final buyer = o != null && !supplier;
    Widget? primary;
    if (o != null) {
      if (supplier) { primary = switch (o.status) { 'paid' => PrimaryButton(label: l.spPreparing, loading: _busy, onPressed: () => _do(() => repo.transition(o.id, 'preparing'))), 'preparing' => PrimaryButton(label: l.spShip, icon: Icons.local_shipping_outlined, loading: _busy, onPressed: () => _do(() => repo.transition(o.id, 'shipped'))), 'shipped' => PrimaryButton(label: l.spDeliver, icon: Icons.check, loading: _busy, onPressed: () => _do(() => repo.transition(o.id, 'delivered'))), _ => null }; }
      else if (buyer) { primary = switch (o.status) { 'pending_payment' when o.invoiceId != null => PrimaryButton(label: l.payNow, icon: Icons.lock_outline, onPressed: () => context.push('/invoices/${o.invoiceId}')), 'delivered' || 'installed' => PrimaryButton(label: l.confirmReceipt, icon: Icons.check_circle_outline, loading: _busy, onPressed: () => _do(() => repo.confirm(o.id))), _ => null }; }
    }
    return AppScaffold(title: o?.number ?? l.ptMyOrders, primaryAction: primary, body: AsyncResultView<PartOrder>(value: v, onRetry: _refresh, builder: (o) => ListView(padding: const EdgeInsets.fromLTRB(SinaatySpace.lg, SinaatySpace.sm, SinaatySpace.lg, 96), children: [
      SealCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(o.items.firstOrNull?.descriptionAr ?? o.number, style: t.titleLarge?.copyWith(color: Colors.white), maxLines: 2), Text('${o.number} · ${Fmt.dateTime(o.createdAt, locale: locale)}', style: t.bodySmall?.copyWith(color: Colors.white.withValues(alpha: .75)))])), SealPill(Labels.partOrderStatus(l, o.status))]), const SizedBox(height: SinaatySpace.md), MoneyText(Fmt.money(o.total, locale: locale), hero: true, style: t.headlineMedium?.copyWith(color: Colors.white)), const SizedBox(height: SinaatySpace.sm), Wrap(spacing: 8, runSpacing: 6, children: [SealPill(o.paymentTerms == 'deferred' ? l.securedByNote : l.amountHeld, icon: o.paymentTerms == 'deferred' ? Icons.verified_outlined : Icons.lock_outline), SealPill(o.source == 'reverse_auction' ? l.ptOpenAuction : l.ptBuyNow)])])),
      const SizedBox(height: SinaatySpace.xl), SectionTitle(l.items),
      SectionCard(child: Column(children: [for (final i in o.items) Padding(padding: const EdgeInsets.symmetric(vertical: 6), child: Row(children: [Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(i.descriptionAr, style: t.titleSmall), Text('${Labels.condition(l, i.condition)} · ${i.quantity} × ${Fmt.money(i.unitPrice, locale: locale)}${i.warrantyDays > 0 ? ' · ${l.warrantyDays(i.warrantyDays)}' : ''}', style: t.bodySmall?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant))])), Text(Fmt.money(i.lineTotal, locale: locale))])), const Padding(padding: EdgeInsets.symmetric(vertical: 6), child: Divider()), Padding(padding: const EdgeInsets.only(top: 6), child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text(l.total, style: t.titleMedium), MoneyText(Fmt.money(o.total, locale: locale))]))])),
      const SizedBox(height: SinaatySpace.xl), SectionTitle(l.timeline),
      SectionCard(child: StatusTimeline(steps: [for (final (i, st) in ['paid', 'preparing', 'shipped', 'delivered', 'confirmed'].indexed) TimelineStep(title: Labels.partOrderStatus(l, st), done: i < _idx(o.status), current: i == _idx(o.status))])),
    ])));
  }
  static int _idx(String s) => switch (s) { 'pending_payment' => -1, 'paid' => 0, 'preparing' => 1, 'shipped' => 2, 'delivered' || 'installed' => 3, 'confirmed' => 4, _ => 5 };
}
