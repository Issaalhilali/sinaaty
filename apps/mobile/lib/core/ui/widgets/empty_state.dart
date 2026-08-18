import 'package:flutter/material.dart';
import '../../theme/tokens.dart';
import 'primary_button.dart';
/// Empty states teach (charter #7): icon, one line of why, one action.
class EmptyState extends StatelessWidget {
  final IconData icon; final String title; final String body; final String? actionLabel; final VoidCallback? onAction;
  const EmptyState({super.key, required this.icon, required this.title, required this.body, this.actionLabel, this.onAction});
  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    return Center(child: Padding(padding: const EdgeInsets.all(SinaatySpace.xxl), child: Column(mainAxisSize: MainAxisSize.min, children: [
      Container(width: 72, height: 72, decoration: BoxDecoration(color: t.colorScheme.primaryContainer, shape: BoxShape.circle), child: Icon(icon, color: t.colorScheme.onPrimaryContainer, size: 34)),
      const SizedBox(height: SinaatySpace.lg), Text(title, style: t.textTheme.titleLarge, textAlign: TextAlign.center),
      const SizedBox(height: SinaatySpace.sm), Text(body, style: t.textTheme.bodyMedium?.copyWith(color: t.colorScheme.onSurfaceVariant), textAlign: TextAlign.center),
      if (actionLabel != null) ...[const SizedBox(height: SinaatySpace.xl), SizedBox(width: 240, child: PrimaryButton(label: actionLabel!, onPressed: onAction))],
    ])));
  }
}
