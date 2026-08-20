import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/format/format.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/l10n/labels.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../domain/parts.dart';
import 'providers.dart';

/// «ضماناتي» — every part installed through Sinaaty, with the one fact that matters on each row:
/// is it still covered, and until when.
class WarrantiesScreen extends ConsumerWidget {
  const WarrantiesScreen({super.key});

  void _details(BuildContext context, Warranty w) {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode;
    showModalBottomSheet<void>(context: context, showDragHandle: true, builder: (ctx) => Padding(
      padding: const EdgeInsets.fromLTRB(SinaatySpace.lg, 0, SinaatySpace.lg, SinaatySpace.xl),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text(w.coverageAr.isEmpty ? Labels.covers(l, w.covers) : w.coverageAr, style: Theme.of(ctx).textTheme.titleLarge),
        const SizedBox(height: SinaatySpace.md),
        KeyValueRow(l.ptWarrantyNumber, w.number),
        KeyValueRow(l.ptWarranties, Labels.covers(l, w.covers)),
        if (w.issuerAr != null) KeyValueRow(l.ptWarrantyIssuer, w.issuerAr!),
        KeyValueRow(l.ptWarrantyFrom, Fmt.date(w.startsAt, locale: locale)),
        KeyValueRow(w.valid ? l.ptValidUntil(Fmt.date(w.endsAt, locale: locale)) : l.ptExpired, Fmt.date(w.endsAt, locale: locale), emphasized: true),
      ]),
    ));
  }

  @override Widget build(BuildContext context, WidgetRef ref) {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode;
    final v = ref.watch(warrantiesProvider);
    void refresh() => ref.invalidate(warrantiesProvider);
    return AppScaffold(
      title: l.ptWarranties,
      body: AsyncResultView<List<Warranty>>(value: v, onRetry: refresh, builder: (list) {
        if (list.isEmpty) return EmptyState(icon: Icons.verified_outlined, title: l.ptWarrantiesEmptyTitle, body: l.ptWarrantiesEmptyBody);
        final active = list.where((w) => w.valid).toList();
        final past = list.where((w) => !w.valid).toList();
        Widget row(Warranty w) => AppListRow(
          icon: w.valid ? Icons.verified_outlined : Icons.history,
          title: w.coverageAr.isEmpty ? Labels.covers(l, w.covers) : w.coverageAr,
          subtitle: Fmt.meta([w.number, w.issuerAr]),
          trailing: StatusBadge(w.valid ? l.ptValidUntil(Fmt.date(w.endsAt, locale: locale)) : l.ptExpired, tone: w.valid ? BadgeTone.seal : BadgeTone.plain),
          onTap: () => _details(context, w),
        );
        return RefreshIndicator(onRefresh: () async => refresh(), child: ListView(
          padding: const EdgeInsets.fromLTRB(SinaatySpace.lg, SinaatySpace.md, SinaatySpace.lg, SinaatySpace.xl),
          children: [
            if (active.isNotEmpty) ...[
              SectionTitle(l.ptWarrantyActive),
              SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm), child: Column(children: [for (final w in active) row(w)])),
              const SizedBox(height: SinaatySpace.lg),
            ],
            if (past.isNotEmpty) ...[
              SectionTitle(l.ptExpired),
              SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm), child: Column(children: [for (final w in past) row(w)])),
            ],
          ],
        ));
      }),
    );
  }
}
