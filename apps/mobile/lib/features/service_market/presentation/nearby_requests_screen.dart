import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/format/format.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../domain/service_request.dart';
import 'providers.dart';

/// The workshop's inbox of nearby repair requests (scope §1.ج): what broke, how far the car is,
/// and when the customer wants it — one tap from an offer.
class NearbyRequestsScreen extends ConsumerWidget {
  const NearbyRequestsScreen({super.key});
  @override Widget build(BuildContext context, WidgetRef ref) {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode;
    final v = ref.watch(nearbyServiceRequestsProvider);
    return AppScaffold(
      title: l.srNearby,
      body: AsyncResultView<List<ServiceRequest>>(value: v, onRetry: () => ref.invalidate(nearbyServiceRequestsProvider), builder: (list) => list.isEmpty
          ? EmptyState(icon: Icons.build_circle_outlined, title: l.srNoOffers.split(' —').first, body: '')
          : RefreshIndicator(onRefresh: () async => ref.invalidate(nearbyServiceRequestsProvider), child: ListView(padding: const EdgeInsets.fromLTRB(SinaatySpace.lg, SinaatySpace.md, SinaatySpace.lg, 96), children: [
              SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm), child: Column(children: [
                for (final r in list) AppListRow(
                  icon: Icons.build_outlined, title: r.titleAr,
                  subtitle: Fmt.meta([r.number, if (r.distanceText != null) r.distanceText, Fmt.date(r.createdAt, locale: locale)]),
                  trailing: StatusBadge(switch (r.preferredTime) { 'now' => l.srNow, 'this_week' => l.srThisWeek, _ => l.srToday }, tone: r.preferredTime == 'now' ? BadgeTone.brass : BadgeTone.plain),
                  onTap: () => context.push('/ws/service-requests/${r.id}'),
                ),
              ])),
            ]))),
    );
  }
}
