import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/di/core_providers.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../domain/explore.dart';
import 'org_labels.dart';
import 'providers.dart';

/// ملف المنشأة للضيف — يرى الورشة كاملةً قبل أن يُطلب منه شيء: وجهها وتقييمها
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
          // وجه الورشة أولاً: حين توجد صورة تحمل هي الترويسة — لا لوحان أخضران فوق بعضهما.
          if (o.coverUrl != null)
            ClipRRect(borderRadius: BorderRadius.circular(SinaatySpace.radiusLg), child: Stack(children: [
              AspectRatio(aspectRatio: 16 / 9, child: Image.network(o.coverUrl!, fit: BoxFit.cover,
                  errorBuilder: (_, _, _) => Container(color: SinaatyColors.sealInk))),
              // ستارة سفلية: الاسم يُقرأ فوق أي صورة مهما كان لونها
              Positioned.fill(child: DecoratedBox(decoration: BoxDecoration(gradient: LinearGradient(
                  begin: Alignment.topCenter, end: Alignment.bottomCenter,
                  stops: const [0, .42, 1],
                  colors: [Colors.transparent, SinaatyColors.sealDeep.withValues(alpha: .55), SinaatyColors.sealDeep.withValues(alpha: .97)])))),
              PositionedDirectional(start: SinaatySpace.lg, end: SinaatySpace.lg, bottom: SinaatySpace.md,
                  child: _Head(o: o, l: l, t: t)),
            ]))
          else
            SealCard(child: _Head(o: o, l: l, t: t)),
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

/// ترويسة المنشأة — تُستعمل فوق الصورة وداخل البطاقة الختمية سواءً، فلا نسختان تفترقان.
class _Head extends StatelessWidget {
  final GuestOrgProfile o; final L10n l; final ThemeData t;
  const _Head({required this.o, required this.l, required this.t});
  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
        Text(o.nameAr, style: t.textTheme.titleLarge?.copyWith(color: Colors.white, fontWeight: FontWeight.w800), maxLines: 2, overflow: TextOverflow.ellipsis),
        const SizedBox(height: 4),
        Row(children: [
          Text(orgTypeLabel(l, o.type), style: t.textTheme.bodySmall?.copyWith(color: Colors.white.withValues(alpha: .78))),
          if (o.ratingCount > 0) ...[
            const SizedBox(width: 10),
            const Icon(Icons.star_rounded, size: 16, color: SinaatyColors.brass),
            const SizedBox(width: 3),
            Text(o.ratingAvg, style: t.textTheme.titleSmall?.copyWith(color: Colors.white, fontWeight: FontWeight.w700)),
            const SizedBox(width: 5),
            Text(l.guestRatingCount(o.ratingCount), style: t.textTheme.bodySmall?.copyWith(color: Colors.white.withValues(alpha: .62))),
          ] else ...[
            const SizedBox(width: 10),
            Text(l.exploreNew, style: t.textTheme.bodySmall?.copyWith(color: Colors.white.withValues(alpha: .78))),
          ],
        ]),
        const SizedBox(height: SinaatySpace.sm),
        Wrap(spacing: 6, runSpacing: 6, children: [
          if (o.verified) SealPill(l.guestVerified, icon: Icons.verified_outlined),
          SealPill(o.acceptingRequests ? l.guestAccepting : l.guestBusy,
              icon: o.acceptingRequests ? Icons.check_circle_outline : Icons.pause_circle_outline),
        ]),
      ]);
}
