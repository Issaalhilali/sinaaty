import 'package:flutter/material.dart';
import '../../theme/tokens.dart';
class TimelineStep { final String title; final String? subtitle; final bool done; final bool current; const TimelineStep({required this.title, this.subtitle, this.done = false, this.current = false}); }
/// Vertical status timeline: done = filled seal dot with check, current = seal ring with soft halo, upcoming = hairline circle.
class StatusTimeline extends StatelessWidget {
  final List<TimelineStep> steps; const StatusTimeline({super.key, required this.steps});
  @override Widget build(BuildContext context) {
    final s = Theme.of(context).colorScheme; final t = Theme.of(context).textTheme;
    return Column(children: [
      for (var i = 0; i < steps.length; i++)
        IntrinsicHeight(child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          SizedBox(width: 32, child: Column(children: [
            _Dot(done: steps[i].done, current: steps[i].current),
            if (i < steps.length - 1) Expanded(child: Container(width: 2, margin: const EdgeInsets.symmetric(vertical: 3), decoration: BoxDecoration(borderRadius: BorderRadius.circular(1), color: steps[i].done ? s.primary : s.outlineVariant))),
          ])),
          const SizedBox(width: SinaatySpace.md),
          Expanded(child: Padding(padding: EdgeInsets.only(bottom: i < steps.length - 1 ? SinaatySpace.lg : 0, top: 1), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(steps[i].title, style: t.titleSmall?.copyWith(fontWeight: steps[i].current ? FontWeight.w700 : FontWeight.w600, color: steps[i].done || steps[i].current ? s.onSurface : s.onSurfaceVariant.withValues(alpha: .8))),
            if (steps[i].subtitle != null) Padding(padding: const EdgeInsets.only(top: 2), child: Text(steps[i].subtitle!, style: t.bodySmall?.copyWith(color: s.onSurfaceVariant))),
          ]))),
        ])),
    ]);
  }
}
class _Dot extends StatelessWidget {
  final bool done; final bool current; const _Dot({required this.done, required this.current});
  @override Widget build(BuildContext context) {
    final s = Theme.of(context).colorScheme;
    if (current) return Container(width: 22, height: 22, decoration: BoxDecoration(shape: BoxShape.circle, color: s.primaryContainer), child: Center(child: Container(width: 12, height: 12, decoration: BoxDecoration(shape: BoxShape.circle, color: s.primary, boxShadow: [BoxShadow(color: s.primary.withValues(alpha: .4), blurRadius: 8)]))));
    if (done) return Container(width: 22, height: 22, decoration: BoxDecoration(shape: BoxShape.circle, color: s.primary), child: Icon(Icons.check, size: 14, color: s.onPrimary));
    return Container(width: 22, height: 22, decoration: BoxDecoration(shape: BoxShape.circle, color: s.surface, border: Border.all(color: s.outlineVariant, width: 2)));
  }
}
/// Compact progress (e.g. 3 of 8 steps) for cards.
class ProgressDots extends StatelessWidget {
  final int total; final int done; const ProgressDots({super.key, required this.total, required this.done});
  @override Widget build(BuildContext context) { final s = Theme.of(context).colorScheme; return Row(children: [for (var i = 0; i < total; i++) Expanded(child: Container(height: 4, margin: EdgeInsetsDirectional.only(end: i < total - 1 ? 4 : 0), decoration: BoxDecoration(borderRadius: BorderRadius.circular(2), color: i < done ? s.primary : s.outlineVariant)))]); }
}
