import 'package:flutter/material.dart';
import '../../theme/tokens.dart';
enum BadgeTone { seal, brass, warn, bad, plain }
/// Trust/status badges: "موقّع بنفاذ", "مضمون بسند", "بانتظار اعتمادك" — pill with a small dot or icon, same look everywhere.
class StatusBadge extends StatelessWidget {
  final String label; final BadgeTone tone; final IconData? icon; final bool dot;
  const StatusBadge(this.label, {super.key, this.tone = BadgeTone.plain, this.icon, this.dot = false});
  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark; final s = Theme.of(context).colorScheme;
    final (bg, fg) = switch (tone) {
      BadgeTone.seal => (s.primaryContainer, s.onPrimaryContainer),
      BadgeTone.brass => (s.secondaryContainer, s.onSecondaryContainer),
      BadgeTone.warn => (dark ? const Color(0xFF3A2A10) : SinaatyColors.warnSoft, dark ? const Color(0xFFE5A03A) : SinaatyColors.warn),
      BadgeTone.bad => (dark ? const Color(0xFF3E1B18) : SinaatyColors.badSoft, dark ? const Color(0xFFE5716A) : SinaatyColors.bad),
      BadgeTone.plain => (s.surfaceContainerHighest, s.onSurfaceVariant),
    };
    return Container(padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 5), decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)), child: Row(mainAxisSize: MainAxisSize.min, children: [
      if (icon != null) ...[Icon(icon, size: 14, color: fg), const SizedBox(width: 5)] else if (dot || tone != BadgeTone.plain) ...[Container(width: 6, height: 6, decoration: BoxDecoration(shape: BoxShape.circle, color: fg)), const SizedBox(width: 6)],
      Text(label, style: TextStyle(color: fg, fontSize: 12.5, fontWeight: FontWeight.w700, height: 1.2)),
    ]));
  }
}
