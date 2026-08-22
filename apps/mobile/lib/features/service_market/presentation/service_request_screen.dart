import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/format/format.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../domain/service_request.dart';
import 'providers.dart';

/// One request, two seats (scope §1.ب/ج): the customer compares offers — each with its visible
/// argument, distance line and rating AS THE API SENT THEM — and accepting lands on the normal
/// work order where the whole legal path applies. The workshop sees the problem and answers with
/// the one thing that sets it apart: a diagnosis line, then a price range or a free inspection.
class ServiceRequestScreen extends ConsumerStatefulWidget {
  final String id; final bool workshop;
  const ServiceRequestScreen({super.key, required this.id, this.workshop = false});
  @override ConsumerState<ServiceRequestScreen> createState() => _ServiceRequestScreenState();
}

class _ServiceRequestScreenState extends ConsumerState<ServiceRequestScreen> {
  bool _busy = false;
  void _refresh() { ref.invalidate(serviceRequestProvider(widget.id)); ref.invalidate(myServiceRequestsProvider); ref.invalidate(nearbyServiceRequestsProvider); }

  String _badge(L10n l, String b) => switch (b) { 'cheapest' => l.ptCheapest, 'fastest' => l.ptFastest, 'nearest' => l.srNearestBadge, 'top_rated' => l.srTopRatedBadge, 'previously_used' => l.srPrevUsedBadge, 'specialist' => l.srSpecialistBadge, _ => b };
  String _when(L10n l, String? w) => switch (w) { 'now' => l.srNow, 'this_week' => l.srThisWeek, _ => l.srToday };

  Future<void> _accept(ServiceOffer o) async {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode;
    setState(() => _busy = true);
    final r = await ref.read(serviceMarketRepositoryProvider).accept(widget.id, offerId: o.id);
    if (!mounted) return;
    setState(() => _busy = false);
    r.when(
      ok: (woId) { _refresh(); ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l.srAccepted))); context.push('/work-orders/$woId'); },
      err: (f) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(f.message(locale)))),
    );
  }

  Future<void> _widen(ServiceRequest r) async {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode;
    final next = r.radiusKm < 100 ? 100 : 150;
    setState(() => _busy = true);
    final res = await ref.read(serviceMarketRepositoryProvider).widen(widget.id, radiusKm: next);
    if (!mounted) return;
    setState(() => _busy = false);
    res.when(ok: (_) { _refresh(); ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l.srWidened))); }, err: (f) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(f.message(locale)))));
  }

  Future<void> _respond(ServiceRequest r) async {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode;
    final diagnosis = TextEditingController(); final min = TextEditingController(); final max = TextEditingController();
    var type = 'estimate'; var avail = 'today';
    final mine = r.offers.firstOrNull;   // the workshop view carries only its own offer
    if (mine != null) { diagnosis.text = mine.diagnosisAr ?? ''; min.text = mine.priceMin ?? ''; max.text = mine.priceMax ?? ''; type = mine.offerType; avail = mine.availability ?? 'today'; }

    final ok = await showModalBottomSheet<bool>(context: context, showDragHandle: true, isScrollControlled: true, builder: (ctx) => StatefulBuilder(builder: (ctx, setS) => Padding(
      padding: EdgeInsets.fromLTRB(SinaatySpace.lg, 0, SinaatySpace.lg, MediaQuery.viewInsetsOf(ctx).bottom + SinaatySpace.xl),
      child: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text(l.srRespond, style: Theme.of(ctx).textTheme.titleLarge),
        const SizedBox(height: SinaatySpace.md),
        TextField(controller: diagnosis, minLines: 2, maxLines: 3, autofocus: true, decoration: InputDecoration(labelText: l.srDiagnosis, hintText: l.srDiagnosisHint)),
        const SizedBox(height: SinaatySpace.md),
        SegmentedButton<String>(segments: [ButtonSegment(value: 'estimate', label: Text(l.srEstimate)), ButtonSegment(value: 'free_inspection', label: Text(l.srFreeInspection))], selected: {type}, showSelectedIcon: false, onSelectionChanged: (s) => setS(() => type = s.first)),
        if (type == 'estimate') ...[
          const SizedBox(height: SinaatySpace.md),
          Row(children: [
            Expanded(child: TextField(controller: min, keyboardType: const TextInputType.numberWithOptions(decimal: true), textDirection: TextDirection.ltr, inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.]'))], decoration: InputDecoration(labelText: l.srPriceMin))),
            const SizedBox(width: SinaatySpace.sm),
            Expanded(child: TextField(controller: max, keyboardType: const TextInputType.numberWithOptions(decimal: true), textDirection: TextDirection.ltr, inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.]'))], decoration: InputDecoration(labelText: l.srPriceMax))),
          ]),
        ],
        const SizedBox(height: SinaatySpace.md),
        Row(children: [
          Expanded(child: Text(l.srAvailability, style: Theme.of(ctx).textTheme.titleSmall)),
          SegmentedButton<String>(segments: [ButtonSegment(value: 'now', label: Text(l.srNow)), ButtonSegment(value: 'today', label: Text(l.srToday)), ButtonSegment(value: 'this_week', label: Text(l.srThisWeek))], selected: {avail}, showSelectedIcon: false, onSelectionChanged: (s) => setS(() => avail = s.first)),
        ]),
        const SizedBox(height: SinaatySpace.lg),
        PrimaryButton(label: l.srRespond, icon: Icons.local_offer_outlined, onPressed: () {
          if (diagnosis.text.trim().length < 5) return;                                   // the diagnosis is what sets an offer apart — mandatory
          if (type == 'estimate' && (double.tryParse(min.text) ?? 0) <= 0) return;
          Navigator.pop(ctx, true);
        }),
      ])),
    )));
    if (ok != true || !mounted) return;
    setState(() => _busy = true);
    final res = await ref.read(serviceMarketRepositoryProvider).offer(widget.id,
      offerType: type, diagnosisAr: diagnosis.text.trim(),
      priceMin: type == 'estimate' ? min.text.trim() : null,
      priceMax: type == 'estimate' && max.text.trim().isNotEmpty ? max.text.trim() : null,
      availability: avail);
    if (!mounted) return;
    setState(() => _busy = false);
    res.when(ok: (_) { _refresh(); ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l.srOfferSent))); }, err: (f) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(f.message(locale)))));
  }

  @override Widget build(BuildContext context) {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode; final t = Theme.of(context).textTheme; final scheme = Theme.of(context).colorScheme;
    ref.watch(serviceRequestLiveProvider(widget.id));   // a new offer appears the moment it lands
    final v = ref.watch(serviceRequestProvider(widget.id));
    final r = v.value?.valueOrNull;
    return AppScaffold(
      title: r?.number == null ? l.srFix : r!.number,
      primaryAction: widget.workshop && r != null && r.open ? PrimaryButton(label: l.srRespond, icon: Icons.local_offer_outlined, loading: _busy, onPressed: _busy ? null : () => _respond(r)) : null,
      moreItems: !widget.workshop && r != null && r.open ? [PopupMenuItem(value: 'cancel', child: Text(l.srCancelRequest))] : null,
      onMore: (val) async { if (val == 'cancel' && !_busy) { final res = await ref.read(serviceMarketRepositoryProvider).cancel(widget.id); if (mounted) res.when(ok: (_) => _refresh(), err: (_) {}); } },
      body: AsyncResultView<ServiceRequest>(value: v, onRetry: _refresh, builder: (r) => RefreshIndicator(onRefresh: () async => _refresh(), child: ListView(padding: const EdgeInsets.fromLTRB(SinaatySpace.lg, SinaatySpace.md, SinaatySpace.lg, 110), children: [
        SealCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(r.titleAr, style: t.titleLarge?.copyWith(color: Colors.white)),
              Text(Fmt.meta([r.number, if (widget.workshop && r.distanceText != null) r.distanceText, Fmt.date(r.createdAt, locale: locale)]), style: t.bodySmall?.copyWith(color: Colors.white.withValues(alpha: .75))),
            ])),
            SealPill(_when(l, r.preferredTime), icon: Icons.schedule_outlined),
          ]),
          if (r.descriptionAr != null && r.descriptionAr!.isNotEmpty) ...[
            const SizedBox(height: SinaatySpace.sm),
            Text(r.descriptionAr!, style: t.bodyMedium?.copyWith(color: Colors.white.withValues(alpha: .9))),
          ],
          const SizedBox(height: SinaatySpace.sm),
          Wrap(spacing: 8, runSpacing: 6, children: [
            SealPill(l.srKm(r.radiusKm), icon: Icons.radar_outlined),
            if (!widget.workshop) SealPill('${r.offersCount}', icon: Icons.local_offer_outlined),
          ]),
        ])),
        if (r.mediaIds.isNotEmpty) ...[
          const SizedBox(height: SinaatySpace.lg),
          MediaStrip(mediaIds: r.mediaIds),
        ],
        if (!widget.workshop) ...[
          const SizedBox(height: SinaatySpace.sm),
          Text(l.srFinalPriceNote, style: t.bodySmall?.copyWith(color: scheme.onSurfaceVariant)),
          const SizedBox(height: SinaatySpace.lg),
          SectionTitle(l.srOffers),
          if (r.offers.isEmpty) ...[
            EmptyState(icon: Icons.storefront_outlined, title: l.srNoOffers, body: ''),
            if (r.open && r.radiusKm < 150) Center(child: TextButton.icon(onPressed: _busy ? null : () => _widen(r), icon: const Icon(Icons.radar_outlined, size: 18), label: Text(l.srWiden(r.radiusKm < 100 ? 100 : 150)))),
          ] else ...[
            for (final o in r.offers) Padding(padding: const EdgeInsets.only(bottom: SinaatySpace.md), child: _OfferCard(
              o: o, busy: _busy, canAccept: r.open,
              badgeLabel: (b) => _badge(l, b), whenLabel: _when(l, o.availability),
              onAccept: () => _accept(o),
            )),
          ],
        ] else if (r.offers.isNotEmpty) ...[
          // The workshop sees only its own offer — refine it any time from the primary button.
          const SizedBox(height: SinaatySpace.lg),
          SectionTitle(l.srRespond),
          _OfferCard(o: r.offers.first, busy: true, canAccept: false, badgeLabel: (b) => _badge(l, b), whenLabel: _when(l, r.offers.first.availability), onAccept: () {}),
        ],
      ]))),
    );
  }
}

class _OfferCard extends StatelessWidget {
  final ServiceOffer o; final bool busy; final bool canAccept;
  final String Function(String) badgeLabel; final String whenLabel; final VoidCallback onAccept;
  const _OfferCard({required this.o, required this.busy, required this.canAccept, required this.badgeLabel, required this.whenLabel, required this.onAccept});

  @override Widget build(BuildContext context) {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode;
    final t = Theme.of(context).textTheme; final scheme = Theme.of(context).colorScheme;
    return SectionCard(glow: o.badges.contains('cheapest'), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(o.workshopNameAr ?? '—', style: t.titleSmall),
          Text(Fmt.meta([if (o.rating != null) '★ ${o.rating}', if (o.distanceText != null) o.distanceText, if (o.respondsInMinutes != null) l.srRespondsIn(o.respondsInMinutes!)]), style: t.bodySmall?.copyWith(color: scheme.onSurfaceVariant)),
        ])),
        if (o.freeInspection) StatusBadge(l.srFreeInspection, tone: BadgeTone.seal, icon: Icons.search_outlined)
        else if (o.priceMin != null && o.priceMax != null && o.priceMax != o.priceMin) Text(l.srPriceRange(Fmt.money(o.priceMin!, locale: locale), Fmt.money(o.priceMax!, locale: locale)), style: t.titleSmall, textAlign: TextAlign.start)
        else if (o.priceMin != null) MoneyText(Fmt.money(o.priceMin!, locale: locale)),
      ]),
      if (o.diagnosisAr != null && o.diagnosisAr!.isNotEmpty) ...[
        const SizedBox(height: SinaatySpace.sm),
        Text(o.diagnosisAr!, style: t.bodyMedium),
      ],
      const SizedBox(height: SinaatySpace.sm),
      Wrap(spacing: 6, runSpacing: 4, children: [
        StatusBadge(whenLabel, icon: Icons.schedule_outlined),
        for (final b in o.badges) StatusBadge(badgeLabel(b), tone: b == 'previously_used' ? BadgeTone.seal : BadgeTone.brass),
      ]),
      if (canAccept) ...[
        const SizedBox(height: SinaatySpace.md),
        SizedBox(width: double.infinity, child: PrimaryButton(label: l.ptAcceptBid, icon: Icons.check, loading: busy, onPressed: busy ? null : onAccept)),
      ],
    ]));
  }
}
