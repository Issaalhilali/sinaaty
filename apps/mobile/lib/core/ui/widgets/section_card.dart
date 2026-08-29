import 'dart:math' as math;
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
/// شعار صناعية v5 — **بوابة الصناعية**، اختيار المالك من ورقة معالم (2026-08-29):
/// قوس الكراج وبابُ الشرائح مرفوعاً نصفَه (الورشة مفتوحة تستقبل) والطريق يمر من تحته،
/// نحاسٌ على أخضر الختم. لا حرف ولا قرص ولا أسنان — أربع نسخ سبقتها لم تُرضِ المالك،
/// وردُّه الحاسم: «معلمٌ يبرز إلى الورش أو الصناعيات أو السيارات». تُطبع الأيقونات من
/// هذا الرسم نفسه (test/tool/icon_gen_test.dart → tool/gen_launcher_icons.sh).
class BrandMark extends StatelessWidget {
  final double size; const BrandMark({super.key, this.size = 36});
  @override Widget build(BuildContext context) => Container(
        width: size, height: size,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(size * .26),
          gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight,
              colors: [SinaatyColors.sealInk, SinaatyColors.sealDeep]),
          border: Border.all(color: const Color(0xFFC49A52).withValues(alpha: .45), width: math.max(1, size * .02)),
        ),
        child: const RepaintBoundary(child: CustomPaint(painter: GateMarkPainter(), size: Size.infinite)),
      );
}

/// رسم البوابة وحدها (نحاس على شفاف) — تستعمله الأيقونات التكيفية أيضاً.
class GateMarkPainter extends CustomPainter {
  const GateMarkPainter();
  @override void paint(Canvas c, Size s) {
    final w = s.width;
    Paint stroke(double sw) => Paint()
      ..style = PaintingStyle.stroke..strokeWidth = math.max(1.4, sw)..strokeCap = StrokeCap.round
      ..shader = const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight,
          colors: [Color(0xFFE2BC7A), Color(0xFFC49A52)]).createShader(Offset.zero & s);
    // القوس: بوابة الكراج
    final arch = Path()
      ..moveTo(w * .20, w * .735)
      ..lineTo(w * .20, w * .44)
      ..arcToPoint(Offset(w * .80, w * .44), radius: Radius.circular(w * .315))
      ..lineTo(w * .80, w * .735);
    c.drawPath(arch, stroke(w * .055));
    // شرائح الباب الملفوف — مرفوع نصفه: الورشة مفتوحة تستقبل، وتحتها فراغ الدخول
    for (var i = 0; i < 3; i++) {
      c.drawLine(Offset(w * .295, w * (.375 + .085 * i)), Offset(w * .705, w * (.375 + .085 * i)), stroke(w * .04));
    }
    // الأرض: الطريق يمتد أوسع من البوابة
    c.drawLine(Offset(w * .12, w * .78), Offset(w * .88, w * .78), stroke(w * .05));
  }
  @override bool shouldRepaint(covariant CustomPainter _) => false;
}
