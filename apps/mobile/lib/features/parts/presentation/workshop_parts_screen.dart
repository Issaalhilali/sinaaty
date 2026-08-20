import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/format/format.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/l10n/labels.dart';
import '../../../core/result/result.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../../workshop/presentation/providers.dart';
import '../domain/parts.dart';
import 'providers.dart';
import 'qr_install_flow.dart';
/// Workshop «القطع»: VIN search → live offers (trade price when account is active) → Buy Now sheet; or open a reverse auction.
/// Also: trade-account balance (SealCard), my auctions, my part orders, QR install scan.
class WorkshopPartsScreen extends ConsumerStatefulWidget { const WorkshopPartsScreen({super.key}); @override ConsumerState<WorkshopPartsScreen> createState() => _WorkshopPartsScreenState(); }
class _WorkshopPartsScreenState extends ConsumerState<WorkshopPartsScreen> {
  final _vin = TextEditingController(); AsyncValue<Result<FitResult>>? _fit; String? _lastVin;
  Future<void> _search() async { final vin = _vin.text.trim().toUpperCase(); if (vin.length != 17) return; setState(() { _fit = const AsyncValue.loading(); _lastVin = vin; }); final r = await ref.read(partsRepositoryProvider).fit(vin: vin, buyerOrgId: ref.read(currentOrgIdProvider)); if (mounted) setState(() => _fit = AsyncValue.data(r)); }
  Future<void> _buy(PartOffer o) async {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode; var qty = 1; var terms = o.tradeAccountId != null ? 'deferred' : 'prepaid';
    final ok = await showModalBottomSheet<bool>(context: context, showDragHandle: true, isScrollControlled: true, builder: (ctx) => StatefulBuilder(builder: (ctx, setS) => Padding(padding: const EdgeInsets.fromLTRB(SinaatySpace.lg, 0, SinaatySpace.lg, SinaatySpace.xl), child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Text(o.titleAr, style: Theme.of(ctx).textTheme.titleLarge), Text(Fmt.meta([o.supplierNameAr, o.partNumber, Labels.condition(l, o.condition)]), style: TextStyle(color: Theme.of(ctx).colorScheme.onSurfaceVariant)), const SizedBox(height: SinaatySpace.md),
      Row(children: [Text(l.ptQty, style: Theme.of(ctx).textTheme.titleSmall), const Spacer(), IconButton(onPressed: qty > 1 ? () => setS(() => qty--) : null, icon: const Icon(Icons.remove_circle_outline)), Text('$qty', style: Theme.of(ctx).textTheme.titleLarge), IconButton(onPressed: qty < o.quantity ? () => setS(() => qty++) : null, icon: const Icon(Icons.add_circle_outline))]),
      const SizedBox(height: SinaatySpace.sm),
      if (o.tradeAccountId != null) RadioGroup<String>(groupValue: terms, onChanged: (v) => setS(() => terms = v!), child: Column(children: [RadioListTile<String>(value: 'deferred', title: Text(l.ptTermsDeferred), contentPadding: EdgeInsets.zero), RadioListTile<String>(value: 'prepaid', title: Text(l.ptTermsPrepaid), contentPadding: EdgeInsets.zero)])) else Text(l.ptTermsPrepaid, style: TextStyle(color: Theme.of(ctx).colorScheme.onSurfaceVariant)),
      const SizedBox(height: SinaatySpace.lg),
      PrimaryButton(label: '${l.ptBuyNow} · ${Fmt.money(((double.tryParse((terms == 'deferred' ? o.tradePrice : o.price) ?? o.bestPrice ?? '0') ?? 0) * qty * 1.15).toStringAsFixed(2), locale: locale)}', icon: Icons.shopping_bag_outlined, onPressed: () => Navigator.pop(ctx, true)),
    ]))));
    if (ok != true || !mounted) return;
    final r = await ref.read(partsRepositoryProvider).buyNow(orgId: ref.read(currentOrgIdProvider), paymentTerms: terms, items: [(inventoryId: o.inventoryId, quantity: qty)]); if (!mounted) return;
    r.when(ok: (order) { ref.invalidate(myPartOrdersProvider); ref.invalidate(buyerTradeAccountsProvider); ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('${l.ptOrderPlaced} · ${order.number}'))); context.push('/parts/orders/${order.id}'); }, err: (f) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(f.message(locale)))));
  }
  Future<void> _auction() async {
    final l = L10n.of(context); final name = TextEditingController(); final conds = {'oem_new', 'aftermarket_new', 'used_scrapyard'}; var minutes = 60;
    final ok = await showModalBottomSheet<bool>(context: context, showDragHandle: true, isScrollControlled: true, builder: (ctx) => StatefulBuilder(builder: (ctx, setS) => Padding(padding: EdgeInsets.fromLTRB(SinaatySpace.lg, 0, SinaatySpace.lg, MediaQuery.viewInsetsOf(ctx).bottom + SinaatySpace.xl), child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Text(l.ptOpenAuction, style: Theme.of(ctx).textTheme.titleLarge), const SizedBox(height: SinaatySpace.md),
      TextField(controller: name, autofocus: true, decoration: InputDecoration(labelText: l.ptPartName, hintText: l.ptPartNameHint)), const SizedBox(height: SinaatySpace.md),
      Text(l.ptAcceptedConditions, style: Theme.of(ctx).textTheme.titleSmall), const SizedBox(height: 6),
      Wrap(spacing: 8, children: [for (final c in ['oem_new', 'aftermarket_new', 'used_scrapyard', 'refurbished']) FilterChip(label: Text(Labels.condition(l, c)), selected: conds.contains(c), onSelected: (s) => setS(() => s ? conds.add(c) : conds.remove(c)), showCheckmark: false)]),
      const SizedBox(height: SinaatySpace.md), Row(children: [Text(l.ptBiddingMinutes, style: Theme.of(ctx).textTheme.titleSmall), const Spacer(), SegmentedButton<int>(segments: const [ButtonSegment(value: 30, label: Text('30')), ButtonSegment(value: 60, label: Text('60')), ButtonSegment(value: 240, label: Text('240'))], selected: {minutes}, onSelectionChanged: (s) => setS(() => minutes = s.first), showSelectedIcon: false)]),
      const SizedBox(height: SinaatySpace.lg), PrimaryButton(label: l.ptSend, icon: Icons.gavel_outlined, onPressed: () { if (name.text.trim().length < 2 || conds.isEmpty) return; Navigator.pop(ctx, true); }),
    ]))));
    if (ok != true || !mounted) return;
    final r = await ref.read(partsRepositoryProvider).createRequest(orgId: ref.read(currentOrgIdProvider), vin: _lastVin, partNameAr: name.text.trim(), acceptedConditions: conds.toList(), biddingMinutes: minutes); if (!mounted) return;
    r.when(ok: (req) { ref.invalidate(myPartRequestsProvider); context.push('/parts/requests/${req.id}'); }, err: (f) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(f.message(Localizations.localeOf(context).languageCode)))));
  }
  @override Widget build(BuildContext context) {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode; final t = Theme.of(context).textTheme; final s = Theme.of(context).colorScheme;
    final tas = ref.watch(buyerTradeAccountsProvider).value?.valueOrNull ?? const <TradeAccount>[]; final active = tas.where((a) => a.status == 'active').toList(); final reqs = ref.watch(myPartRequestsProvider).value?.valueOrNull ?? const <PartRequest>[]; final orders = ref.watch(myPartOrdersProvider).value?.valueOrNull ?? const <PartOrder>[];
    return RefreshIndicator(onRefresh: () async { ref.invalidate(buyerTradeAccountsProvider); ref.invalidate(myPartRequestsProvider); ref.invalidate(myPartOrdersProvider); }, child: ListView(padding: const EdgeInsets.fromLTRB(SinaatySpace.lg, SinaatySpace.sm, SinaatySpace.lg, 110), children: [
      if (active.isNotEmpty) Padding(padding: const EdgeInsets.only(bottom: SinaatySpace.md), child: SealCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Row(children: [Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(l.ptTradeAccount, style: t.titleLarge?.copyWith(color: Colors.white)), Text(active.map((a) => a.counterpartyAr ?? '').where((x) => x.isNotEmpty).join(' · '), style: t.bodySmall?.copyWith(color: Colors.white.withValues(alpha: .75)), maxLines: 1, overflow: TextOverflow.ellipsis)])), SealPill(l.securedByNote, icon: Icons.verified_outlined)]), const SizedBox(height: SinaatySpace.md), Text(l.ptTradeAvailable, style: t.bodySmall?.copyWith(color: Colors.white.withValues(alpha: .8))), MoneyText(Fmt.money(active.fold<double>(0, (a, x) => a + (double.tryParse(x.available) ?? 0)).toStringAsFixed(2), locale: locale), hero: true, style: t.headlineMedium?.copyWith(color: Colors.white)), const SizedBox(height: SinaatySpace.sm), Text('${l.ptTradeOutstanding} ${Fmt.money(active.fold<double>(0, (a, x) => a + (double.tryParse(x.outstanding) ?? 0)).toStringAsFixed(2), locale: locale)} · ${l.ptTradeLimit} ${Fmt.money(active.fold<double>(0, (a, x) => a + (double.tryParse(x.creditLimit) ?? 0)).toStringAsFixed(2), locale: locale)}', style: t.bodySmall?.copyWith(color: Colors.white.withValues(alpha: .85)))]))),
      SectionTitle(l.ptSearchByVin, trailing: TextButton.icon(onPressed: () => startQrInstall(context, ref), icon: const Icon(Icons.qr_code_scanner, size: 18), label: Text(l.ptScanQr))),
      Row(children: [Expanded(child: TextField(controller: _vin, textDirection: TextDirection.ltr, textCapitalization: TextCapitalization.characters, maxLength: 17, inputFormatters: [FilteringTextInputFormatter.allow(RegExp('[A-Za-z0-9]'))], decoration: InputDecoration(hintText: l.ptVinHint, counterText: '', prefixIcon: const Icon(Icons.search)), onSubmitted: (_) => _search())), const SizedBox(width: SinaatySpace.sm), SizedBox(height: 56, width: 64, child: FilledButton(style: FilledButton.styleFrom(minimumSize: const Size(64, 56), padding: EdgeInsets.zero), onPressed: _search, child: const Icon(Icons.search)))]),
      if (_fit != null) ...[const SizedBox(height: SinaatySpace.md), _fit!.when(loading: () => const InlineLoading(), error: (_, _) => InlineError(message: l.errorGeneric, retryLabel: l.retry, onRetry: _search), data: (r) => r.when(err: (f) => InlineError(message: f.message(locale), retryLabel: l.retry, onRetry: _search), ok: (fit) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [Expanded(child: Text(fit.vehicleLine.isEmpty ? (_lastVin ?? '') : fit.vehicleLine, style: t.titleMedium)), StatusBadge(l.ptBidsCount(fit.offers.length), tone: BadgeTone.seal)]),
        const SizedBox(height: SinaatySpace.sm),
        if (fit.offers.isEmpty) SectionCard(child: Column(children: [Text(l.ptNoOffers, textAlign: TextAlign.center, style: TextStyle(color: s.onSurfaceVariant)), const SizedBox(height: SinaatySpace.md), PrimaryButton(label: l.ptOpenAuction, icon: Icons.gavel_outlined, onPressed: _auction)]))
        else ...[SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm, vertical: SinaatySpace.xs), child: Column(children: [for (final o in fit.offers) _OfferRow(o: o, onBuy: () => _buy(o))])), const SizedBox(height: SinaatySpace.sm), Center(child: TextButton.icon(onPressed: _auction, icon: const Icon(Icons.gavel_outlined, size: 18), label: Text(l.ptOpenAuction)))],
      ])))],
      if (reqs.isNotEmpty) ...[const SizedBox(height: SinaatySpace.lg), SectionTitle(l.ptMyRequests), SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm), child: Column(children: [for (final r in reqs.take(5)) AppListRow(icon: Icons.gavel_outlined, title: r.partNameAr, subtitle: Fmt.meta([r.number, r.open ? l.ptEndsIn(r.remaining.inMinutes.clamp(0, 99999)) : l.ptEnded]), trailing: StatusBadge(r.bidsCount > 0 ? l.ptBidsCount(r.bidsCount) : l.ptNoBidsYet.split(' —').first, tone: r.bidsCount > 0 ? BadgeTone.brass : BadgeTone.plain), onTap: () => context.push('/parts/requests/${r.id}'))]))],
      if (orders.isNotEmpty) ...[const SizedBox(height: SinaatySpace.lg), SectionTitle(l.ptMyOrders), SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm), child: Column(children: [for (final o in orders.take(6)) AppListRow(icon: Icons.inventory_2_outlined, title: o.items.firstOrNull?.descriptionAr ?? o.number, subtitle: Fmt.meta([if (o.items.firstOrNull?.descriptionAr != null) o.number, Fmt.money(o.total, locale: locale)]), trailing: StatusBadge(Labels.partOrderStatus(l, o.status), tone: o.status == 'delivered' ? BadgeTone.brass : o.isActive ? BadgeTone.seal : BadgeTone.plain), onTap: () => context.push('/parts/orders/${o.id}'))]))],
      if (_fit == null && reqs.isEmpty && orders.isEmpty) Padding(padding: const EdgeInsets.only(top: SinaatySpace.xl), child: EmptyState(icon: Icons.settings_input_component_outlined, title: l.wsPartsSoon, body: l.wsPartsSearchHint)),
    ]));
  }
}
class _OfferRow extends StatelessWidget {
  final PartOffer o; final VoidCallback onBuy; const _OfferRow({required this.o, required this.onBuy});
  @override Widget build(BuildContext context) { final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode; final t = Theme.of(context).textTheme; final s = Theme.of(context).colorScheme;
    return Padding(padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 6), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Container(width: 44, height: 44, decoration: BoxDecoration(color: o.condition == 'oem_new' ? s.secondaryContainer : s.primaryContainer, borderRadius: BorderRadius.circular(14)), child: Center(child: Text(o.brandAr?.substring(0, 1) ?? (o.condition == 'used_scrapyard' ? '♻' : '⚙'), style: TextStyle(fontWeight: FontWeight.w700, color: o.condition == 'oem_new' ? s.onSecondaryContainer : s.onPrimaryContainer)))),
      const SizedBox(width: SinaatySpace.md),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(o.titleAr, style: t.titleSmall, maxLines: 2), Text(Fmt.meta([o.supplierNameAr, o.partNumber, Labels.condition(l, o.condition), if (o.leadTimeHours != null) l.ptLeadHours(o.leadTimeHours!)]), style: t.bodySmall?.copyWith(color: s.onSurfaceVariant)), const SizedBox(height: 4), Wrap(spacing: 6, runSpacing: 4, children: [if (o.isSerialized) StatusBadge(l.ptGenuineQr, tone: BadgeTone.seal, icon: Icons.verified_outlined), if (o.warrantyDays > 0) StatusBadge(l.warrantyDays(o.warrantyDays)), if (o.tradePrice != null) StatusBadge(l.ptTradePrice, tone: BadgeTone.brass)])])),
      const SizedBox(width: SinaatySpace.sm),
      Column(crossAxisAlignment: CrossAxisAlignment.end, children: [MoneyText(Fmt.money(o.bestPrice ?? '0', locale: locale)), if (o.tradePrice != null && o.price != null) Text(Fmt.money(o.price!, locale: locale), style: t.bodySmall?.copyWith(decoration: TextDecoration.lineThrough, color: s.onSurfaceVariant)), const SizedBox(height: 6), SizedBox(height: 36, child: FilledButton.tonal(style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 14), minimumSize: Size.zero), onPressed: onBuy, child: Text(l.ptBuyNow)))]),
    ])); }
}
