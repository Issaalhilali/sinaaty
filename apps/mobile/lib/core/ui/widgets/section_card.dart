import 'package:flutter/material.dart';
import '../../theme/tokens.dart';
/// The card: soft paper, hairline, and a gentle two-layer shadow (concept: --shadow). Optional seal glow corner.
class SectionCard extends StatelessWidget {
  final Widget child; final EdgeInsetsGeometry padding; final VoidCallback? onTap; final bool glow;
  const SectionCard({super.key, required this.child, this.padding = const EdgeInsets.all(SinaatySpace.lg), this.onTap, this.glow = false});
  @override Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark; final s = Theme.of(context).colorScheme;
    return DecoratedBox(decoration: BoxDecoration(borderRadius: BorderRadius.circular(SinaatySpace.radiusLg), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: dark ? .35 : .05), blurRadius: 2, offset: const Offset(0, 1)), BoxShadow(color: (dark ? Colors.black : SinaatyColors.ink).withValues(alpha: dark ? .45 : .10), blurRadius: 28, spreadRadius: -12, offset: const Offset(0, 14))]),
      child: Card(clipBehavior: Clip.antiAlias, child: Stack(children: [
        if (glow) PositionedDirectional(end: -60, bottom: -60, child: IgnorePointer(child: Container(width: 220, height: 220, decoration: BoxDecoration(shape: BoxShape.circle, gradient: RadialGradient(colors: [s.primaryContainer.withValues(alpha: dark ? .55 : .9), s.primaryContainer.withValues(alpha: 0)], stops: const [0, .7]))))),
        InkWell(onTap: onTap, child: Padding(padding: padding, child: child)),
      ])));
  }
}
/// Eyebrow section title (concept .eyebrow): small, tracked, seal-colored — calm hierarchy without heavy headings.
class SectionTitle extends StatelessWidget {
  final String text; final Widget? trailing; const SectionTitle(this.text, {super.key, this.trailing});
  @override Widget build(BuildContext context) => Padding(padding: const EdgeInsets.only(bottom: SinaatySpace.sm, top: SinaatySpace.xs), child: Row(children: [Container(width: 3, height: 14, margin: const EdgeInsetsDirectional.only(end: 8), decoration: BoxDecoration(color: Theme.of(context).colorScheme.primary, borderRadius: BorderRadius.circular(2))), Expanded(child: Text(text, style: Theme.of(context).textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w700, letterSpacing: .2, color: Theme.of(context).colorScheme.onSurfaceVariant))), ?trailing]));
}
/// Money with a quiet currency: "1,368.50" big, "ر.س" small — numbers are the hero on financial screens.
class MoneyText extends StatelessWidget {
  final String formatted; final TextStyle? style; final bool hero;
  const MoneyText(this.formatted, {super.key, this.style, this.hero = false});
  @override Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme; final base = style ?? (hero ? t.headlineMedium : t.titleMedium)!; final parts = formatted.split(' ');
    final amount = parts.length > 1 ? (RegExp(r'^\d').hasMatch(parts.first) ? parts.first : parts.last) : formatted; final cur = parts.length > 1 ? (amount == parts.first ? parts.sublist(1).join(' ') : parts.sublist(0, parts.length - 1).join(' ')) : '';
    return Text.rich(TextSpan(children: [TextSpan(text: amount, style: base.copyWith(fontFeatures: const [FontFeature.tabularFigures()])), if (cur.isNotEmpty) TextSpan(text: ' $cur', style: base.copyWith(fontSize: (base.fontSize ?? 16) * .6, fontWeight: FontWeight.w500, color: style?.color != null ? style!.color!.withValues(alpha: .7) : Theme.of(context).colorScheme.onSurfaceVariant))]), textDirection: TextDirection.ltr, textAlign: TextAlign.start);
  }
}
/// Brand mark: seal square with a soft inner circle — used on home header, login, empty states.
class BrandMark extends StatelessWidget {
  final double size; const BrandMark({super.key, this.size = 36});
  @override Widget build(BuildContext context) { final s = Theme.of(context).colorScheme; return Container(width: size, height: size, decoration: BoxDecoration(color: s.primary, borderRadius: BorderRadius.circular(size * .3), boxShadow: [BoxShadow(color: s.primary.withValues(alpha: .35), blurRadius: 16, offset: const Offset(0, 6))]), child: Center(child: Container(width: size * .42, height: size * .42, decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: Colors.white.withValues(alpha: .9), width: size * .07))))); }
}
