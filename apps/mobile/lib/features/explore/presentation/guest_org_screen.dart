import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/di/core_providers.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import 'org_labels.dart';
import 'providers.dart';

/// ملف المنشأة للضيف — يرى الورشة كاملةً قبل أن يُطلب منه شيء: اسمها وتقييمها
/// وتوثيقها وتخصصاتها وفروعها، وفعلٌ واحد في الأسفل: «سجّل لتطلب منها».
class GuestOrgScreen extends ConsumerWidget {
  final String id;
  const GuestOrgScreen({super.key, required this.id});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = L10n.of(context);
    final t = Theme.of(context);
    final p = ref.watch(guestOrgProvider(id));
    return AppScaffold(
      title: p.value?.nameAr ?? '',
      primaryAction: PrimaryButton(label: l.exploreOrgCta, icon: Icons.login,
          onPressed: () { ref.read(guestModeProvider.notifier).leave(); context.go('/login'); }),
      body: p.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, _) => EmptyState(glyph: BrandGlyph.carRepair, title: l.errorGeneric, body: '', actionLabel: l.retry, onAction: () => ref.invalidate(guestOrgProvider(id))),
        data: (o) => ListView(padding: EdgeInsets.fromLTRB(SinaatySpace.lg, SinaatySpace.sm, SinaatySpace.lg, SinaatySpace.bottomClearance(context)), children: [
          SealCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(o.nameAr, style: t.textTheme.titleLarge?.copyWith(color: Colors.white, fontWeight: FontWeight.w800)),
            const SizedBox(height: 4),
            Text(orgTypeLabel(l, o.type), style: t.textTheme.bodySmall?.copyWith(color: Colors.white.withValues(alpha: .75))),
            const SizedBox(height: SinaatySpace.md),
            Row(children: [
              if (o.ratingCount > 0) ...[
                const Icon(Icons.star_rounded, size: 18, color: SinaatyColors.brass),
                const SizedBox(width: 4),
                Text(o.ratingAvg, style: t.textTheme.titleMedium?.copyWith(color: Colors.white, fontWeight: FontWeight.w700)),
                const SizedBox(width: 6),
                Text(l.guestRatingCount(o.ratingCount), style: t.textTheme.bodySmall?.copyWith(color: Colors.white.withValues(alpha: .65))),
              ] else
                Text(l.exploreNew, style: t.textTheme.bodySmall?.copyWith(color: Colors.white.withValues(alpha: .75))),
            ]),
            const SizedBox(height: SinaatySpace.md),
            Wrap(spacing: 6, runSpacing: 6, children: [
              if (o.verified) SealPill(l.guestVerified, icon: Icons.verified_outlined),
              SealPill(o.acceptingRequests ? l.guestAccepting : l.guestBusy,
                  icon: o.acceptingRequests ? Icons.check_circle_outline : Icons.pause_circle_outline),
            ]),
          ])),
          if (o.descriptionAr != null && o.descriptionAr!.trim().isNotEmpty) ...[
            const SizedBox(height: SinaatySpace.lg),
            Text(o.descriptionAr!, style: t.textTheme.bodyMedium),
          ],
          if (o.specialties.isNotEmpty) ...[
            const SizedBox(height: SinaatySpace.lg),
            SectionTitle(l.guestSpecialties),
            Wrap(spacing: 6, runSpacing: 6, children: [
              for (final s in o.specialties) Chip(label: Text(s), visualDensity: VisualDensity.compact),
            ]),
          ],
          if (o.branches.isNotEmpty) ...[
            const SizedBox(height: SinaatySpace.lg),
            SectionTitle(l.guestBranches),
            SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm), child: Column(children: [
              for (final b in o.branches)
                AppListRow(
                  brandIcon: BrandGlyph.home,
                  title: b.nameAr?.isNotEmpty == true ? b.nameAr! : b.city,
                  subtitle: [b.city, if (b.district != null && b.district!.isNotEmpty) b.district!].join(' · '),
                  trailing: b.isPrimary ? StatusBadge(l.guestMainBranch, tone: BadgeTone.plain) : null,
                ),
            ])),
          ],
        ]),
      ),
    );
  }
}
