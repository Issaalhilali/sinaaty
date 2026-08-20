import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/format/format.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/l10n/labels.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../../work_orders/presentation/providers.dart';
import '../domain/vehicle.dart';
import 'providers.dart';
/// Car detail = the Car Passport: header, its repair orders, then the event timeline. "More" → share.
class VehicleScreen extends ConsumerWidget {
  final String id; const VehicleScreen({super.key, required this.id});
  @override Widget build(BuildContext context, WidgetRef ref) {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode; final p = ref.watch(passportProvider(id)); final orders = ref.watch(workOrdersProvider);
    return AppScaffold(title: p.value?.valueOrNull?.vehicle.title ?? l.carPassport,
      moreItems: [PopupMenuItem(value: 'share', child: Text(l.shareCarPassport))],
      onMore: (v) async { if (v != 'share') return; final r = await ref.read(vehiclesRepositoryProvider).shareLink(id); if (!context.mounted) return; r.when(ok: (url) async { await Clipboard.setData(ClipboardData(text: url)); if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(url))); }, err: (f) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(f.message(locale))))); },
      body: AsyncResultView<VehiclePassport>(value: p, onRetry: () => ref.invalidate(passportProvider(id)), builder: (pp) {
        final v = pp.vehicle; final mine = orders.value?.valueOrNull?.where((w) => w.vehicleId == id).toList() ?? [];
        return ListView(padding: const EdgeInsets.fromLTRB(SinaatySpace.lg, SinaatySpace.md, SinaatySpace.lg, SinaatySpace.xl), children: [
          SectionCard(glow: true, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(v.title, style: Theme.of(context).textTheme.headlineSmall), const SizedBox(height: 4),
            Wrap(spacing: 8, runSpacing: 4, children: [if (v.plate != null) StatusBadge(v.plate!), if (v.vin != null) StatusBadge('VIN ${v.vin}'), if (v.odometerKm != null) StatusBadge('${l.odometer} ${v.odometerKm} ${l.km}')]),
          ])),
          const SizedBox(height: SinaatySpace.xl), SectionTitle(l.activeOrders),
          if (mine.isEmpty) Text(l.noOrdersForCar, style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)) else SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm), child: Column(children: [for (final w in mine) AppListRow(icon: Icons.build_outlined, title: w.titleAr ?? w.number, subtitle: Fmt.meta([if (w.titleAr != null) w.number, Fmt.date(w.createdAt, locale: locale)]), trailing: StatusBadge(Labels.woStatus(l, w.status), tone: w.awaitingApproval ? BadgeTone.brass : BadgeTone.plain), onTap: () => context.push('/work-orders/${w.id}'))])),
          const SizedBox(height: SinaatySpace.xl), SectionTitle(l.carPassport),
          if (pp.events.isEmpty) Text(l.noPassportEvents, style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant))
          else SectionCard(child: StatusTimeline(steps: [for (final e in pp.events) TimelineStep(title: locale == 'ar' ? e.summaryAr : (e.summaryEn ?? e.summaryAr), subtitle: Fmt.meta([Fmt.date(e.occurredAt, locale: locale), e.orgNameAr, if (e.odometerKm != null) '${e.odometerKm} ${l.km}']), done: true)])),
        ]);
      }));
  }
}
