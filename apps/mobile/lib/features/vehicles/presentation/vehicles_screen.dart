import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
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
          Text(l.activeOrders, style: Theme.of(context).textTheme.titleMedium), const SizedBox(height: SinaatySpace.sm),
          for (final w in active) WorkOrderCard(order: w, vehicle: list.where((v) => v.id == w.vehicleId).firstOrNull, onTap: () => context.push('/work-orders/${w.id}')),
          const SizedBox(height: SinaatySpace.lg),
        ],
        Text(l.myCars, style: Theme.of(context).textTheme.titleMedium), const SizedBox(height: SinaatySpace.sm),
        SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm, vertical: SinaatySpace.xs), child: Column(children: [for (final v in list) AppListRow(icon: Icons.directions_car_outlined, title: v.title, subtitle: v.subtitle, onTap: () => context.push('/vehicles/${v.id}'))])),
        const SizedBox(height: SinaatySpace.lg), Center(child: TextButton.icon(onPressed: () => context.push('/vehicles/add'), icon: const Icon(Icons.add), label: Text(l.addCar))),
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
    return SectionCard(onTap: onTap, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [Expanded(child: Text(order.titleAr ?? l.workOrder, style: t.titleMedium, maxLines: 1, overflow: TextOverflow.ellipsis)), StatusBadge(Labels.woStatus(l, order.status), tone: tone)]),
      const SizedBox(height: 4), Text([vehicle?.title, order.number].whereType<String>().where((x) => x.isNotEmpty).join(' · '), style: t.bodySmall?.copyWith(color: s.onSurfaceVariant)),
      if (order.awaitingApproval) ...[const SizedBox(height: SinaatySpace.md), SizedBox(width: double.infinity, child: PrimaryButton(label: l.approveNow, onPressed: onTap))],
    ]));
  }
}
