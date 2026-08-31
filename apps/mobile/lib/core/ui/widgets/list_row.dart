import 'package:flutter/material.dart';
import '../../theme/tokens.dart';
import 'brand_icons.dart';
/// The one list row used everywhere: leading icon, title, subtitle, trailing (badge/amount), chevron.
class AppListRow extends StatelessWidget {
  final IconData? icon; final BrandGlyph? brandIcon; final Widget? leading; final String title; final String? subtitle; final Widget? trailing; final VoidCallback? onTap;
  const AppListRow({super.key, this.icon, this.brandIcon, this.leading, required this.title, this.subtitle, this.trailing, this.onTap});
  @override Widget build(BuildContext context) {
    final s = Theme.of(context).colorScheme; final t = Theme.of(context).textTheme;
    return InkWell(onTap: onTap, borderRadius: BorderRadius.circular(SinaatySpace.radius), child: Padding(padding: const EdgeInsets.symmetric(vertical: SinaatySpace.md, horizontal: SinaatySpace.sm), child: Row(children: [
      if (leading != null) ...[leading!, const SizedBox(width: SinaatySpace.md)]
      else if (icon != null || brandIcon != null) ...[Container(width: 44, height: 44, alignment: Alignment.center, decoration: BoxDecoration(color: s.primaryContainer.withValues(alpha: .8), borderRadius: BorderRadius.circular(14)), child: brandIcon != null ? BrandIcon(brandIcon!, size: 24, color: s.onPrimaryContainer) : Icon(icon, color: s.onPrimaryContainer, size: 22)), const SizedBox(width: SinaatySpace.md)],
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title, style: t.titleSmall, maxLines: 1, overflow: TextOverflow.ellipsis), if (subtitle != null) Text(subtitle!, style: t.bodySmall?.copyWith(color: s.onSurfaceVariant), maxLines: 2, overflow: TextOverflow.ellipsis)])),
      // الذيل (شارة/مبلغ) يلين حين يضيق الصف — عنوانٌ وشارةٌ عريضان بالخط الجديد كانا يفيضان مخططاً
      if (trailing != null) ...[const SizedBox(width: SinaatySpace.sm), Flexible(child: trailing!)],
      if (onTap != null) Icon(Icons.chevron_left, size: 20, color: s.onSurfaceVariant.withValues(alpha: .6), textDirection: Directionality.of(context) == TextDirection.rtl ? TextDirection.ltr : TextDirection.rtl),
    ])));
  }
}
/// Key/value line ("الإجمالي   1,368.50 ر.س").
class KeyValueRow extends StatelessWidget {
  final String label; final String value; final bool emphasized;
  const KeyValueRow(this.label, this.value, {super.key, this.emphasized = false});
  @override Widget build(BuildContext context) { final t = Theme.of(context).textTheme; final st = emphasized ? t.titleMedium?.copyWith(fontWeight: FontWeight.w700) : t.bodyMedium; return Padding(padding: const EdgeInsets.symmetric(vertical: 4), child: Row(children: [
      // العنوان يلين والقيمة لا تُكسر: عنوانٌ طويل («ضريبة القيمة المضافة 15%») بخطٍّ عريض كان
      // يفيض عن الصف مخططاً أصفر — القيمة رقمٌ يجب أن يُقرأ كاملاً، والعنوان هو من يتوسّط أسطراً.
      Expanded(child: Text(label, style: st)),
      const SizedBox(width: 12),
      Flexible(child: Text(value, style: st, textAlign: TextAlign.end)),
    ])); }
}
