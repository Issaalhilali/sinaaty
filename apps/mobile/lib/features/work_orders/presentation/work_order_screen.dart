import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/format/format.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/l10n/labels.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../../billing/presentation/providers.dart';
import '../domain/work_order.dart';
import 'providers.dart';
/// Repair order for the customer: status + live timeline, items/total, photos, and ONE primary action
/// (approve → pay → confirm receipt) depending on where the order is.
class WorkOrderScreen extends ConsumerWidget {
  final String id; const WorkOrderScreen({super.key, required this.id});
  @override Widget build(BuildContext context, WidgetRef ref) {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode;
    ref.watch(workOrderLiveProvider(id)); final wo = ref.watch(workOrderProvider(id)); final tl = ref.watch(workOrderTimelineProvider(id)); final invoices = ref.watch(invoicesProvider);
    void refresh() { ref.invalidate(workOrderProvider(id)); ref.invalidate(workOrderTimelineProvider(id)); ref.invalidate(invoicesProvider); }
    final order = wo.value?.valueOrNull; final invoice = invoices.value?.valueOrNull?.where((i) => i.workOrderId == id && i.status != 'void').firstOrNull;
    Widget? primary;
    if (order != null) {
      if (order.awaitingApproval) { primary = PrimaryButton(label: l.approveNow, onPressed: () => context.push('/work-orders/$id/approve')); }
      else if (invoice != null && invoice.payable) { primary = PrimaryButton(label: l.payAmount(Fmt.money(invoice.remaining, locale: locale)), onPressed: () => context.push('/invoices/${invoice.id}')); }
      else if (order.status == 'delivered' && invoice != null && invoice.isPaid) { primary = PrimaryButton(label: l.confirmReceipt, onPressed: () => _confirm(context, ref)); }
    }
    return AppScaffold(title: order?.number == null ? l.workOrder : l.workOrderNumber(order!.number), primaryAction: primary,
      body: AsyncResultView<WorkOrder>(value: wo, onRetry: refresh, builder: (o) => RefreshIndicator(onRefresh: () async => refresh(), child: ListView(padding: const EdgeInsets.fromLTRB(SinaatySpace.lg, SinaatySpace.md, SinaatySpace.lg, 96), children: [
        SealCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(o.titleAr ?? l.workOrder, style: Theme.of(context).textTheme.titleLarge?.copyWith(color: Colors.white)), Text(o.number, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.white.withValues(alpha: .75)))])), const SizedBox(width: 8), SealPill(Labels.woStatus(l, o.status))]),
          const SizedBox(height: SinaatySpace.md), MoneyText(Fmt.money(o.total, locale: locale), hero: true, style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: Colors.white)),
          const SizedBox(height: SinaatySpace.md), Wrap(spacing: 8, runSpacing: 6, children: [SealPill(Labels.terms(l, o.paymentTerms), icon: Icons.payments_outlined), if (o.paymentTerms == 'deferred') SealPill(l.securedByNote, icon: Icons.verified_outlined), if (tl.value?.valueOrNull?.versions.any((v) => v.signed) ?? false) SealPill(l.signedByNafath, icon: Icons.verified_user_outlined)]),
        ])),
        const SizedBox(height: SinaatySpace.xl), SectionTitle(l.timeline),
        SectionCard(child: _Timeline(order: o, timeline: tl.value?.valueOrNull, locale: locale)),
        const SizedBox(height: SinaatySpace.xl), SectionTitle(l.items),
        SectionCard(child: Column(children: [
          for (final i in o.items) Padding(padding: const EdgeInsets.symmetric(vertical: 7), child: Row(children: [Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(i.descriptionAr, style: Theme.of(context).textTheme.titleSmall), Text('${i.quantity} × ${Fmt.money(i.unitPrice, locale: locale)}${i.warrantyDays > 0 ? ' · ${l.warrantyDays(i.warrantyDays)}' : ''}', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant))])), Text(Fmt.money(i.lineTotal, locale: locale))])),
          const Padding(padding: EdgeInsets.symmetric(vertical: 6), child: Divider()), KeyValueRow(l.vat, Fmt.money(o.vatAmount, locale: locale)), Padding(padding: const EdgeInsets.only(top: 6), child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text(l.total, style: Theme.of(context).textTheme.titleMedium), MoneyText(Fmt.money(o.total, locale: locale))])),
        ])),
        if ((tl.value?.valueOrNull?.media.isNotEmpty ?? false) || (tl.value?.valueOrNull?.inspections.isNotEmpty ?? false)) ...[
          if ((tl.value?.valueOrNull?.inspections ?? []).any((i) => i.type == 'check_in')) ...[
            const SizedBox(height: SinaatySpace.lg),
            SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm), child: AppListRow(icon: Icons.compare_outlined, title: l.diffOpen, subtitle: l.diffSub, trailing: const Icon(Icons.chevron_left), onTap: () => context.push('/work-orders/$id/condition'))),
          ],
          const SizedBox(height: SinaatySpace.xl), SectionTitle(l.photos),
          SectionCard(child: Column(children: [
            for (final ins in tl.value!.valueOrNull!.inspections) AppListRow(icon: ins.type == 'check_in' ? Icons.login : Icons.logout, title: ins.type == 'check_in' ? l.checkIn : l.checkOut, subtitle: [Fmt.dateTime(ins.performedAt, locale: locale), if (ins.odometerKm != null) '${ins.odometerKm} ${l.km}', l.damages(ins.damagesCount)].join(' · '), trailing: StatusBadge(l.photosCount(ins.mediaIds.length))),
            _PhotoStrip(count: tl.value!.valueOrNull!.media.length),
          ])),
        ],
        if (invoice != null) ...[const SizedBox(height: SinaatySpace.lg), SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm), child: AppListRow(icon: Icons.receipt_long_outlined, title: l.invoiceNumber(invoice.number), subtitle: Fmt.money(invoice.total, locale: locale), trailing: StatusBadge(Labels.invoiceStatus(l, invoice.status), tone: invoice.isPaid ? BadgeTone.seal : BadgeTone.brass), onTap: () => context.push('/invoices/${invoice.id}')))],
      ]))));
  }
  Future<void> _confirm(BuildContext context, WidgetRef ref) async {
    final l = L10n.of(context);
    final ok = await showModalBottomSheet<bool>(context: context, showDragHandle: true, builder: (c) => Padding(padding: const EdgeInsets.fromLTRB(SinaatySpace.lg, 0, SinaatySpace.lg, SinaatySpace.xl), child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [Text(l.confirmReceipt, style: Theme.of(c).textTheme.titleLarge), const SizedBox(height: SinaatySpace.sm), Text(l.confirmReceiptHint), const SizedBox(height: SinaatySpace.xl), PrimaryButton(label: l.confirmReceipt, onPressed: () => Navigator.pop(c, true))])));
    if (ok != true || !context.mounted) return;
    final r = await ref.read(workOrdersRepositoryProvider).confirmReceipt(id); if (!context.mounted) return;
    r.when(ok: (_) { ref.invalidate(workOrderProvider(id)); ref.invalidate(workOrderTimelineProvider(id)); }, err: (f) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(f.message(Localizations.localeOf(context).languageCode)))));
  }
}
class _Timeline extends StatelessWidget {
  final WorkOrder order; final WoTimeline? timeline; final String locale; const _Timeline({required this.order, this.timeline, required this.locale});
  @override Widget build(BuildContext context) {
    final l = L10n.of(context); final reached = <String, DateTime>{}; for (final h in timeline?.history ?? const <WoHistory>[]) { reached[h.to] = h.at; }
    if (const {'cancelled', 'disputed', 'abandoned'}.contains(order.status)) return StatusTimeline(steps: [for (final h in timeline?.history ?? const <WoHistory>[]) TimelineStep(title: Labels.woStatus(l, h.to), subtitle: Fmt.dateTime(h.at, locale: locale), done: true, current: h.to == order.status)]);
    final flow = [...woFlow]; if (reached.containsKey('awaiting_parts')) flow.insert(flow.indexOf('in_progress'), 'awaiting_parts');
    final idx = flow.indexOf(order.status == 'approved' ? 'in_progress' : order.status);
    return StatusTimeline(steps: [for (var i = 0; i < flow.length; i++) TimelineStep(title: Labels.woStatus(l, flow[i]), subtitle: reached[flow[i]] != null ? Fmt.dateTime(reached[flow[i]]!, locale: locale) : null, done: i < idx || reached.containsKey(flow[i]) && i != idx, current: i == idx)]);
  }
}
/// Media objects live in object storage (mock in dev) — MVP shows a calm placeholder strip; thumbnails via presigned GET in backlog.
class _PhotoStrip extends StatelessWidget { final int count; const _PhotoStrip({required this.count}); @override Widget build(BuildContext context) => count == 0 ? const SizedBox.shrink() : SizedBox(height: 72, child: ListView.separated(scrollDirection: Axis.horizontal, itemCount: count, separatorBuilder: (_, _) => const SizedBox(width: 8), itemBuilder: (_, _) => Container(width: 72, decoration: BoxDecoration(color: Theme.of(context).colorScheme.surfaceContainerHighest, borderRadius: BorderRadius.circular(12)), child: Icon(Icons.photo_outlined, color: Theme.of(context).colorScheme.onSurfaceVariant)))); }
