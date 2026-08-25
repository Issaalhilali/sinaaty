import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/flags/feature_flags.dart';
import '../../../core/format/format.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/l10n/labels.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../../parts/domain/parts.dart';
import '../../parts/presentation/part_request_sheet.dart';
import '../../parts/presentation/providers.dart';
import '../../service_market/domain/service_request.dart';
import '../../service_market/presentation/fix_car_sheet.dart';
import '../../service_market/presentation/providers.dart' as sm;
import '../../transport/domain/transport.dart';
import '../../transport/presentation/providers.dart';
import '../../vehicles/domain/vehicle.dart';
import '../../vehicles/presentation/providers.dart';

/// Customer tab «اطلب»: two things a customer actually asks for — a part, or a tow.
/// Everything else the customer needs already lives in سياراتي / محفظتي (charter §5.0 #2, #3).
class RequestHubScreen extends ConsumerWidget {
  const RequestHubScreen({super.key});

  @override Widget build(BuildContext context, WidgetRef ref) {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode; final t = Theme.of(context).textTheme;
    // Watched (not read) so the car list is loaded before the request sheet opens.
    final vehicles = ref.watch(vehiclesProvider).value?.valueOrNull ?? const <Vehicle>[];
    final requests = ref.watch(myPartRequestsProvider).value?.valueOrNull ?? const <PartRequest>[];
    final tows = ref.watch(myTowJobsProvider).value?.valueOrNull ?? const <TransportJob>[];
    // Flags hide entry points only (charter §5.0 #3); the server enforces regardless.
    final flags = ref.watch(featureFlagsProvider(null)).value ?? FeatureFlags.allVisible;
    final towOn = flags.enabled(Flags.tow); final partsOn = flags.enabled(Flags.partsMarketplace);
    final fixOn = flags.enabled(Flags.serviceMarketplace);
    final fixes = fixOn ? (ref.watch(sm.myServiceRequestsProvider).value?.valueOrNull ?? const <ServiceRequest>[]) : const <ServiceRequest>[];
    final liveTow = towOn ? tows.where((j) => j.isLive).firstOrNull : null;

    return RefreshIndicator(
      onRefresh: () async { ref.invalidate(myPartRequestsProvider); ref.invalidate(myTowJobsProvider); },
      child: ListView(padding: EdgeInsets.fromLTRB(SinaatySpace.lg, SinaatySpace.sm, SinaatySpace.lg, SinaatySpace.bottomClearance(context)), children: [
        if (liveTow != null) ...[
          SealCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(Labels.transportStatus(l, liveTow.status), style: t.titleLarge?.copyWith(color: Colors.white)),
                Text(liveTow.number, style: t.bodySmall?.copyWith(color: Colors.white.withValues(alpha: .75))),
              ])),
              if (liveTow.etaMinutes != null) SealPill(l.towEta(liveTow.etaMinutes!), icon: Icons.timer_outlined),
            ]),
            const SizedBox(height: SinaatySpace.md),
            MoneyText(Fmt.money(liveTow.price, locale: locale), hero: true, style: t.headlineMedium?.copyWith(color: Colors.white)),
            const SizedBox(height: SinaatySpace.lg),
            SealButton(label: l.towProgress, icon: Icons.local_shipping_outlined, onPressed: () => context.push('/tow/${liveTow.id}')),
          ])),
          const SizedBox(height: SinaatySpace.lg),
        ] else ...[
          Text(l.reqHubTitle, style: t.headlineSmall),
          const SizedBox(height: 4),
          Text(l.reqHubBody, style: t.bodyMedium?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant)),
          const SizedBox(height: SinaatySpace.lg),
        ],
        if (fixOn) ...[
          _Choice(icon: Icons.build_outlined, title: l.srFix, body: l.srFixBody, onTap: () => openFixCarSheet(context, ref, vehicles)),
          if (partsOn || towOn) const SizedBox(height: SinaatySpace.md),
        ],
        if (partsOn) _Choice(icon: Icons.settings_input_component_outlined, title: l.reqPart, body: l.reqPartBody, onTap: () => openPartRequestSheet(context, ref, vehicles)),
        if (partsOn && towOn) const SizedBox(height: SinaatySpace.md),
        if (towOn) _Choice(icon: Icons.local_shipping_outlined, title: l.reqTow, body: l.reqTowBody, onTap: () => context.push('/tow/new')),
        if (fixes.isNotEmpty) ...[
          const SizedBox(height: SinaatySpace.xl), SectionTitle(l.srMine),
          SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm), child: Column(children: [
            for (final r in fixes.take(5)) AppListRow(
              icon: Icons.build_outlined, title: r.titleAr,
              subtitle: Fmt.meta([r.number, Fmt.date(r.createdAt, locale: locale)]),
              trailing: StatusBadge('${r.offersCount}', tone: r.offersCount > 0 ? BadgeTone.brass : BadgeTone.plain, icon: Icons.local_offer_outlined),
              onTap: () => context.push('/service-requests/${r.id}'),
            ),
          ])),
        ],
        if (partsOn && requests.isNotEmpty) ...[
          const SizedBox(height: SinaatySpace.xl), SectionTitle(l.reqMyRequests),
          SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm), child: Column(children: [
            for (final r in requests.take(5)) AppListRow(
              icon: Icons.gavel_outlined, title: r.partNameAr,
              subtitle: Fmt.meta([r.number, r.open ? l.ptEndsIn(r.remaining.inMinutes.clamp(0, 99999)) : l.ptEnded]),
              trailing: StatusBadge(r.bidsCount > 0 ? l.ptBidsCount(r.bidsCount) : l.ptNoBidsYet.split(' —').first, tone: r.bidsCount > 0 ? BadgeTone.brass : BadgeTone.plain),
              onTap: () => context.push('/parts/requests/${r.id}'),
            ),
          ])),
        ],
        if (towOn && tows.isNotEmpty) ...[
          const SizedBox(height: SinaatySpace.xl), SectionTitle(l.reqMyTows),
          SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm), child: Column(children: [
            for (final j in tows.take(5)) AppListRow(
              icon: Icons.local_shipping_outlined, title: Labels.transportStatus(l, j.status),
              subtitle: Fmt.meta([j.number, Fmt.date(j.createdAt, locale: locale)]),
              trailing: Text(Fmt.money(j.price, locale: locale), style: const TextStyle(fontWeight: FontWeight.w600)),
              onTap: () => context.push('/tow/${j.id}'),
            ),
          ])),
        ],
      ]),
    );
  }
}

class _Choice extends StatelessWidget {
  final IconData icon; final String title; final String body; final VoidCallback onTap;
  const _Choice({required this.icon, required this.title, required this.body, required this.onTap});
  @override Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme; final s = Theme.of(context).colorScheme;
    return SectionCard(onTap: onTap, child: Row(children: [
      Container(width: 52, height: 52, decoration: BoxDecoration(color: s.primaryContainer, borderRadius: BorderRadius.circular(16)), child: Icon(icon, color: s.onPrimaryContainer)),
      const SizedBox(width: SinaatySpace.md),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: t.titleMedium),
        const SizedBox(height: 2),
        Text(body, style: t.bodySmall?.copyWith(color: s.onSurfaceVariant)),
      ])),
      Icon(Icons.chevron_left, color: s.onSurfaceVariant),
    ]));
  }
}
