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
/// شعار صناعية v4: **قرص الطريق** — دائرة نحاسية وخطُّ طريقٍ أبيض يصعد، ونقطةُ انطلاق.
///
/// لا حرف ولا سداسي ولا أسنان (ثلاث نسخ لم تُرضِ المالك): علامةٌ مجرّدة من جوهر الوعد —
/// «من العطل إلى الطريق». النحاس لون الصنعة في هويتنا، والقوس الصاعد طريقُ العودة، والنقطة
/// سيارتُك عند أوله. تُقرأ من 24px، وتتبدّل في كل الشاشات من هذا المكوّن وحده.
class BrandMark extends StatelessWidget {
  final double size; const BrandMark({super.key, this.size = 36});
  @override Widget build(BuildContext context) =>
      SizedBox(width: size, height: size, child: const RepaintBoundary(child: CustomPaint(painter: _RoadMarkPainter())));
}

class _RoadMarkPainter extends CustomPainter {
  const _RoadMarkPainter();
  @override void paint(Canvas c, Size s) {
    final center = Offset(s.width / 2, s.height / 2); final r = s.width / 2;
    // القرص النحاسي — تدرّج معدني هادئ (لا drawShadow: يجمّد canvaskit على الوِب)
    c.drawCircle(center, r, Paint()..shader = const RadialGradient(center: Alignment(-.4, -.5), radius: 1.2,
        colors: [Color(0xFFE2BC7A), Color(0xFFC49A52), Color(0xFF97702C)], stops: [0, .45, 1]).createShader(Offset.zero & s));
    c.drawCircle(center, r * .97, Paint()..style = PaintingStyle.stroke..strokeWidth = math.max(1, s.width * .028)..color = Colors.white.withValues(alpha: .35));
    // خط الطريق: قوسٌ أبيض يصعد من أسفل اليمين إلى أعلى اليسار — «من العطل إلى الطريق»
    final w = math.max(2.2, s.width * .085);
    final road = Path()
      ..moveTo(s.width * .70, s.height * .74)
      ..cubicTo(s.width * .40, s.height * .76, s.width * .62, s.height * .40, s.width * .30, s.height * .30);
    c.drawPath(road, Paint()..style = PaintingStyle.stroke..strokeWidth = w..strokeCap = StrokeCap.round..color = Colors.white);
    // تقطيع منتصف الطريق — شرطتان خافتتان توحيان بالمسار لا تشغلان العين
    c.drawCircle(Offset(s.width * .30, s.height * .30), w * .95, Paint()..color = Colors.white);
    // نقطة الانطلاق بلون الختم — سيارتك على أول الطريق
    c.drawCircle(Offset(s.width * .70, s.height * .74), w * .78, Paint()..color = SinaatyColors.sealDeep);
  }
  @override bool shouldRepaint(covariant CustomPainter _) => false;
}
