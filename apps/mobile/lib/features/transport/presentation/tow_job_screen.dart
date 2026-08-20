import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/format/format.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/l10n/labels.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../domain/transport.dart';
import 'providers.dart';

/// One tow job: where it is now, who is driving, what it costs. Cancel lives behind «المزيد» —
/// the screen's single visible action is the one that matters at this moment.
class TowJobScreen extends ConsumerStatefulWidget {
  final String id;
  const TowJobScreen({super.key, required this.id});
  @override ConsumerState<TowJobScreen> createState() => _TowJobScreenState();
}

class _TowJobScreenState extends ConsumerState<TowJobScreen> {
  bool _busy = false;
  void _refresh() { ref.invalidate(towJobProvider(widget.id)); ref.invalidate(myTowJobsProvider); }

  Future<void> _cancel(TransportJob j) async {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode;
    final reason = TextEditingController();
    final ok = await showModalBottomSheet<bool>(context: context, showDragHandle: true, isScrollControlled: true, builder: (ctx) => Padding(
      padding: EdgeInsets.fromLTRB(SinaatySpace.lg, 0, SinaatySpace.lg, MediaQuery.viewInsetsOf(ctx).bottom + SinaatySpace.xl),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text(l.towCancelTitle, style: Theme.of(ctx).textTheme.titleLarge),
        const SizedBox(height: 4), Text(l.towCancelBody, style: TextStyle(color: Theme.of(ctx).colorScheme.onSurfaceVariant)),
        const SizedBox(height: SinaatySpace.md), TextField(controller: reason, autofocus: true, decoration: InputDecoration(labelText: l.towCancelReason)),
        const SizedBox(height: SinaatySpace.lg), PrimaryButton(label: l.towCancelAction, onPressed: () => Navigator.pop(ctx, true)),
      ]),
    ));
    if (ok != true || !mounted) return;
    setState(() => _busy = true);
    final res = await ref.read(transportRepositoryProvider).cancel(j.id, reasonAr: reason.text.trim().isEmpty ? null : reason.text.trim());
    if (!mounted) return;
    setState(() => _busy = false);
    res.when(ok: (_) => _refresh(), err: (f) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(f.message(locale)))));
  }

  @override Widget build(BuildContext context) {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode; final t = Theme.of(context).textTheme;
    final v = ref.watch(towJobProvider(widget.id));
    final j = v.value?.valueOrNull;
    final done = towSteps.indexWhere((s) => s == j?.status);
    return AppScaffold(
      title: j?.number ?? l.towTitle,
      moreItems: j != null && j.canCancel ? [PopupMenuItem(value: 'cancel', child: Text(l.towCancelAction))] : null,
      onMore: (val) { if (val == 'cancel' && j != null && !_busy) _cancel(j); },
      body: AsyncResultView<TransportJob>(value: v, onRetry: _refresh, builder: (j) => RefreshIndicator(onRefresh: () async => _refresh(), child: ListView(
        padding: const EdgeInsets.fromLTRB(SinaatySpace.lg, SinaatySpace.md, SinaatySpace.lg, 96),
        children: [
          SealCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(Labels.transportStatus(l, j.status), style: t.titleLarge?.copyWith(color: Colors.white)),
                Text(Fmt.meta([j.number, if (j.distanceKm != null) l.towKm(j.distanceKm!)]), style: t.bodySmall?.copyWith(color: Colors.white.withValues(alpha: .75))),
              ])),
              if (j.isLive && j.etaMinutes != null) SealPill(l.towEta(j.etaMinutes!), icon: Icons.timer_outlined),
            ]),
            const SizedBox(height: SinaatySpace.md),
            MoneyText(Fmt.money(j.price, locale: locale), hero: true, style: t.headlineMedium?.copyWith(color: Colors.white)),
            if (j.driver?.nameAr != null) ...[
              const SizedBox(height: SinaatySpace.md),
              Text('${l.towDriver}: ${j.driver!.nameAr}${j.driver!.truckPlate != null ? ' · ${j.driver!.truckPlate}' : ''}', style: t.bodyMedium?.copyWith(color: Colors.white.withValues(alpha: .9))),
            ],
          ])),
          const SizedBox(height: SinaatySpace.xl),
          SectionTitle(l.towProgress),
          SectionCard(child: StatusTimeline(steps: [
            for (var i = 0; i < towSteps.length; i++)
              TimelineStep(title: Labels.transportStatus(l, towSteps[i]), done: done >= i && done >= 0, current: done == i),
          ])),
          const SizedBox(height: SinaatySpace.lg),
          SectionTitle(l.towRoute),
          SectionCard(child: Column(children: [
            KeyValueRow(l.towFrom, j.pickupAddress ?? j.pickup?.toString() ?? '—'),
            KeyValueRow(l.towTo, j.dropoffAddress ?? j.dropoff?.toString() ?? '—'),
            if (j.notesAr != null && j.notesAr!.isNotEmpty) KeyValueRow(l.towNotes, j.notesAr!),
            KeyValueRow(l.towRequestedAt, Fmt.dateTime(j.createdAt, locale: locale)),
          ])),
        ],
      ))),
    );
  }
}
