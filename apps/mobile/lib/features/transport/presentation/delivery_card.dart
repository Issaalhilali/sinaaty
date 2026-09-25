import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/format/format.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/l10n/labels.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../domain/transport.dart';
import 'providers.dart';

/// The driver's journey as one card — the SAME four-step timeline the tow screen shows, reused
/// wherever something is being driven (a part order's platform delivery). Live on `transport:{id}`.
class DeliveryTrackingCard extends ConsumerWidget {
  final String jobId; final String number; final String status; final String? price; final String title;
  const DeliveryTrackingCard({super.key, required this.jobId, required this.number, required this.status, this.price, required this.title});

  @override Widget build(BuildContext context, WidgetRef ref) {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode;
    final t = Theme.of(context).textTheme; final scheme = Theme.of(context).colorScheme;
    // A part is not a car: the same journey, said in the right words.
    String step(String st) => st == 'picked_up' ? l.ptDeliveryPickedUp : Labels.transportStatus(l, st);
    final done = towSteps.indexWhere((s) => s == status);
    return SectionCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: t.titleSmall),
          Text(Fmt.meta([number, if (price != null) Fmt.money(price!, locale: locale)]), style: t.bodySmall?.copyWith(color: scheme.onSurfaceVariant)),
        ])),
        StatusBadge(step(status), tone: status == 'delivered' || status == 'completed' ? BadgeTone.seal : BadgeTone.brass),
      ]),
      const SizedBox(height: SinaatySpace.sm),
      StatusTimeline(steps: [
        for (var i = 0; i < towSteps.length; i++)
          TimelineStep(title: step(towSteps[i]), done: done >= i && done >= 0, current: done == i),
      ]),
    ]));
  }
}

/// Watching this keeps whatever shows a delivery live on the driver's channel.
final deliveryLiveProvider = StreamProvider.autoDispose.family<void, String>((ref, jobId) =>
    ref.watch(transportRealtimeProvider).changes(jobId));
