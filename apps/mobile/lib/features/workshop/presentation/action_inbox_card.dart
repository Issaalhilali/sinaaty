import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../../disputes/presentation/providers.dart' show myDisputesProvider;
import '../../parts/presentation/providers.dart' show incomingRequestsProvider;
import '../../service_market/presentation/providers.dart' as sm;
import '../domain/action_inbox.dart';
import 'providers.dart';

/// «ما يحتاجك الآن»: كل الأنظمة في قائمة واحدة مرتّبة بالإلحاح.
///
/// يُبنى مما تجلبه الشاشة أصلاً — لا نداء إضافي واحد — ولا يظهر إطلاقاً حين لا شيء ينتظر: بطاقة
/// فارغة تعلّم المستخدم أن يتجاهل المكان الذي يفترض أن يقوده.
class ActionInboxCard extends ConsumerWidget {
  const ActionInboxCard({super.key});

  @override Widget build(BuildContext context, WidgetRef ref) {
    final orders = ref.watch(orgOrdersProvider).value?.valueOrNull ?? const [];
    final disputes = ref.watch(myDisputesProvider).value?.valueOrNull ?? const [];
    final nearby = ref.watch(sm.nearbyServiceRequestsProvider).value?.valueOrNull ?? const [];
    final partReqs = ref.watch(incomingRequestsProvider).value?.valueOrNull ?? const [];

    final now = DateTime.now();
    final items = buildInbox(
      orderStatuses: [for (final o in orders) o.status],
      readyDaysWaiting: [for (final o in orders) if (o.status == 'ready') now.difference(o.createdAt).inDays],
      openDisputes: disputes.where((d) => !['resolved', 'closed', 'rejected'].contains(d.status)).length,
      nearbyServiceRequests: nearby.length,
      incomingPartRequests: partReqs.length,
      deliveredUninvoiced: 0,   // الفواتير تُقاس من شاشة المحفظة؛ لا نداء إضافي هنا
    );
    if (items.isEmpty) return const SizedBox.shrink();

    final l = L10n.of(context); final t = Theme.of(context).textTheme; final scheme = Theme.of(context).colorScheme;
    final urgent = inboxHasUrgent(items);
    return Padding(
      padding: const EdgeInsets.only(bottom: SinaatySpace.md),
      child: SectionCard(
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Row(children: [
            Icon(urgent ? Icons.priority_high_rounded : Icons.inbox_outlined, size: 18, color: urgent ? SinaatyColors.brass : SinaatyColors.seal),
            const SizedBox(width: 6),
            Expanded(child: Text(l.wsInbox, style: t.titleSmall)),
            Text(l.wsInboxCount(inboxTotal(items)), style: t.bodySmall?.copyWith(color: scheme.onSurfaceVariant)),
          ]),
          const SizedBox(height: 4),
          for (final i in items)
            InkWell(
              onTap: () => context.push(i.route),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 10),
                child: Row(children: [
                  StatusBadge('${i.count}', tone: _tone(i.kind)),
                  const SizedBox(width: 10),
                  Expanded(child: Text(_label(l, i.kind), style: t.bodyMedium)),
                  Icon(Icons.chevron_left, size: 18, color: scheme.onSurfaceVariant),
                ]),
              ),
            ),
        ]),
      ),
    );
  }

  BadgeTone _tone(InboxKind k) => switch (k) {
        InboxKind.dispute || InboxKind.abandonedRisk => BadgeTone.bad,
        InboxKind.awaitingApproval || InboxKind.readyToDeliver || InboxKind.unpaid => BadgeTone.warn,
        _ => BadgeTone.seal,
      };

  String _label(L10n l, InboxKind k) => switch (k) {
        InboxKind.dispute => l.wsInboxDisputes,
        InboxKind.abandonedRisk => l.wsInboxAbandonRisk,
        InboxKind.awaitingApproval => l.wsInboxAwaitingApproval,
        InboxKind.readyToDeliver => l.wsInboxReady,
        InboxKind.needsCheckout => l.wsInboxCheckout,
        InboxKind.serviceRequest => l.wsInboxServiceRequests,
        InboxKind.partBid => l.wsInboxPartBids,
        InboxKind.unpaid => l.wsInboxUnpaid,
      };
}
