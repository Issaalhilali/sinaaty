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

/// رسم العلامة (نحاس على شفاف) — تستعمله الأيقونات التكيفية أيضاً.
///
/// بناء بالكتل والفراغ السالب لا بالخطوط (نقد المالك على نسخة الحدود: «خطوط وتصميم
/// بدائي»): جسم الكراج كتلة مصمتة يُنحت منها فتحة الباب، الباب الملفوف ينزل ثلثها
/// بحزّين منحوتين، والسيارة كتلة داخل الفراغ. كل الأشكال تُجمع في مسار واحد ثم تُصبغ
/// بتدرج نحاسي واحد — فيقرأ الشعار جسماً واحداً لا خطوطاً مجموعة.
class GateMarkPainter extends CustomPainter {
  const GateMarkPainter();
  @override void paint(Canvas c, Size s) {
    final w = s.width;
    RRect rr(double l, double t, double r, double b, double rad) =>
        RRect.fromLTRBR(w * l, w * t, w * r, w * b, Radius.circular(w * rad));
    Path add(Path a, Path b) => Path.combine(PathOperation.union, a, b);
    Path cut(Path a, Path b) => Path.combine(PathOperation.difference, a, b);

    Path topRounded(double l, double t, double r, double b, double rad) => Path()
      ..moveTo(w * l, w * b)
      ..lineTo(w * l, w * (t + rad))
      ..quadraticBezierTo(w * l, w * t, w * (l + rad), w * t)
      ..lineTo(w * (r - rad), w * t)
      ..quadraticBezierTo(w * r, w * t, w * r, w * (t + rad))
      ..lineTo(w * r, w * b)
      ..close();
    // جسم الكراج: كتلة بأكتاف علوية مشطوفة وقاعدة مستقيمة، تُنحت منها فتحة الباب
    var mark = cut(
      topRounded(.10, .245, .90, .775, .10),
      topRounded(.185, .335, .815, .78, .05),
    );
    // الباب الملفوف نازلاً ثلثه — سطحه مستوٍ وحزّان منحوتان يوحيان بالشرائح
    var door = topRounded(.185, .335, .815, .475, .05);
    for (final gy in [.379, .425]) {
      door = cut(door, Path()..addRect(Rect.fromLTRB(w * .185, w * gy, w * .815, w * (gy + .015))));
    }
    mark = add(mark, door);
    // الطريق: بساط يمتد أوسع من الكراج
    mark = add(mark, Path()..addRRect(rr(.045, .775, .955, .8255, .025)));
    // السيارة داخل الفتحة: كتلة انسيابية واحدة، بيتا العجلات منحوتان
    var body = Path()
      ..moveTo(w * .235, w * .655)
      ..quadraticBezierTo(w * .238, w * .607, w * .30, w * .5965)
      ..quadraticBezierTo(w * .345, w * .537, w * .445, w * .537)
      ..quadraticBezierTo(w * .545, w * .537, w * .60, w * .592)
      ..quadraticBezierTo(w * .715, w * .60, w * .755, w * .638)
      ..quadraticBezierTo(w * .768, w * .652, w * .765, w * .674)
      ..quadraticBezierTo(w * .762, w * .706, w * .73, w * .706)
      ..lineTo(w * .27, w * .706)
      ..quadraticBezierTo(w * .232, w * .706, w * .235, w * .655)
      ..close();
    Path wheelBay(double cx) => Path()..addOval(Rect.fromCircle(center: Offset(w * cx, w * .706), radius: w * .062));
    body = cut(cut(body, wheelBay(.345)), wheelBay(.655));
    mark = add(mark, body);
    // العجلتان: قرصان بمحورين منحوتين، قاعهما على الطريق
    for (final cx in [.345, .655]) {
      mark = add(mark, cut(
        Path()..addOval(Rect.fromCircle(center: Offset(w * cx, w * .729), radius: w * .0465)),
        Path()..addOval(Rect.fromCircle(center: Offset(w * cx, w * .729), radius: w * .0165)),
      ));
    }
    c.drawPath(mark, Paint()
      ..isAntiAlias = true
      ..shader = const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight,
          colors: [Color(0xFFE6C384), Color(0xFFC49A52), Color(0xFFA97F38)], stops: [0, .55, 1]).createShader(Offset.zero & s));
  }
  @override bool shouldRepaint(covariant CustomPainter _) => false;
}
