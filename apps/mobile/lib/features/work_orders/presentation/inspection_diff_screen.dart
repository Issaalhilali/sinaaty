import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/format/format.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../domain/work_order.dart';
import 'providers.dart';

/// «هل تضررت سيارتي عند الورشة؟» — the one question that turns a delivery into an argument.
/// This screen answers it with the same list and the same photos for both sides: what appeared, what got
/// worse, what was repaired. The verdict leads; the details follow (charter §5.0 #1).
class InspectionDiffScreen extends ConsumerWidget {
  final String id;
  const InspectionDiffScreen({super.key, required this.id});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = L10n.of(context);
    final locale = Localizations.localeOf(context).languageCode;
    final t = Theme.of(context).textTheme;
    final v = ref.watch(inspectionDiffProvider(id));
    void refresh() => ref.invalidate(inspectionDiffProvider(id));

    return AppScaffold(
      title: l.diffTitle,
      subtitle: l.diffSub,
      body: AsyncResultView<InspectionDiff>(
        value: v,
        onRetry: refresh,
        builder: (d) => RefreshIndicator(
          onRefresh: () async => refresh(),
          child: ListView(
            padding: const EdgeInsets.fromLTRB(SinaatySpace.lg, SinaatySpace.md, SinaatySpace.lg, SinaatySpace.xl),
            children: [
              _Verdict(d: d),
              const SizedBox(height: SinaatySpace.xl),
              if (d.appeared.isNotEmpty) ...[
                SectionTitle(l.diffAppeared),
                SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm, vertical: SinaatySpace.xs),
                  child: Column(children: [for (final x in d.appeared) _DamageRow(d: x, tone: BadgeTone.bad)])),
                const SizedBox(height: SinaatySpace.lg),
              ],
              if (d.worsened.isNotEmpty) ...[
                SectionTitle(l.diffWorsened),
                SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm, vertical: SinaatySpace.xs),
                  child: Column(children: [
                    for (final w in d.worsened)
                      AppListRow(icon: Icons.trending_up, title: w.zoneAr, subtitle: l.diffFromTo(_sev(l, w.from), _sev(l, w.to)), trailing: StatusBadge(_sev(l, w.to), tone: BadgeTone.warn)),
                  ])),
                const SizedBox(height: SinaatySpace.lg),
              ],
              if (d.repaired.isNotEmpty) ...[
                SectionTitle(l.diffRepaired),
                SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm, vertical: SinaatySpace.xs),
                  child: Column(children: [for (final x in d.repaired) _DamageRow(d: x, tone: BadgeTone.seal, icon: Icons.build_circle_outlined)])),
                const SizedBox(height: SinaatySpace.lg),
              ],
              if (d.unchanged.isNotEmpty) ...[
                SectionTitle(l.diffUnchanged),
                SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm, vertical: SinaatySpace.xs),
                  child: Column(children: [for (final x in d.unchanged) _DamageRow(d: x, tone: BadgeTone.plain)])),
                const SizedBox(height: SinaatySpace.lg),
              ],
              SectionTitle(l.photos),
              SectionCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [Expanded(child: Text(l.diffCheckIn, style: t.titleSmall)), if (d.checkInAt != null) Text(Fmt.date(d.checkInAt!, locale: locale), style: t.bodySmall?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant))]),
                const SizedBox(height: SinaatySpace.sm),
                _PhotoStrip(count: d.checkInPhotos.length),
                const SizedBox(height: SinaatySpace.md),
                Row(children: [Expanded(child: Text(l.diffCheckOut, style: t.titleSmall)), if (d.checkOutAt != null) Text(Fmt.date(d.checkOutAt!, locale: locale), style: t.bodySmall?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant))]),
                const SizedBox(height: SinaatySpace.sm),
                d.comparable ? _PhotoStrip(count: d.checkOutPhotos.length) : Text(l.diffWaiting, style: t.bodySmall?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant)),
              ])),
            ],
          ),
        ),
      ),
    );
  }
}

/// The answer, before the details: green when nothing new happened, amber while waiting, red-tinted count
/// when something did. One glance, one sentence.
class _Verdict extends StatelessWidget {
  final InspectionDiff d;
  const _Verdict({required this.d});
  @override
  Widget build(BuildContext context) {
    final l = L10n.of(context);
    final t = Theme.of(context).textTheme;
    final issueCount = d.appeared.length + d.worsened.length;
    final (icon, title) = !d.comparable
        ? (Icons.hourglass_top, l.diffWaiting)
        : d.clean
            ? (Icons.verified_outlined, l.diffCleanTitle)
            : (Icons.error_outline, d.summaryAr);
    return SealCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(icon, color: Colors.white, size: 28),
        const SizedBox(width: SinaatySpace.md),
        Expanded(child: Text(title, style: t.titleLarge?.copyWith(color: Colors.white, height: 1.4))),
      ]),
      if (d.comparable && d.clean && d.repaired.isNotEmpty) ...[
        const SizedBox(height: SinaatySpace.sm),
        Text(d.summaryAr, style: t.bodySmall?.copyWith(color: Colors.white.withValues(alpha: .85))),
      ],
      if (issueCount > 0) ...[
        const SizedBox(height: SinaatySpace.md),
        Wrap(spacing: 8, children: [
          if (d.appeared.isNotEmpty) SealPill('${l.diffAppeared}: ${d.appeared.length}', icon: Icons.error_outline),
          if (d.worsened.isNotEmpty) SealPill('${l.diffWorsened}: ${d.worsened.length}', icon: Icons.trending_up),
        ]),
      ],
    ]));
  }
}

class _DamageRow extends StatelessWidget {
  final DamageEntry d;
  final BadgeTone tone;
  final IconData? icon;
  const _DamageRow({required this.d, required this.tone, this.icon});
  @override
  Widget build(BuildContext context) {
    final l = L10n.of(context);
    return AppListRow(
      icon: icon ?? Icons.report_gmailerrorred_outlined,
      title: d.zoneAr,
      subtitle: [if (d.noteAr != null && d.noteAr!.isNotEmpty) d.noteAr!, if (d.source == 'ai') l.diffAiSuggested].join(' · '),
      trailing: StatusBadge(_sev(l, d.severity), tone: tone),
    );
  }
}

String _sev(L10n l, String s) => switch (s) { 'minor' => l.sevMinor, 'moderate' => l.sevModerate, 'severe' => l.sevSevere, _ => s };

class _PhotoStrip extends StatelessWidget {
  final int count;
  const _PhotoStrip({required this.count});
  @override
  Widget build(BuildContext context) => count == 0
      ? Text('—', style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant))
      : SizedBox(height: 64, child: ListView.separated(
          scrollDirection: Axis.horizontal, itemCount: count,
          separatorBuilder: (_, _) => const SizedBox(width: 8),
          itemBuilder: (_, _) => Container(width: 64, decoration: BoxDecoration(color: Theme.of(context).colorScheme.surfaceContainerHighest, borderRadius: BorderRadius.circular(12)), child: Icon(Icons.photo_outlined, color: Theme.of(context).colorScheme.onSurfaceVariant))));
}
