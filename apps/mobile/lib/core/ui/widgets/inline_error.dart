import 'package:flutter/material.dart';
import '../../theme/tokens.dart';
/// Errors say what to do next (charter #7): message + retry, inline — never a blocking dialog.
class InlineError extends StatelessWidget {
  final String message; final String retryLabel; final VoidCallback? onRetry; final IconData icon;
  const InlineError({super.key, required this.message, required this.retryLabel, this.onRetry, this.icon = Icons.error_outline});
  @override Widget build(BuildContext context) => Center(child: Padding(padding: const EdgeInsets.all(SinaatySpace.xl), child: Column(mainAxisSize: MainAxisSize.min, children: [
    Icon(icon, color: Theme.of(context).colorScheme.onSurfaceVariant, size: 36), const SizedBox(height: SinaatySpace.md),
    Text(message, textAlign: TextAlign.center), if (onRetry != null) ...[const SizedBox(height: SinaatySpace.md), OutlinedButton(onPressed: onRetry, child: Text(retryLabel))],
  ])));
}
/// Non-blocking loading (charter #7).
class InlineLoading extends StatelessWidget { const InlineLoading({super.key}); @override Widget build(BuildContext context) => const Center(child: Padding(padding: EdgeInsets.all(SinaatySpace.xl), child: CircularProgressIndicator())); }
