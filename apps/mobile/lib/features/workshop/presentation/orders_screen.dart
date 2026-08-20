import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/format/format.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/l10n/labels.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../../work_orders/domain/work_order.dart';
import 'providers.dart';
class OrdersScreen extends ConsumerStatefulWidget { final bool standalone; const OrdersScreen({super.key, this.standalone = false}); @override ConsumerState<OrdersScreen> createState() => _OrdersScreenState(); }
class _OrdersScreenState extends ConsumerState<OrdersScreen> {
  String _filter = 'active';
  @override Widget build(BuildContext context) {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode; final orders = ref.watch(orgOrdersProvider);
    final body = AsyncResultView<List<WorkOrder>>(value: orders, onRetry: () => ref.invalidate(orgOrdersProvider), builder: (all) {
      final list = switch (_filter) { 'active' => all.where((w) => w.isActive).toList(), 'awaiting' => all.where((w) => w.awaitingApproval).toList(), _ => all.where((w) => !w.isActive).toList() };
      return Column(children: [
        Padding(padding: const EdgeInsets.fromLTRB(SinaatySpace.lg, SinaatySpace.sm, SinaatySpace.lg, 0), child: Row(children: [for (final f in [('active', l.wsActive), ('awaiting', l.statusAwaitingApproval), ('done', l.wsDone)]) Padding(padding: const EdgeInsetsDirectional.only(end: 8), child: ChoiceChip(label: Text(f.$2), selected: _filter == f.$1, onSelected: (_) => setState(() => _filter = f.$1), showCheckmark: false))])),
        Expanded(child: list.isEmpty ? EmptyState(icon: Icons.inbox_outlined, title: l.wsNoOrders, body: l.wsNoOrdersBody, actionLabel: l.wsNewOrder, onAction: () => context.push('/ws/new')) : ListView(padding: const EdgeInsets.fromLTRB(SinaatySpace.lg, SinaatySpace.md, SinaatySpace.lg, 110), children: [SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm), child: Column(children: [for (final w in list) AppListRow(icon: Icons.directions_car_outlined, title: w.titleAr ?? w.number, subtitle: Fmt.meta([w.number, Fmt.date(w.createdAt, locale: locale), Fmt.money(w.total, locale: locale)]), trailing: StatusBadge(Labels.woStatus(l, w.status), tone: w.awaitingApproval ? BadgeTone.brass : w.isActive ? BadgeTone.seal : BadgeTone.plain), onTap: () => context.push('/ws/orders/${w.id}'))]))])),
      ]);
    });
    return widget.standalone ? AppScaffold(title: l.wsOrders, body: body) : body;
  }
}
