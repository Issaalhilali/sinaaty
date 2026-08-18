import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/format/format.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/l10n/labels.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../../work_orders/domain/work_order.dart';
import '../../work_orders/presentation/providers.dart';
import '../domain/vehicle.dart';
import 'providers.dart';
/// Tab «سياراتي»: current repair orders first (what matters now), then my cars. One primary action: add car.
class VehiclesScreen extends ConsumerWidget {
  const VehiclesScreen({super.key});
  @override Widget build(BuildContext context, WidgetRef ref) {
    final l = L10n.of(context); final vehicles = ref.watch(vehiclesProvider); final orders = ref.watch(workOrdersProvider);
    Future<void> refresh() async { ref.invalidate(vehiclesProvider); ref.invalidate(workOrdersProvider); }
    return AsyncResultView<List<Vehicle>>(value: vehicles, onRetry: refresh, builder: (list) {
      if (list.isEmpty) return EmptyState(icon: Icons.directions_car_outlined, title: l.emptyCarsTitle, body: l.emptyCarsBody, actionLabel: l.addCar, onAction: () => context.push('/vehicles/add'));
      final active = orders.value?.valueOrNull?.where((w) => w.isActive).toList() ?? const <WorkOrder>[];
      return RefreshIndicator(onRefresh: refresh, child: ListView(padding: const EdgeInsets.fromLTRB(SinaatySpace.lg, SinaatySpace.md, SinaatySpace.lg, 96), children: [
        if (active.isNotEmpty) ...[
          SectionTitle(l.activeOrders),
          for (final w in active) Padding(padding: const EdgeInsets.only(bottom: SinaatySpace.md), child: WorkOrderCard(order: w, vehicle: list.where((v) => v.id == w.vehicleId).firstOrNull, onTap: () => context.push('/work-orders/${w.id}'))),
          const SizedBox(height: SinaatySpace.sm),
        ],
        SectionTitle(l.myCars, trailing: TextButton.icon(onPressed: () => context.push('/vehicles/add'), icon: const Icon(Icons.add, size: 18), label: Text(l.addCar))),
        SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm, vertical: SinaatySpace.xs), child: Column(children: [for (final v in list) AppListRow(icon: Icons.directions_car_outlined, title: v.title, subtitle: v.subtitle, onTap: () => context.push('/vehicles/${v.id}'))])),
      ]));
    });
  }
}
/// One card = one order: title, status badge, next thing the customer must do (approve/pay) is obvious.
class WorkOrderCard extends StatelessWidget {
  final WorkOrder order; final Vehicle? vehicle; final VoidCallback onTap;
  const WorkOrderCard({super.key, required this.order, this.vehicle, required this.onTap});
  @override Widget build(BuildContext context) {
    final l = L10n.of(context); final t = Theme.of(context).textTheme; final s = Theme.of(context).colorScheme;
    final tone = switch (order.status) { 'awaiting_approval' => BadgeTone.brass, 'ready' || 'delivered' => BadgeTone.seal, 'cancelled' || 'disputed' => BadgeTone.bad, _ => BadgeTone.plain };
    final step = woFlow.indexOf(order.status == 'approved' || order.status == 'awaiting_parts' ? 'in_progress' : order.status);
    return SectionCard(onTap: onTap, glow: order.awaitingApproval, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(order.titleAr ?? l.workOrder, style: t.titleLarge, maxLines: 1, overflow: TextOverflow.ellipsis), const SizedBox(height: 2), Text([vehicle?.title, order.number].whereType<String>().where((x) => x.isNotEmpty).join(' · '), style: t.bodySmall?.copyWith(color: s.onSurfaceVariant))])), const SizedBox(width: 8), StatusBadge(Labels.woStatus(l, order.status), tone: tone)]),
      const SizedBox(height: SinaatySpace.lg),
      Row(children: [Expanded(child: ProgressDots(total: woFlow.length, done: step < 0 ? 0 : step + 1)), const SizedBox(width: SinaatySpace.md), MoneyText(Fmt.money(order.total, locale: Localizations.localeOf(context).languageCode))]),
      if (order.awaitingApproval) ...[const SizedBox(height: SinaatySpace.lg), SizedBox(width: double.infinity, child: PrimaryButton(label: l.approveNow, icon: Icons.verified_user_outlined, onPressed: onTap))],
    ]));
  }
}
