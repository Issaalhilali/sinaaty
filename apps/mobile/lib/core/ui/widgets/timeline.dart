import 'package:flutter/material.dart';
import '../../theme/tokens.dart';
class TimelineStep { final String title; final String? subtitle; final bool done; final bool current; const TimelineStep({required this.title, this.subtitle, this.done = false, this.current = false}); }
/// Vertical status timeline — same look for work orders, notes, part orders.
class StatusTimeline extends StatelessWidget {
  final List<TimelineStep> steps; const StatusTimeline({super.key, required this.steps});
  @override Widget build(BuildContext context) {
    final s = Theme.of(context).colorScheme; final t = Theme.of(context).textTheme;
    return Column(children: [
      for (var i = 0; i < steps.length; i++)
        IntrinsicHeight(child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          SizedBox(width: 28, child: Column(children: [
            Container(width: 14, height: 14, margin: const EdgeInsets.only(top: 4), decoration: BoxDecoration(shape: BoxShape.circle, color: steps[i].done || steps[i].current ? s.primary : Colors.transparent, border: Border.all(color: steps[i].done || steps[i].current ? s.primary : s.outlineVariant, width: 2))),
            if (i < steps.length - 1) Expanded(child: Container(width: 2, color: steps[i].done ? s.primary : s.outlineVariant)),
          ])),
          const SizedBox(width: SinaatySpace.sm),
          Expanded(child: Padding(padding: const EdgeInsets.only(bottom: SinaatySpace.lg), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(steps[i].title, style: t.titleSmall?.copyWith(fontWeight: steps[i].current ? FontWeight.w700 : FontWeight.w500, color: steps[i].done || steps[i].current ? s.onSurface : s.onSurfaceVariant)),
            if (steps[i].subtitle != null) Text(steps[i].subtitle!, style: t.bodySmall?.copyWith(color: s.onSurfaceVariant)),
          ]))),
        ])),
    ]);
  }
}
