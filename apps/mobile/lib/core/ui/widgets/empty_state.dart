import 'package:flutter/material.dart';
import '../../theme/tokens.dart';
import 'brand_icons.dart';
import 'primary_button.dart';
/// Empty states teach (charter #7): layered soft discs + icon, one line of why, one action.
class EmptyState extends StatelessWidget {
  final IconData icon; final BrandGlyph? glyph; final String title; final String body; final String? actionLabel; final VoidCallback? onAction;
  const EmptyState({super.key, this.icon = Icons.inbox_outlined, this.glyph, required this.title, required this.body, this.actionLabel, this.onAction});
  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context); final s = t.colorScheme;
    return Center(child: Padding(padding: const EdgeInsets.all(SinaatySpace.xxl), child: Column(mainAxisSize: MainAxisSize.min, children: [
      SizedBox(width: 132, height: 132, child: Stack(alignment: Alignment.center, children: [
        Container(width: 132, height: 132, decoration: BoxDecoration(shape: BoxShape.circle, color: s.primaryContainer.withValues(alpha: .35))),
        Container(width: 96, height: 96, decoration: BoxDecoration(shape: BoxShape.circle, color: s.primaryContainer.withValues(alpha: .6))),
        Container(width: 64, height: 64, decoration: BoxDecoration(shape: BoxShape.circle, color: s.primary, boxShadow: [BoxShadow(color: s.primary.withValues(alpha: .35), blurRadius: 18, offset: const Offset(0, 8))]), child: glyph != null ? Center(child: BrandIcon(glyph!, size: 34, color: s.onPrimary, accent: Colors.white.withValues(alpha: .85))) : Icon(icon, color: s.onPrimary, size: 30)),
      ])),
      const SizedBox(height: SinaatySpace.xl), Text(title, style: t.textTheme.titleLarge, textAlign: TextAlign.center),
      if (body.isNotEmpty) ...[const SizedBox(height: SinaatySpace.sm), Text(body, style: t.textTheme.bodyMedium?.copyWith(color: s.onSurfaceVariant), textAlign: TextAlign.center)],
      if (actionLabel != null) ...[const SizedBox(height: SinaatySpace.xl), SizedBox(width: 240, child: PrimaryButton(label: actionLabel!, onPressed: onAction))],
    ])));
  }
}
