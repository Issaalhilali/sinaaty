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
/// شعار صناعية v3: **صامولة سداسية مستديرة الزوايا تحمل «ص»**.
///
/// السداسي هو أيقونة الصناعة الأصدق — رأس البرغي الذي تدور عليه كل ورشة — واستدارة زواياه
/// تمنحه ودّاً بدل صلابة الحديد. الحرف حرف الاسم في القلب، وحلقةٌ داخلية خافتة تلمّح للختم
/// بلا أسنانٍ تُشبه طابع البريد (v2 المسنّن لم يرضِ المالك، وv1 «المربع بالحلقة» قبله).
/// يُقرأ من 24px، وبمكوّنٍ واحد يتبدّل في كل الشاشات معاً.
class BrandMark extends StatelessWidget {
  final double size; const BrandMark({super.key, this.size = 36});
  @override Widget build(BuildContext context) {
    final c = Theme.of(context).colorScheme.primary;
    return SizedBox(width: size, height: size, child: Stack(alignment: Alignment.center, children: [
      CustomPaint(size: Size.square(size), painter: _HexMarkPainter(c)),
      Padding(
        padding: EdgeInsets.only(bottom: size * .12),
        child: Text('ص', style: TextStyle(fontFamily: 'Almarai', fontSize: size * .52, height: 1, fontWeight: FontWeight.w800, color: Colors.white)),
      ),
    ]));
  }
}

class _HexMarkPainter extends CustomPainter {
  final Color seal;
  _HexMarkPainter(this.seal);

  /// سداسي مسطّح القمة بزوايا مستديرة — يُبنى بخطوطٍ إلى نقاطٍ قبل كل رأس وبعده وقوسٍ بينهما.
  Path _hex(Offset c, double r, double corner) {
    final pts = [for (var i = 0; i < 6; i++) c + Offset(math.cos(i * math.pi / 3 - math.pi / 6) * r, math.sin(i * math.pi / 3 - math.pi / 6) * r)];
    final path = Path();
    for (var i = 0; i < 6; i++) {
      final prev = pts[(i + 5) % 6]; final cur = pts[i]; final next = pts[(i + 1) % 6];
      Offset lerp(Offset a, Offset b, double t) => Offset(a.dx + (b.dx - a.dx) * t, a.dy + (b.dy - a.dy) * t);
      final inA = lerp(cur, prev, corner); final outA = lerp(cur, next, corner);
      if (i == 0) { path.moveTo(inA.dx, inA.dy); } else { path.lineTo(inA.dx, inA.dy); }
      path.quadraticBezierTo(cur.dx, cur.dy, outA.dx, outA.dy);
    }
    path.close();
    return path;
  }

  @override void paint(Canvas c, Size s) {
    final center = Offset(s.width / 2, s.height / 2); final r = s.width / 2;
    final hex = _hex(center, r, .22);
    // تعبئة متدرجة كسطح الختم — لا ظلال مرسومة: drawShadow يجمّد canvaskit على الوِب
    c.drawPath(hex, Paint()..shader = LinearGradient(begin: Alignment.topRight, end: Alignment.bottomLeft,
        colors: [Color.lerp(seal, Colors.white, .18)!, seal, Color.lerp(seal, Colors.black, .25)!], stops: const [0, .45, 1]).createShader(Offset.zero & s));
    // حافة علوية مضيئة تعطي سُمكاً معدنياً خفيفاً
    c.drawPath(_hex(center, r * .995, .22), Paint()..style = PaintingStyle.stroke..strokeWidth = math.max(1, s.width * .03)..color = Colors.white.withValues(alpha: .18));
    // حلقة الختم الداخلية — خافتة، تلمّح للتوثيق بلا أسنان
    c.drawCircle(center, r * .68, Paint()..style = PaintingStyle.stroke..strokeWidth = math.max(1, s.width * .04)..color = Colors.white.withValues(alpha: .28));
  }
  @override bool shouldRepaint(covariant _HexMarkPainter old) => old.seal != seal;
}
