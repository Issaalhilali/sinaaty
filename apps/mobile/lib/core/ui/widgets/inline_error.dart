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
/// التحميل هيكلٌ لا دوّار: الشاشة تحتفظ بشكلها (بطل + ثلاثة صفوف) فلا «يقفز» المحتوى حين يصل،
/// ولا يحجب الانتظارُ الشاشةَ كلها (ميثاق §5.0/7). ساكن عمداً — لا shimmer — احتراماً لتقليل الحركة.
class InlineLoading extends StatelessWidget {
  final bool hero; const InlineLoading({super.key, this.hero = true});
  @override Widget build(BuildContext context) {
    final c = Theme.of(context).colorScheme.surfaceContainerHighest;
    Widget block(double h, {double w = double.infinity, double r = 8}) => Container(height: h, width: w, decoration: BoxDecoration(color: c, borderRadius: BorderRadius.circular(r)));
    return Semantics(label: 'loading', child: Padding(padding: const EdgeInsets.fromLTRB(SinaatySpace.lg, SinaatySpace.md, SinaatySpace.lg, SinaatySpace.lg), child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      if (hero) ...[block(150, r: SinaatySpace.radiusHero), const SizedBox(height: SinaatySpace.xl)],
      block(14, w: 120), const SizedBox(height: SinaatySpace.md),
      for (var i = 0; i < 3; i++) ...[Row(children: [block(44, w: 44, r: 12), const SizedBox(width: SinaatySpace.md), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [block(14, w: 160), const SizedBox(height: 6), block(12, w: 100)]))]), const SizedBox(height: SinaatySpace.lg)],
    ])));
  }
}
