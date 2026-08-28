import 'package:flutter/material.dart';
import '../../theme/tokens.dart';
/// The one big obvious button per screen: seal fill with a soft seal-tinted shadow. Spinner while loading; never blocks the screen.
class PrimaryButton extends StatelessWidget {
  final String label; final VoidCallback? onPressed; final bool loading; final IconData? icon; final bool secondary;
  const PrimaryButton({super.key, required this.label, required this.onPressed, this.loading = false, this.icon, this.secondary = false});
  @override
  Widget build(BuildContext context) {
    final s = Theme.of(context).colorScheme;
    final child = loading ? SizedBox(height: 22, width: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: secondary ? s.primary : s.onPrimary)) : Row(mainAxisSize: MainAxisSize.min, children: [if (icon != null) ...[Icon(icon, size: 20), const SizedBox(width: 8)],
        // العنوان الطويل بخطٍّ عريض يلين بدل أن يفيض عن الزرّ بمخططٍ أصفر على الأجهزة الضيقة
        Flexible(child: Text(label, maxLines: 1, overflow: TextOverflow.ellipsis))]);
    if (secondary) return OutlinedButton(onPressed: loading ? null : onPressed, child: child);
    return DecoratedBox(decoration: BoxDecoration(borderRadius: BorderRadius.circular(SinaatySpace.radius), boxShadow: onPressed == null ? const [] : [BoxShadow(color: s.primary.withValues(alpha: .28), blurRadius: 18, offset: const Offset(0, 8))]), child: FilledButton(onPressed: loading ? null : onPressed, child: child));
  }
}
