import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/format/format.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/l10n/labels.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../../billing/presentation/due_row.dart';
import '../../parts/domain/parts.dart';
import '../../parts/presentation/providers.dart';
import '../../service_market/domain/service_request.dart';
import '../../service_market/presentation/providers.dart' as sm;
import '../../transport/domain/transport.dart';
import '../../transport/presentation/providers.dart';
import '../../vehicles/domain/vehicle.dart';
import '../../vehicles/presentation/providers.dart';
import '../../vehicles/presentation/vehicles_screen.dart' show WorkOrderCard;
import '../../work_orders/domain/work_order.dart';
import '../../work_orders/presentation/providers.dart';

/// «طلباتي»: كل ما هو جارٍ في مكان واحد.
///
/// كان مبعثراً — أمر الإصلاح في «سياراتي»، وطلب القطعة والسطحة في «اطلب»، والفاتورة في «محفظتي».
/// فمن سأل «أين وصل طلبي؟» طاف على ثلاثة تبويبات. وهنا يجدها كلّها مرتّبةً بالأعجل.
class MyOrdersScreen extends ConsumerWidget {
  const MyOrdersScreen({super.key});

  @override Widget build(BuildContext context, WidgetRef ref) {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode;
    // المصادر تُراقَب مرةً كي يعرف الشريط أيّها سقط — الفراغُ عند الفشل كذبةٌ لا حالة.
    final vSrc = ref.watch(vehiclesProvider), oSrc = ref.watch(workOrdersProvider);
    final fSrc = ref.watch(sm.myServiceRequestsProvider), pSrc = ref.watch(myPartRequestsProvider), tSrc = ref.watch(myTowJobsProvider);
    final vehicles = vSrc.value?.valueOrNull ?? const <Vehicle>[];
    final orders = (oSrc.value?.valueOrNull ?? const <WorkOrder>[]).where((w) => w.isActive).toList()
      ..sort((a, b) => a.customerPriority.compareTo(b.customerPriority));
    final fixes = (fSrc.value?.valueOrNull ?? const <ServiceRequest>[]).where((r) => r.open).toList();
    final parts = (pSrc.value?.valueOrNull ?? const <PartRequest>[]).where((r) => r.open).toList();
    final tows = (tSrc.value?.valueOrNull ?? const <TransportJob>[]).where((j) => j.isLive).toList();

    Future<void> refresh() async {
      ref.invalidate(workOrdersProvider); ref.invalidate(sm.myServiceRequestsProvider);
      ref.invalidate(myPartRequestsProvider); ref.invalidate(myTowJobsProvider);
    }

    final empty = orders.isEmpty && fixes.isEmpty && parts.isEmpty && tows.isEmpty;
    return RefreshIndicator(onRefresh: refresh, child: ListView(
      padding: EdgeInsets.fromLTRB(SinaatySpace.lg, SinaatySpace.sm, SinaatySpace.lg, SinaatySpace.bottomClearance(context)),
      children: [
        StaleNotice(sources: [vSrc, oSrc, fSrc, pSrc, tSrc], onRetry: refresh),
        const DueRow(),
        if (empty)
          EmptyState(glyph: BrandGlyph.orders, title: l.myOrdersEmpty, body: l.myOrdersEmptyBody)
        else ...[
          // أمر الإصلاح أولاً: هو الوحيد الذي قد يطلب توقيعاً أو دفعاً الآن.
          if (orders.isNotEmpty) ...[
            SectionTitle(l.moRepairs),
            for (final w in orders)
              Padding(padding: const EdgeInsets.only(bottom: SinaatySpace.md),
                child: WorkOrderCard(order: w, vehicle: vehicles.where((v) => v.id == w.vehicleId).firstOrNull,
                    onTap: () => context.push('/work-orders/${w.id}'))),
          ],
          if (fixes.isNotEmpty) ...[
            SectionTitle(l.srMine),
            SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm), child: RowGroup(children: [
              for (final r in fixes) AppListRow(
                brandIcon: BrandGlyph.carRepair, title: r.titleAr,
                subtitle: Fmt.meta([r.number, Fmt.date(r.createdAt, locale: locale)]),
                trailing: StatusBadge('${r.offersCount}', tone: r.offersCount > 0 ? BadgeTone.brass : BadgeTone.plain, icon: Icons.local_offer_outlined),
                onTap: () => context.push('/service-requests/${r.id}')),
            ])),
            const SizedBox(height: SinaatySpace.lg),
          ],
          if (parts.isNotEmpty) ...[
            SectionTitle(l.moParts),
            SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm), child: RowGroup(children: [
              for (final r in parts) AppListRow(
                brandIcon: BrandGlyph.gear, title: r.partNameAr,
                subtitle: Fmt.meta([r.number, Fmt.date(r.createdAt, locale: locale)]),
                trailing: StatusBadge('${r.bidsCount}', tone: r.bidsCount > 0 ? BadgeTone.brass : BadgeTone.plain, icon: Icons.gavel_outlined),
                onTap: () => context.push('/parts/requests/${r.id}')),
            ])),
            const SizedBox(height: SinaatySpace.lg),
          ],
          if (tows.isNotEmpty) ...[
            SectionTitle(l.moTow),
            SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm), child: RowGroup(children: [
              for (final j in tows) AppListRow(
                brandIcon: BrandGlyph.towTruck, title: j.number,
                subtitle: Labels.transportStatus(l, j.status),
                onTap: () => context.push('/tow/${j.id}')),
            ])),
          ],
        ],
      ],
    ));
  }
}
