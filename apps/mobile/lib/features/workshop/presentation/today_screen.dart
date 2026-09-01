import 'action_inbox_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/format/format.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/l10n/labels.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../../../core/flags/feature_flags.dart';
import '../../service_market/domain/service_request.dart';
import '../../service_market/presentation/providers.dart' as sm;
import '../../work_orders/domain/work_order.dart';
import '../domain/workshop.dart';
import 'providers.dart';
/// «اليوم»: 3 numbers → the one order that needs the workshop's action now (SealCard) → today's cars. Primary: + new order.
class TodayScreen extends ConsumerWidget {
  const TodayScreen({super.key});
  @override Widget build(BuildContext context, WidgetRef ref) {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode; final orders = ref.watch(orgOrdersProvider); final wallet = ref.watch(orgWalletProvider); final pending = ref.watch(syncControllerProvider);
    return AsyncResultView<List<WorkOrder>>(value: orders, onRetry: () => ref.invalidate(orgOrdersProvider), builder: (all) {
      final active = all.where((w) => w.isActive).toList();
      final needs = active.where((w) => workshopNext.containsKey(w.status) || w.status == 'draft').toList()..sort((a, b) => _prio(a.status).compareTo(_prio(b.status)));
      final hero = needs.firstOrNull;
      // «صفرٌ» و«لم نعرف» ليسا سواءً في المال: رصيدٌ تعذّر جلبه كان يُعرض 0.00 فيظنّ صاحب
      // الورشة أن حسابه فارغ. الشرطة تقول «لا نعرف الآن»، والشريط أعلاه يقول لماذا.
      final availableValue = wallet.value?.valueOrNull?.available;
      if (all.isEmpty) return EmptyState(icon: Icons.build_outlined, title: l.wsNoOrders, body: l.wsNoOrdersBody, actionLabel: l.wsNewOrder, onAction: () => context.push('/ws/new'));
      return RefreshIndicator(onRefresh: () async { ref.invalidate(orgOrdersProvider); ref.invalidate(orgWalletProvider); await ref.read(orgOrdersProvider.future); }, child: ListView(padding: EdgeInsets.fromLTRB(SinaatySpace.lg, SinaatySpace.sm, SinaatySpace.lg, SinaatySpace.bottomClearance(context)), children: [
        // كل الأنظمة في صندوق واحد: ماذا ينتظرني؟ — وهو السؤال الذي يُفتح التطبيق من أجله.
        StaleNotice(sources: [orders, wallet], onRetry: () { ref.invalidate(orgOrdersProvider); ref.invalidate(orgWalletProvider); }),
        const ActionInboxCard(),
        // «الرهيبة تختصر»: المفتاح انتقل لقائمة ⋯ — ولا يظهر هنا إلا شريطُ الحالة التي
        // تستحق النظر: الاستقبال موقوف. صفحةٌ هادئة لا معرض مفاتيح (كلمة المالك).
        const AvailabilityBanner(),
        if (pending > 0) Padding(padding: const EdgeInsets.only(bottom: SinaatySpace.md), child: StatusBadge(l.wsPendingSync(pending), tone: BadgeTone.warn, icon: Icons.cloud_upload_outlined)),
        // Nearby repair requests (scope §1.ج) — the hot-request card pattern, behind its flag.
        if ((ref.watch(featureFlagsProvider(ref.watch(currentOrgIdProvider))).value ?? FeatureFlags.allVisible).enabled(Flags.serviceMarketplace))
          ...(() {
            final nearby = ref.watch(sm.nearbyServiceRequestsProvider).value?.valueOrNull ?? const <ServiceRequest>[];
            if (nearby.isEmpty) return const <Widget>[];
            return <Widget>[
              SealCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Expanded(child: Text(l.srNearbyCount(nearby.length), style: Theme.of(context).textTheme.titleLarge?.copyWith(color: Colors.white))),
                  SealPill(l.srNow, icon: Icons.bolt_outlined),
                ]),
                const SizedBox(height: 4),
                Text(nearby.first.titleAr, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.white.withValues(alpha: .8)), maxLines: 1, overflow: TextOverflow.ellipsis),
                const SizedBox(height: SinaatySpace.md),
                SealButton(label: l.srNearby, icon: Icons.local_offer_outlined, onPressed: () => context.push('/ws/service-requests')),
              ])),
              const SizedBox(height: SinaatySpace.md),
            ];
          })(),
        // «بانتظار اعتماد العميل» انتقل إلى صندوق «ما يحتاجك الآن» ومعه طريق إليه — ورقمٌ يُعرض مرتين
        // على شاشة واحدة ضجيج لا معلومة. يبقى هنا ما يُقرأ ولا يُفعل: كم سيارة عندي، وكم مالي جاهز.
        Row(children: [_Kpi(value: '${active.length}', label: l.wsInShop), const SizedBox(width: 10), _Kpi(value: availableValue == null ? '—' : Fmt.money(availableValue, locale: locale).split(' ').first.replaceAll(RegExp(r'\.00$'), ''), label: l.wsReadyToPayout)]),
        if (hero != null) ...[const SizedBox(height: SinaatySpace.md), _HeroAction(order: hero)],
        SectionTitle(l.wsTodayCars, trailing: TextButton(onPressed: () => context.push('/ws/orders'), child: Text(l.wsAll))),
        SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm), child: RowGroup(children: [for (final w in active.take(6)) AppListRow(icon: Icons.directions_car_outlined, title: w.carLine, subtitle: Fmt.meta([if (w.knowsCar) w.titleAr, Fmt.date(w.createdAt, locale: locale)]), trailing: StatusBadge(Labels.woStatus(l, w.status), tone: w.awaitingApproval ? BadgeTone.brass : w.status == 'ready' ? BadgeTone.seal : BadgeTone.plain), onTap: () => context.push('/ws/orders/${w.id}'))])),
      ]));
    });
  }
  static int _prio(String s) => switch (s) { 'approved' => 0, 'ready' => 1, 'quality_check' => 2, 'in_progress' => 3, 'received' => 4, 'draft' => 5, 'inspecting' => 6, _ => 9 };
}
class _Kpi extends StatelessWidget { final String value; final String label; const _Kpi({required this.value, required this.label}); @override Widget build(BuildContext context) => Expanded(child: SectionCard(padding: const EdgeInsets.fromLTRB(14, 12, 14, 12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(value, maxLines: 1, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 22, fontFeatures: const [FontFeature.tabularFigures()])), Text(label, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant), maxLines: 2)]))); }
class _HeroAction extends ConsumerWidget {
  final WorkOrder order; const _HeroAction({required this.order});
  @override Widget build(BuildContext context, WidgetRef ref) {
    final l = L10n.of(context); final t = Theme.of(context).textTheme;
    final (label, hint) = switch (order.status) { 'draft' => (l.wsReceive, l.wsInspect), 'received' => (l.wsInspect, l.wsAngles), 'inspecting' => (l.wsRequestApproval, l.wsWaitingCustomer), 'approved' || 'awaiting_parts' => (l.wsStart, l.wsCustomerApprovedHint), 'in_progress' => (l.wsQuality, ''), 'quality_check' => (l.wsReady, ''), 'ready' => (l.wsDeliver, ''), _ => (Labels.woStatus(l, order.status), '') };
    return Padding(padding: const EdgeInsets.only(bottom: SinaatySpace.sm), child: SealCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(order.carLine, style: t.titleLarge?.copyWith(color: Colors.white), maxLines: 1, overflow: TextOverflow.ellipsis), Text(Fmt.meta([l.wsNeedsAction, if (order.knowsCar) order.titleAr]), style: t.bodySmall?.copyWith(color: Colors.white.withValues(alpha: .75)), maxLines: 1, overflow: TextOverflow.ellipsis)])), SealPill(Labels.woStatus(l, order.status))]),
      if (hint.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 8), child: Text(hint, style: t.bodyMedium?.copyWith(color: Colors.white.withValues(alpha: .9)))),
      const SizedBox(height: SinaatySpace.lg), SealButton(label: label, onPressed: () => context.push('/ws/orders/${order.id}')),
    ])));
  }
}

/// شريط «الاستقبال موقوف» — يظهر فقط حين يكون موقوفاً، بزرّ عودةٍ في مكانه.
/// المفتاح نفسه في قائمة ⋯ (تشغيل/إيقاف) — الصفحة لا تحمل مفاتيح دائمة.
class AvailabilityBanner extends ConsumerStatefulWidget {
  const AvailabilityBanner({super.key});
  @override ConsumerState<AvailabilityBanner> createState() => _AvailabilityBannerState();
}

class _AvailabilityBannerState extends ConsumerState<AvailabilityBanner> {
  bool _busy = false;
  @override Widget build(BuildContext context) {
    final l = L10n.of(context); final t = Theme.of(context);
    final org = ref.watch(myOrgsProvider).value?.firstOrNull;
    if (org == null || org.acceptingRequests) return const SizedBox.shrink();
    return Padding(padding: const EdgeInsets.only(bottom: SinaatySpace.md), child: Container(
      padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.md, vertical: SinaatySpace.sm),
      decoration: BoxDecoration(color: SinaatyColors.warnSoft, borderRadius: BorderRadius.circular(SinaatySpace.radius)),
      child: Row(children: [
        const Icon(Icons.notifications_paused_outlined, size: 20, color: SinaatyColors.warn),
        const SizedBox(width: SinaatySpace.sm),
        Expanded(child: Text(l.avOff, style: t.textTheme.titleSmall?.copyWith(color: SinaatyColors.warn))),
        TextButton(
          onPressed: _busy ? null : () async {
            setState(() => _busy = true);
            final r = await ref.read(workshopRepositoryProvider).setAvailability(org.id, accepting: true);
            if (!mounted) return; setState(() => _busy = false);
            r.when(ok: (_) => ref.invalidate(myOrgsProvider), err: (f) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(f.message(Localizations.localeOf(context).languageCode)))));
          },
          child: Text(l.avResume),
        ),
      ]),
    ));
  }
}
