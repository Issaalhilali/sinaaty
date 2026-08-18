import 'package:flutter/material.dart';
import '../../theme/tokens.dart';
/// The one list row used everywhere: leading icon, title, subtitle, trailing (badge/amount), chevron.
class AppListRow extends StatelessWidget {
  final IconData? icon; final String title; final String? subtitle; final Widget? trailing; final VoidCallback? onTap;
  const AppListRow({super.key, this.icon, required this.title, this.subtitle, this.trailing, this.onTap});
  @override Widget build(BuildContext context) {
    final s = Theme.of(context).colorScheme; final t = Theme.of(context).textTheme;
    return InkWell(onTap: onTap, borderRadius: BorderRadius.circular(SinaatySpace.radius), child: Padding(padding: const EdgeInsets.symmetric(vertical: SinaatySpace.md, horizontal: SinaatySpace.sm), child: Row(children: [
      if (icon != null) ...[Container(width: 40, height: 40, decoration: BoxDecoration(color: s.primaryContainer, borderRadius: BorderRadius.circular(12)), child: Icon(icon, color: s.onPrimaryContainer, size: 22)), const SizedBox(width: SinaatySpace.md)],
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title, style: t.titleSmall, maxLines: 1, overflow: TextOverflow.ellipsis), if (subtitle != null) Text(subtitle!, style: t.bodySmall?.copyWith(color: s.onSurfaceVariant), maxLines: 2, overflow: TextOverflow.ellipsis)])),
      if (trailing != null) ...[const SizedBox(width: SinaatySpace.sm), trailing!],
      if (onTap != null) Icon(Icons.chevron_left, color: s.onSurfaceVariant, textDirection: Directionality.of(context) == TextDirection.rtl ? TextDirection.ltr : TextDirection.rtl),
    ])));
  }
}
/// Key/value line ("الإجمالي   1,368.50 ر.س").
class KeyValueRow extends StatelessWidget {
  final String label; final String value; final bool emphasized;
  const KeyValueRow(this.label, this.value, {super.key, this.emphasized = false});
  @override Widget build(BuildContext context) { final t = Theme.of(context).textTheme; final st = emphasized ? t.titleMedium?.copyWith(fontWeight: FontWeight.w700) : t.bodyMedium; return Padding(padding: const EdgeInsets.symmetric(vertical: 4), child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text(label, style: st), Text(value, style: st)])); }
}
