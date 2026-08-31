import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/di/core_providers.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../domain/explore.dart';
import 'providers.dart';

/// استكشاف الضيف — أول ما يراه من قال «أستكشف أولاً»: الورش والمحلات الموثقة من حوله،
/// بتقييمها ومسافتها، وبحثٌ حي. لا يُطلب منه شيء؛ وكل فعلٍ حقيقي يقوده إلى التسجيل بلطف.
/// (متاجر التطبيقات تشترط هذا أصلاً: التصفح قبل الحساب لتطبيقات السوق.)
class ExploreScreen extends ConsumerStatefulWidget {
  const ExploreScreen({super.key});
  @override ConsumerState<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends ConsumerState<ExploreScreen> {
  final _q = TextEditingController();
  String _query = '';

  String _typeLabel(L10n l, String t) => switch (t) {
        'workshop' => l.orgWorkshop, 'scrapyard' => l.orgScrapyard, 'parts_dealer' => l.orgPartsDealer,
        'parts_distributor' => l.orgPartsDistributor, 'parts_brand_agent' => l.orgPartsBrandAgent, _ => l.orgOther };

  BrandGlyph _typeGlyph(String t) => switch (t) {
        'scrapyard' || 'parts_dealer' || 'parts_distributor' || 'parts_brand_agent' => BrandGlyph.gear,
        _ => BrandGlyph.carRepair };

  void _login() { ref.read(guestModeProvider.notifier).leave(); context.go('/login'); }

  String _meta(L10n l, NearbyOrg o) => [
        _typeLabel(l, o.type),
        if (o.city != null && o.city!.isNotEmpty) o.city!,
        // «كم» كانت مكتوبةً في الشيفرة، فتظهر عربيةً في الشاشة الإنجليزية
        if (o.distanceKm != null) l.kmAway(o.distanceKm!.toStringAsFixed(o.distanceKm! < 10 ? 1 : 0)),
      ].join(' · ');

  @override Widget build(BuildContext context) {
    final l = L10n.of(context);
    final t = Theme.of(context);
    final orgs = ref.watch(nearbyOrgsProvider(_query));
    return AppScaffold(
      title: l.exploreTitle,
      subtitle: l.exploreSubtitle,
      primaryAction: PrimaryButton(label: l.exploreCta, icon: Icons.login, onPressed: _login),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(SinaatySpace.lg, SinaatySpace.sm, SinaatySpace.lg, SinaatySpace.sm),
          child: TextField(
            controller: _q, textInputAction: TextInputAction.search,
            decoration: InputDecoration(hintText: l.exploreSearchHint, prefixIcon: const Icon(Icons.search, size: 20)),
            onSubmitted: (v) => setState(() => _query = v),
          ),
        ),
        Expanded(child: orgs.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (_, _) => EmptyState(glyph: BrandGlyph.carRepair, title: l.errorGeneric, body: '', actionLabel: l.retry, onAction: () => ref.invalidate(nearbyOrgsProvider(_query))),
          data: (list) => list.isEmpty
              ? EmptyState(glyph: BrandGlyph.carRepair, title: l.exploreEmpty, body: l.exploreEmptyBody)
              : RefreshIndicator(onRefresh: () async => ref.invalidate(nearbyOrgsProvider(_query)), child: ListView(
                  padding: EdgeInsets.fromLTRB(SinaatySpace.lg, 0, SinaatySpace.lg, SinaatySpace.bottomClearance(context)),
                  children: [
                    SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm), child: RowGroup(children: [
                      for (final o in list)
                        AppListRow(
                          leading: o.coverUrl != null
                              ? ClipRRect(borderRadius: BorderRadius.circular(14), child: Image.network(o.coverUrl!, width: 44, height: 44, fit: BoxFit.cover,
                                  errorBuilder: (_, _, _) => BrandIcon(_typeGlyph(o.type), size: 24)))
                              : null,
                          brandIcon: _typeGlyph(o.type),
                          title: o.nameAr,
                          subtitle: _meta(l, o),
                          trailing: o.ratingCount == 0
                              ? StatusBadge(l.exploreNew, tone: BadgeTone.plain)
                              : Row(mainAxisSize: MainAxisSize.min, children: [
                                  const Icon(Icons.star_rounded, size: 16, color: SinaatyColors.brass),
                                  const SizedBox(width: 3),
                                  Text(o.ratingAvg, style: t.textTheme.titleSmall),
                                ]),
                          onTap: () => context.push('/explore/org/${o.id}'),
                        ),
                    ])),
                  ])),
        )),
      ]),
    );
  }
}
