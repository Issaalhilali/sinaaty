import 'package:flutter/material.dart';
import '../../theme/tokens.dart';
enum BadgeTone { seal, brass, warn, bad, plain }
/// Trust badges: "موقّع بنفاذ", "مضمون بسند", "أصلي موثّق" — same look everywhere.
class StatusBadge extends StatelessWidget {
  final String label; final BadgeTone tone; final IconData? icon;
  const StatusBadge(this.label, {super.key, this.tone = BadgeTone.plain, this.icon});
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
    return Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3), decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)), child: Row(mainAxisSize: MainAxisSize.min, children: [if (icon != null) ...[Icon(icon, size: 13, color: fg), const SizedBox(width: 4)], Text(label, style: TextStyle(color: fg, fontSize: 12.5, fontWeight: FontWeight.w600))]));
  }
}
