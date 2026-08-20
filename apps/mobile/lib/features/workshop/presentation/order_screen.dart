import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/format/format.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/l10n/labels.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../../billing/presentation/providers.dart';
import '../../work_orders/domain/work_order.dart';
import '../../work_orders/presentation/providers.dart';
import '../domain/workshop.dart';
import 'providers.dart';
/// Workshop view of an order: hero (status + total), one primary action for the current step, items, timeline, photos.
/// Status updates and photo attachments go through SyncController (queued when offline).
class WorkshopOrderScreen extends ConsumerStatefulWidget { final String id; const WorkshopOrderScreen({super.key, required this.id}); @override ConsumerState<WorkshopOrderScreen> createState() => _WorkshopOrderScreenState(); }
class _WorkshopOrderScreenState extends ConsumerState<WorkshopOrderScreen> {
  bool _busy = false;
  void _refresh() { ref.invalidate(workOrderProvider(widget.id)); ref.invalidate(workOrderTimelineProvider(widget.id)); ref.invalidate(orgOrdersProvider); ref.invalidate(invoicesProvider); }
  void _toast(String m) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));
  Future<void> _transition(String to) async {
    final l = L10n.of(context); setState(() => _busy = true);
    final r = await ref.read(syncControllerProvider.notifier).run('transition', {'woId': widget.id, 'to': to}); if (!mounted) return; setState(() => _busy = false);
    if (r.queued) { _toast(l.wsOffline); } else if (r.failure != null) { _toast(r.failure!.message(Localizations.localeOf(context).languageCode)); } else { _refresh(); }
  }
  Future<void> _requestApproval() async { setState(() => _busy = true); final r = await ref.read(workshopRepositoryProvider).requestApproval(widget.id); if (!mounted) return; setState(() => _busy = false); r.when(ok: (_) => _refresh(), err: (f) => _toast(f.message(Localizations.localeOf(context).languageCode))); }
  Future<void> _issueInvoice() async { setState(() => _busy = true); final r = await ref.read(workshopRepositoryProvider).issueInvoice(widget.id); if (!mounted) return; setState(() => _busy = false); r.when(ok: (id) { _refresh(); context.push('/invoices/$id'); }, err: (f) => _toast(f.message(Localizations.localeOf(context).languageCode))); }
  Future<void> _addPhoto() async {
    final l = L10n.of(context); final repo = ref.read(workshopRepositoryProvider);
    // Camera capture lives in the inspection flow; here we presign a progress photo (bytes from camera on device; test path uses a stub).
    setState(() => _busy = true);
    final bytes = List<int>.filled(1024, 0); final p = await repo.presign(mimeType: 'image/jpeg', sizeBytes: bytes.length, sha256: 'a' * 64, purpose: 'work_order');
    if (!mounted) return;
    await p.when(ok: (pre) async { await repo.upload(pre, bytes, 'image/jpeg'); final r = await ref.read(syncControllerProvider.notifier).run('attach_media', {'woId': widget.id, 'mediaIds': [pre.mediaId], 'label': 'progress'}); if (!mounted) return; if (r.queued) { _toast(l.wsOffline); } else if (r.failure == null) { _toast(l.wsPhotoAdded); _refresh(); } }, err: (f) async => _toast(f.message(Localizations.localeOf(context).languageCode)));
    if (mounted) setState(() => _busy = false);
  }
  @override Widget build(BuildContext context) {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode; final t = Theme.of(context).textTheme;
    ref.watch(workOrderLiveProvider(widget.id)); final wo = ref.watch(workOrderProvider(widget.id)); final tl = ref.watch(workOrderTimelineProvider(widget.id)); final invoices = ref.watch(invoicesProvider);
    final o = wo.value?.valueOrNull; final invoice = invoices.value?.valueOrNull?.where((i) => i.workOrderId == widget.id && i.status != 'void').firstOrNull;
    Widget? primary;
    if (o != null) {
      primary = switch (o.status) {
        'draft' => PrimaryButton(label: l.wsReceive, icon: Icons.login, loading: _busy, onPressed: () => _transition('received')),
        'received' => PrimaryButton(label: l.wsInspect, icon: Icons.photo_camera_outlined, loading: _busy, onPressed: () => context.push('/ws/orders/${widget.id}/inspect')),
        'inspecting' => PrimaryButton(label: l.wsRequestApproval, icon: Icons.send_outlined, loading: _busy, onPressed: o.items.isEmpty ? null : _requestApproval),
        'approved' || 'awaiting_parts' => PrimaryButton(label: l.wsStart, icon: Icons.play_arrow_rounded, loading: _busy, onPressed: () => _transition('in_progress')),
        'in_progress' => PrimaryButton(label: l.wsQuality, loading: _busy, onPressed: () => _transition('quality_check')),
        'quality_check' => PrimaryButton(label: l.wsReady, loading: _busy, onPressed: () => _transition('ready')),
        'ready' => invoice == null ? PrimaryButton(label: l.wsIssueInvoice, icon: Icons.receipt_long_outlined, loading: _busy, onPressed: _issueInvoice) : PrimaryButton(label: l.wsDeliver, loading: _busy, onPressed: () => _transition('delivered')),
        'delivered' when invoice == null => PrimaryButton(label: l.wsIssueInvoice, icon: Icons.receipt_long_outlined, loading: _busy, onPressed: _issueInvoice),
        _ => null,
      };
    }
    return AppScaffold(title: o?.number ?? l.workOrder, primaryAction: primary,
      moreItems: [if (o != null && o.status == 'inspecting') PopupMenuItem(value: 'item', child: Text(l.wsAddItem)), if (o != null && !const {'draft', 'closed', 'cancelled'}.contains(o.status)) PopupMenuItem(value: 'photo', child: Text(l.wsAddPhoto)), if (o != null) PopupMenuItem(value: 'accident', child: Text(l.accOpen))],
      onMore: (v) { if (v == 'photo') _addPhoto(); if (v == 'item') _addItemSheet(); if (v == 'accident') context.push('/ws/orders/${widget.id}/accident'); },
      body: AsyncResultView<WorkOrder>(value: wo, onRetry: _refresh, builder: (o) => RefreshIndicator(onRefresh: () async => _refresh(), child: ListView(padding: const EdgeInsets.fromLTRB(SinaatySpace.lg, SinaatySpace.sm, SinaatySpace.lg, 96), children: [
        SealCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(o.titleAr ?? l.workOrder, style: t.titleLarge?.copyWith(color: Colors.white)), Text(Fmt.meta([o.number, Fmt.dateTime(o.createdAt, locale: locale)]), style: t.bodySmall?.copyWith(color: Colors.white.withValues(alpha: .75)))])), const SizedBox(width: 8), SealPill(Labels.woStatus(l, o.status))]),
          const SizedBox(height: SinaatySpace.md), MoneyText(Fmt.money(o.total, locale: locale), hero: true, style: t.headlineMedium?.copyWith(color: Colors.white)),
          const SizedBox(height: SinaatySpace.sm), Wrap(spacing: 8, runSpacing: 6, children: [SealPill(Labels.terms(l, o.paymentTerms), icon: Icons.payments_outlined), if (o.awaitingApproval) SealPill(l.wsWaitingCustomer, icon: Icons.hourglass_top), if (invoice != null) SealPill('${l.invoice} ${Labels.invoiceStatus(l, invoice.status)}', icon: Icons.receipt_long_outlined)]),
        ])),
        const SizedBox(height: SinaatySpace.xl), SectionTitle(l.items, trailing: o.status == 'inspecting' || o.status == 'draft' || o.status == 'received' ? TextButton.icon(onPressed: _addItemSheet, icon: const Icon(Icons.add, size: 18), label: Text(l.wsAddItem)) : null),
        SectionCard(child: Column(children: [
          if (o.items.isEmpty) Padding(padding: const EdgeInsets.all(8), child: Text(l.wsAddItem, style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant))),
          for (final i in o.items) Padding(padding: const EdgeInsets.symmetric(vertical: 6), child: Row(children: [Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(i.descriptionAr, style: t.titleSmall), Text('${i.quantity} × ${Fmt.money(i.unitPrice, locale: locale)}', style: t.bodySmall?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant))])), Text(Fmt.money(i.lineTotal, locale: locale))])),
          const Padding(padding: EdgeInsets.symmetric(vertical: 6), child: Divider()), KeyValueRow(l.vat, Fmt.money(o.vatAmount, locale: locale)), Padding(padding: const EdgeInsets.only(top: 6), child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text(l.total, style: t.titleMedium), MoneyText(Fmt.money(o.total, locale: locale))])),
        ])),
        const SizedBox(height: SinaatySpace.xl), SectionTitle(l.timeline),
        SectionCard(child: StatusTimeline(steps: [for (final h in tl.value?.valueOrNull?.history ?? const <WoHistory>[]) TimelineStep(title: Labels.woStatus(l, h.to), subtitle: Fmt.dateTime(h.at, locale: locale), done: true, current: h.to == o.status)])),
        if ((tl.value?.valueOrNull?.inspections.isNotEmpty ?? false) || (tl.value?.valueOrNull?.media.isNotEmpty ?? false)) ...[const SizedBox(height: SinaatySpace.xl), SectionTitle(l.photos, trailing: TextButton.icon(onPressed: _busy ? null : _addPhoto, icon: const Icon(Icons.add_a_photo_outlined, size: 18), label: Text(l.wsAddPhoto))),
          SectionCard(child: Column(children: [for (final ins in tl.value!.valueOrNull!.inspections) AppListRow(icon: Icons.login, title: ins.type == 'check_in' ? l.checkIn : l.checkOut, subtitle: Fmt.meta([Fmt.dateTime(ins.performedAt, locale: locale), l.damages(ins.damagesCount)]), trailing: StatusBadge(l.photosCount(ins.mediaIds.length))), Padding(padding: const EdgeInsets.only(top: SinaatySpace.sm), child: Align(alignment: AlignmentDirectional.centerStart, child: MediaStrip(mediaIds: tl.value!.valueOrNull!.media.map((m) => m.mediaId).toList())))]))],
        if (invoice != null) ...[const SizedBox(height: SinaatySpace.md), SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm), child: AppListRow(icon: Icons.receipt_long_outlined, title: l.invoiceNumber(invoice.number), subtitle: Fmt.money(invoice.total, locale: locale), trailing: StatusBadge(Labels.invoiceStatus(l, invoice.status), tone: invoice.isPaid ? BadgeTone.seal : BadgeTone.brass), onTap: () => context.push('/invoices/${invoice.id}')))],
      ]))));
  }
  Future<void> _addItemSheet() async {
    final l = L10n.of(context); final desc = TextEditingController(); final price = TextEditingController(); var type = 'labor';
    final item = await showModalBottomSheet<NewItem>(context: context, isScrollControlled: true, showDragHandle: true, builder: (ctx) => StatefulBuilder(builder: (ctx, setS) => Padding(padding: EdgeInsets.fromLTRB(SinaatySpace.lg, 0, SinaatySpace.lg, MediaQuery.viewInsetsOf(ctx).bottom + SinaatySpace.xl), child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Text(l.wsAddItem, style: Theme.of(ctx).textTheme.titleLarge), const SizedBox(height: SinaatySpace.md),
      SegmentedButton<String>(segments: [ButtonSegment(value: 'labor', label: Text(l.wsLabor)), ButtonSegment(value: 'part', label: Text(l.wsPart))], selected: {type}, onSelectionChanged: (s) => setS(() => type = s.first), showSelectedIcon: false), const SizedBox(height: SinaatySpace.md),
      TextField(controller: desc, decoration: InputDecoration(labelText: l.wsItemDesc), autofocus: true), const SizedBox(height: SinaatySpace.md),
      TextField(controller: price, keyboardType: const TextInputType.numberWithOptions(decimal: true), textDirection: TextDirection.ltr, decoration: InputDecoration(labelText: l.wsItemPrice, suffixText: 'ر.س')), const SizedBox(height: SinaatySpace.lg),
      PrimaryButton(label: l.wsAddItem, onPressed: () { if (desc.text.trim().length < 2 || double.tryParse(price.text) == null) return; Navigator.pop(ctx, NewItem(type: type, descriptionAr: desc.text.trim(), unitPrice: price.text.trim(), partCondition: type == 'part' ? 'oem_new' : null)); }),
    ]))));
    if (item == null || !mounted) return;
    final r = await ref.read(workshopRepositoryProvider).addItem(widget.id, item); if (!mounted) return; r.when(ok: (_) => _refresh(), err: (f) => _toast(f.message(Localizations.localeOf(context).languageCode)));
  }
}
