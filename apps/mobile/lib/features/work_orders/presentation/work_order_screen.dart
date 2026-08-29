import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/flags/feature_flags.dart';
import '../../../core/format/format.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/l10n/labels.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../../billing/presentation/providers.dart';
import '../../disputes/presentation/open_dispute_sheet.dart';
import '../../disputes/presentation/providers.dart' as disputes;
import '../domain/work_orders_repository.dart' show MyReview;
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
    // Disputes ride behind their flag from day one (p1 scope §3): one entry in «المزيد», a status card once open.
    final disputesOn = (ref.watch(featureFlagsProvider(null)).value ?? FeatureFlags.allVisible).enabled(Flags.disputes);
    final dispute = !disputesOn ? null : (ref.watch(disputes.myDisputesProvider).value?.valueOrNull ?? const []).where((d) => d.workOrderId == id && d.live).firstOrNull;
    final canDispute = disputesOn && dispute == null && order != null && const {'approved', 'awaiting_parts', 'in_progress', 'quality_check', 'ready', 'delivered'}.contains(order.status);
    Widget? primary;
    if (order != null) {
      if (order.awaitingApproval) { primary = PrimaryButton(label: l.approveNow, onPressed: () => context.push('/work-orders/$id/approve')); }
      else if (invoice != null && invoice.payable) { primary = PrimaryButton(label: l.payAmount(Fmt.money(invoice.remaining, locale: locale)), onPressed: () => context.push('/invoices/${invoice.id}')); }
      else if (order.status == 'delivered' && invoice != null && invoice.isPaid) { primary = PrimaryButton(label: l.confirmReceipt, onPressed: () => _confirm(context, ref)); }
    }
    return AppScaffold(title: order?.number == null ? l.workOrder : l.workOrderNumber(order!.number), primaryAction: primary,
      moreItems: canDispute ? [PopupMenuItem(value: 'dispute', child: Text(l.dsOpen))] : null,
      onMore: (v) { if (v == 'dispute') openDisputeSheet(context, ref, workOrderId: id); },
      body: AsyncResultView<WorkOrder>(value: wo, onRetry: refresh, builder: (o) => RefreshIndicator(onRefresh: () async => refresh(), child: ListView(padding: const EdgeInsets.fromLTRB(SinaatySpace.lg, SinaatySpace.md, SinaatySpace.lg, 96), children: [
        if (dispute != null) ...[
          SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm), child: AppListRow(icon: Icons.balance_outlined, title: l.dsActive, subtitle: l.dsMoneyHeld, trailing: StatusBadge(Labels.disputeStatus(l, dispute.status), tone: BadgeTone.warn), onTap: () => context.push('/disputes/${dispute.id}'))),
          const SizedBox(height: SinaatySpace.lg),
        ],
        // The uncollected-car warning (Step 29): tell the customer what happens and what to do — collect the car.
        if (o.status == 'ready' || o.status == 'abandoned') ...[
          SectionCard(child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Icon(o.status == 'abandoned' ? Icons.gavel_outlined : Icons.schedule_outlined, size: 20, color: o.status == 'abandoned' ? Theme.of(context).colorScheme.error : SinaatyColors.warn),
            const SizedBox(width: SinaatySpace.sm),
            Expanded(child: Text(o.status == 'abandoned' ? l.abCustomerDeclared : l.abCustomerReady, style: Theme.of(context).textTheme.bodySmall?.copyWith(height: 1.5))),
          ])),
          const SizedBox(height: SinaatySpace.lg),
        ],
        SealCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(o.titleAr ?? l.workOrder, style: Theme.of(context).textTheme.titleLarge?.copyWith(color: Colors.white)), Text(Fmt.meta([o.partyLine.isEmpty ? null : o.partyLine, o.number]), style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.white.withValues(alpha: .75)))])), const SizedBox(width: 8), SealPill(Labels.woStatus(l, o.status))]),
          const SizedBox(height: SinaatySpace.md), MoneyText(Fmt.money(o.total, locale: locale), hero: true, style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: Colors.white)),
          const SizedBox(height: SinaatySpace.md), Wrap(spacing: 8, runSpacing: 6, children: [SealPill(Labels.terms(l, o.paymentTerms), icon: Icons.payments_outlined), if (o.paymentTerms == 'deferred') SealPill(l.securedByNote, icon: Icons.verified_outlined), ?signedPill(l, tl.value?.valueOrNull?.versions)]),
        ])),
        // «قطعتك وصلت»: رحلة القطعة بلا أسعار — «بانتظار القطع» المبهمة كانت نصف مكالمات «وين وصلنا؟»
        if (o.parts.isNotEmpty) ...[
          const SizedBox(height: SinaatySpace.lg),
          SectionCard(child: Column(children: [
            for (final part in o.parts) Padding(padding: const EdgeInsets.symmetric(vertical: 4), child: Row(children: [
              const BrandIcon(BrandGlyph.gear, size: 20),
              const SizedBox(width: SinaatySpace.sm),
              Expanded(child: Text(part.items.isEmpty ? l.woPartGeneric : part.items.join('، '), style: Theme.of(context).textTheme.bodyMedium, maxLines: 1, overflow: TextOverflow.ellipsis)),
              StatusBadge(Labels.woPartStatus(l, part.status), tone: part.status == 'confirmed' || part.status == 'delivered' ? BadgeTone.seal : BadgeTone.plain),
            ])),
          ])),
        ],
        // التقييم بعد التسليم: نجومٌ تُروى مرةً واحدة — والسوق يكسب عملته
        if (const {'delivered', 'closed'}.contains(o.status)) _RatingCard(workOrderId: id),
        const SizedBox(height: SinaatySpace.xl), SectionTitle(l.timeline),
        SectionCard(child: _Timeline(order: o, timeline: tl.value?.valueOrNull, locale: locale)),
        const SizedBox(height: SinaatySpace.xl), SectionTitle(l.items),
        SectionCard(child: Column(children: [
          for (final i in o.items) Padding(padding: const EdgeInsets.symmetric(vertical: 7), child: Row(children: [Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(i.descriptionAr, style: Theme.of(context).textTheme.titleSmall), Text('${i.quantity} × ${Fmt.money(i.unitPrice, locale: locale)}${i.warrantyDays > 0 ? ' · ${l.warrantyDays(i.warrantyDays)}' : ''}', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant))])), Text(Fmt.money(i.lineTotal, locale: locale))])),
          const Padding(padding: EdgeInsets.symmetric(vertical: 6), child: Divider()), KeyValueRow(l.vat, Fmt.money(o.vatAmount, locale: locale)), Padding(padding: const EdgeInsets.only(top: 6), child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text(l.total, style: Theme.of(context).textTheme.titleMedium), MoneyText(Fmt.money(o.total, locale: locale))])),
        ])),
        if ((tl.value?.valueOrNull?.media.isNotEmpty ?? false) || (tl.value?.valueOrNull?.inspections.isNotEmpty ?? false)) ...[
          if ((ref.watch(featureFlagsProvider(null)).value ?? FeatureFlags.allVisible).enabled(Flags.aiInspection) && (tl.value?.valueOrNull?.inspections ?? []).any((i) => i.type == 'check_in')) ...[
            const SizedBox(height: SinaatySpace.lg),
            SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm), child: AppListRow(icon: Icons.compare_outlined, title: l.diffOpen, subtitle: l.diffSub, trailing: const Icon(Icons.chevron_left), onTap: () => context.push('/work-orders/$id/condition'))),
          ],
          const SizedBox(height: SinaatySpace.xl), SectionTitle(l.photos),
          SectionCard(child: Column(children: [
            for (final ins in tl.value!.valueOrNull!.inspections) AppListRow(icon: ins.type == 'check_in' ? Icons.login : Icons.logout, title: ins.type == 'check_in' ? l.checkIn : l.checkOut, subtitle: Fmt.meta([Fmt.dateTime(ins.performedAt, locale: locale), if (ins.odometerKm != null) '${ins.odometerKm} ${l.km}', l.damages(ins.damagesCount)]), trailing: StatusBadge(l.photosCount(ins.mediaIds.length))),
            MediaStrip(mediaIds: tl.value!.valueOrNull!.media.map((m) => m.mediaId).toList()),
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

/// The signature badge must name the method actually used. Showing «موقّع بنفاذ» over an SMS-code
/// signature is a false statement about a legal instrument — the one lie this product cannot afford.
SealPill? signedPill(L10n l, List<WoVersionSummary>? versions) {
  final signed = (versions ?? const <WoVersionSummary>[]).where((v) => v.signed).toList();
  if (signed.isEmpty) return null;
  final nafath = signed.any((v) => v.signedMethod == 'nafath');
  return SealPill(nafath ? l.signedByNafath : l.signedByOtp, icon: Icons.verified_user_outlined);
}

/// بطاقة التقييم — نجومُ الختم: تُعرض بعد التسليم، وتتحول «شكراً لك» بعد الإرسال.
///
/// النجمة المختارة قرصُ ختمٍ أخضر لا نجمة Material — والسؤال واحدٌ بلا استبيانٍ يُهجَر:
/// كيف كانت التجربة؟ (وتعليقٌ اختياري). تقييمٌ واحد لكل أمر — يحرسه الخادم.
class _RatingCard extends ConsumerStatefulWidget {
  final String workOrderId;
  const _RatingCard({required this.workOrderId});
  @override ConsumerState<_RatingCard> createState() => _RatingCardState();
}

class _RatingCardState extends ConsumerState<_RatingCard> {
  int _stars = 0; bool _busy = false; MyReview? _mine; bool _loaded = false;
  final _comment = TextEditingController();

  @override void initState() {
    super.initState();
    ref.read(workOrdersRepositoryProvider).myReview(widget.workOrderId).then((r) {
      if (mounted) setState(() { _mine = r.valueOrNull; _loaded = true; });
    });
  }
  @override void dispose() { _comment.dispose(); super.dispose(); }

  Future<void> _submit() async {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode;
    setState(() => _busy = true);
    final r = await ref.read(workOrdersRepositoryProvider).submitReview(widget.workOrderId, rating: _stars, commentAr: _comment.text.trim().isEmpty ? null : _comment.text.trim());
    if (!mounted) return;
    setState(() => _busy = false);
    r.when(
      ok: (_) => setState(() => _mine = MyReview(rating: _stars)),
      err: (f) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(f.message(locale)))),
    );
    if (_mine != null) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l.rvThanks)));
  }

  @override Widget build(BuildContext context) {
    final l = L10n.of(context); final t = Theme.of(context); final cs = t.colorScheme;
    if (!_loaded) return const SizedBox.shrink();
    if (_mine != null) {
      // قيّم من قبل: امتنانٌ هادئ بنجومه — لا نموذج يعود يطارده
      return Padding(padding: const EdgeInsets.only(top: SinaatySpace.lg), child: SectionCard(child: Row(children: [
        const BrandIcon(BrandGlyph.shieldSeal, size: 22),
        const SizedBox(width: SinaatySpace.sm),
        Expanded(child: Text(l.rvThanks, style: t.textTheme.titleSmall)),
        Row(children: [for (var i = 0; i < _mine!.rating; i++) const Padding(padding: EdgeInsets.only(left: 2), child: Icon(Icons.star_rounded, size: 18, color: Color(0xFFC49A52)))]),
      ])));
    }
    return Padding(padding: const EdgeInsets.only(top: SinaatySpace.lg), child: SectionCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(l.rvTitle, style: t.textTheme.titleMedium),
      const SizedBox(height: 2),
      Text(l.rvBody, style: t.textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
      const SizedBox(height: SinaatySpace.md),
      // خمسة أقراص ختمٍ — المختار يمتلئ ختماً أخضر والبقية حلقات
      Row(mainAxisAlignment: MainAxisAlignment.center, children: [
        for (var i = 1; i <= 5; i++) GestureDetector(
          onTap: _busy ? null : () => setState(() => _stars = i),
          child: AnimatedContainer(duration: const Duration(milliseconds: 150), width: 46, height: 46, margin: const EdgeInsets.symmetric(horizontal: 5),
            decoration: BoxDecoration(shape: BoxShape.circle,
              color: i <= _stars ? cs.primary : Colors.transparent,
              border: Border.all(color: i <= _stars ? cs.primary : cs.outlineVariant, width: 2)),
            child: Icon(Icons.star_rounded, size: 24, color: i <= _stars ? Colors.white : cs.onSurfaceVariant.withValues(alpha: .5)),
          ),
        ),
      ]),
      if (_stars > 0) ...[
        const SizedBox(height: SinaatySpace.md),
        TextField(controller: _comment, minLines: 1, maxLines: 3,
            decoration: InputDecoration(labelText: l.rvCommentOptional, hintText: l.rvCommentHint)),
        const SizedBox(height: SinaatySpace.md),
        PrimaryButton(label: l.rvSubmit, icon: Icons.check, loading: _busy, onPressed: _busy ? null : _submit),
      ],
    ])));
  }
}
