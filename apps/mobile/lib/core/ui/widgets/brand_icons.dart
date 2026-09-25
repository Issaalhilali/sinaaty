import 'dart:math' as math;
import 'package:flutter/material.dart';

/// أيقونات صناعية المرسومة — لا Material جاهزة.
///
/// كلمة المالك: «الأيقونات المستخدمة لا تعكس الطموح وفكرة المنتج». مفتاح Material يصلح لأي
/// تطبيق «أدوات»، و«السلايدرز» لقطعة الغيار كانت فضيحةً صامتة. هذه لغةُ بيتٍ واحدة: خطٌّ
/// بسمك ٢ مستدير الأطراف، رموزٌ من عالم السيارات فعلاً (سيارةٌ يعلوها مفتاح، ترسٌ من عائلة
/// شعار الصامولة، سطحةٌ بسريرها المائل وسيارتها)، ولمسة نحاسٍ واحدة حيث يستحق التركيز.
/// كلها CustomPaint — تُلوَّن من سياقها وتقرأ من 20px.
class BrandIcon extends StatelessWidget {
  final BrandGlyph glyph;
  final double size;
  final Color? color;
  final Color? accent;
  const BrandIcon(this.glyph, {super.key, this.size = 24, this.color, this.accent});

  @override
  Widget build(BuildContext context) {
    final c = color ?? IconTheme.of(context).color ?? Theme.of(context).colorScheme.onSurface;
    final a = accent ?? const Color(0xFFC49A52);
    return CustomPaint(size: Size.square(size), painter: _GlyphPainter(glyph, c, a));
  }
}

enum BrandGlyph { carRepair, gear, towTruck, car, home, orders, person, wallet, today, auction, store, shieldSeal, bell, symNoStart, symNoise, symBrakes, symHeat, symShake, symPulls, symLeak, symWarning, symAc, symBolt, symCrash, symService }

class _GlyphPainter extends CustomPainter {
  final BrandGlyph glyph; final Color ink; final Color accent;
  const _GlyphPainter(this.glyph, this.ink, this.accent);

  Paint _s(Color c, double w) => Paint()..color = c..style = PaintingStyle.stroke..strokeWidth = w..strokeCap = StrokeCap.round..strokeJoin = StrokeJoin.round;

  @override
  void paint(Canvas c, Size s) {
    final u = s.width / 24; // كل الرسم على شبكة 24
    final w = 2.0 * u;
    switch (glyph) {
      case BrandGlyph.car:
      case BrandGlyph.carRepair:
        _car(c, u, w, withWrench: glyph == BrandGlyph.carRepair);
      case BrandGlyph.gear:
        _gear(c, u, w, s);
      case BrandGlyph.towTruck:
        _tow(c, u, w);
      case BrandGlyph.home:
        _home(c, u, w);
      case BrandGlyph.orders:
        _orders(c, u, w);
      case BrandGlyph.person:
        _person(c, u, w);
      case BrandGlyph.wallet:
        _wallet(c, u, w);
      case BrandGlyph.today:
        _today(c, u, w);
      case BrandGlyph.auction:
        _auction(c, u, w);
      case BrandGlyph.store:
        _store(c, u, w);
      case BrandGlyph.shieldSeal:
        _shield(c, u, w);
      case BrandGlyph.bell:
        _bell(c, u, w);
      case BrandGlyph.symNoStart:
        _symNoStart(c, u, w);
      case BrandGlyph.symNoise:
        _symNoise(c, u, w);
      case BrandGlyph.symBrakes:
        _symBrakes(c, u, w);
      case BrandGlyph.symHeat:
        _symHeat(c, u, w);
      case BrandGlyph.symShake:
        _symShake(c, u, w);
      case BrandGlyph.symPulls:
        _symPulls(c, u, w);
      case BrandGlyph.symLeak:
        _symLeak(c, u, w);
      case BrandGlyph.symWarning:
        _symWarning(c, u, w);
      case BrandGlyph.symAc:
        _symAc(c, u, w);
      case BrandGlyph.symBolt:
        _symBolt(c, u, w);
      case BrandGlyph.symCrash:
        _symCrash(c, u, w);
      case BrandGlyph.symService:
        _symService(c, u, w);
    }
  }

  // ─── أعراض «أصلح سيارتي» — رموزٌ مصغّرة تُقرأ من 18px، بلا نحاسٍ (شرائح كثيفة) ───

  /// ما تشتغل: قوس تشغيلٍ مفتوح وخطّه — رمز الطاقة بخط البيت.
  void _symNoStart(Canvas c, double u, double w) {
    c.drawArc(Rect.fromCircle(center: Offset(12 * u, 13 * u), radius: 7.5 * u), -math.pi * .38, math.pi * 1.76, false, _s(ink, w));
    c.drawLine(Offset(12 * u, 3.5 * u), Offset(12 * u, 11 * u), _s(ink, w));
  }

  /// صوت غريب: ثلاثة أقواس تتسع من نقطة.
  void _symNoise(Canvas c, double u, double w) {
    c.drawCircle(Offset(6.5 * u, 12 * u), 1.6 * u, Paint()..color = ink);
    for (final r in [4.5, 8.0, 11.5]) {
      c.drawArc(Rect.fromCircle(center: Offset(6.5 * u, 12 * u), radius: r * u), -math.pi * .3, math.pi * .6, false, _s(ink.withValues(alpha: r > 10 ? .45 : .8), w * .9));
    }
  }

  /// المكابح: قرصٌ داخل قوسَي فرجار — شكل قرص المكابح نفسه.
  void _symBrakes(Canvas c, double u, double w) {
    c.drawCircle(Offset(12 * u, 12 * u), 5 * u, _s(ink, w));
    c.drawCircle(Offset(12 * u, 12 * u), 1.6 * u, Paint()..color = ink);
    c.drawArc(Rect.fromCircle(center: Offset(12 * u, 12 * u), radius: 8.2 * u), math.pi * .8, math.pi * .4, false, _s(ink, w));
    c.drawArc(Rect.fromCircle(center: Offset(12 * u, 12 * u), radius: 8.2 * u), -math.pi * .2, math.pi * .4, false, _s(ink, w));
  }

  /// حرارة: ميزانٌ زئبقي ممتلئ حتى رأسه.
  void _symHeat(Canvas c, double u, double w) {
    c.drawLine(Offset(12 * u, 4.5 * u), Offset(12 * u, 14 * u), _s(ink, w));
    c.drawCircle(Offset(12 * u, 17 * u), 3.4 * u, _s(ink, w));
    c.drawCircle(Offset(12 * u, 17 * u), 1.7 * u, Paint()..color = ink);
    c.drawLine(Offset(12 * u, 9 * u), Offset(12 * u, 14.5 * u), _s(ink, w * 1.4));
  }

  /// اهتزاز: سيارةُ خطٍّ مبسطة بين شرطتي رجّة.
  void _symShake(Canvas c, double u, double w) {
    final z1 = Path()..moveTo(4 * u, 8 * u)..lineTo(5.8 * u, 10 * u)..lineTo(4 * u, 12 * u)..lineTo(5.8 * u, 14 * u);
    final z2 = Path()..moveTo(20 * u, 8 * u)..lineTo(18.2 * u, 10 * u)..lineTo(20 * u, 12 * u)..lineTo(18.2 * u, 14 * u);
    c.drawPath(z1, _s(ink.withValues(alpha: .6), w * .85));
    c.drawPath(z2, _s(ink.withValues(alpha: .6), w * .85));
    c.drawRRect(RRect.fromRectAndRadius(Rect.fromLTWH(8 * u, 9 * u, 8 * u, 5 * u), Radius.circular(1.6 * u)), _s(ink, w));
    c.drawCircle(Offset(10 * u, 15.5 * u), 1.4 * u, _s(ink, w * .9));
    c.drawCircle(Offset(14 * u, 15.5 * u), 1.4 * u, _s(ink, w * .9));
  }

  /// تسحب على جنب: سهمٌ يتقدّم وينحرف.
  void _symPulls(Canvas c, double u, double w) {
    final p = Path()..moveTo(12 * u, 19 * u)..lineTo(12 * u, 11 * u)..quadraticBezierTo(12 * u, 7 * u, 16.5 * u, 6.5 * u);
    c.drawPath(p, _s(ink, w));
    c.drawPath(Path()..moveTo(14 * u, 4 * u)..lineTo(17.5 * u, 6.3 * u)..lineTo(14.6 * u, 9.2 * u), _s(ink, w));
  }

  /// تسريب: قطرةٌ وخطُّ أرضٍ تحتها.
  void _symLeak(Canvas c, double u, double w) {
    final d = Path()
      ..moveTo(12 * u, 4.5 * u)
      ..quadraticBezierTo(16.8 * u, 10.5 * u, 16.8 * u, 13.5 * u)
      ..arcToPoint(Offset(7.2 * u, 13.5 * u), radius: Radius.circular(4.8 * u), clockwise: true)
      ..quadraticBezierTo(7.2 * u, 10.5 * u, 12 * u, 4.5 * u);
    c.drawPath(d, _s(ink, w));
    c.drawLine(Offset(6 * u, 20.5 * u), Offset(18 * u, 20.5 * u), _s(ink.withValues(alpha: .55), w * .85));
  }

  /// لمبة تحذير: مثلثٌ بعلامة.
  void _symWarning(Canvas c, double u, double w) {
    final t = Path()..moveTo(12 * u, 4.5 * u)..lineTo(20.5 * u, 19 * u)..lineTo(3.5 * u, 19 * u)..close();
    c.drawPath(t, _s(ink, w));
    c.drawLine(Offset(12 * u, 9.5 * u), Offset(12 * u, 13.5 * u), _s(ink, w));
    c.drawCircle(Offset(12 * u, 16.2 * u), .9 * u, Paint()..color = ink);
  }

  /// المكيف: ندفة — محورٌ وثلاثُ أذرعٍ متقاطعة.
  void _symAc(Canvas c, double u, double w) {
    for (var i = 0; i < 3; i++) {
      final a = i * math.pi / 3;
      final d = Offset(math.cos(a), math.sin(a));
      c.drawLine(Offset(12 * u, 12 * u) - d * 7.5 * u, Offset(12 * u, 12 * u) + d * 7.5 * u, _s(ink, w * .95));
      for (final t in [-1.0, 1.0]) {
        final tip = Offset(12 * u, 12 * u) + d * 5.2 * u * t;
        final n = Offset(-d.dy, d.dx);
        c.drawLine(tip, tip + (n - d * t) * 1.8 * u, _s(ink, w * .8));
        c.drawLine(tip, tip + (-n - d * t) * 1.8 * u, _s(ink, w * .8));
      }
    }
  }

  /// كهرباء: صاعقة.
  void _symBolt(Canvas c, double u, double w) {
    final b = Path()..moveTo(13.5 * u, 3.5 * u)..lineTo(7 * u, 13.5 * u)..lineTo(11.2 * u, 13.5 * u)..lineTo(10 * u, 20.5 * u)..lineTo(17 * u, 10.5 * u)..lineTo(12.8 * u, 10.5 * u)..close();
    c.drawPath(b, _s(ink, w));
  }

  /// صدمة: سيارة البيت وشرارةُ اصطدامٍ عند مقدّمتها.
  void _symCrash(Canvas c, double u, double w) {
    c.drawRRect(RRect.fromRectAndRadius(Rect.fromLTWH(8.5 * u, 10 * u, 12 * u, 5.5 * u), Radius.circular(1.8 * u)), _s(ink, w));
    c.drawCircle(Offset(11.5 * u, 17.5 * u), 1.5 * u, _s(ink, w * .9));
    c.drawCircle(Offset(17.5 * u, 17.5 * u), 1.5 * u, _s(ink, w * .9));
    final star = Path()..moveTo(5.5 * u, 7 * u)..lineTo(7 * u, 9.4 * u)..lineTo(4.2 * u, 9.2 * u)..lineTo(6.6 * u, 11 * u)..lineTo(4.8 * u, 12.8 * u);
    c.drawPath(star, _s(ink, w * .9));
  }

  /// صيانة دورية: مفتاح ربطٍ وقوسُ دورةٍ بسهم.
  void _symService(Canvas c, double u, double w) {
    c.drawArc(Rect.fromCircle(center: Offset(12 * u, 12 * u), radius: 8 * u), -math.pi * .25, math.pi * 1.2, false, _s(ink.withValues(alpha: .6), w * .85));
    c.drawPath(Path()..moveTo(17.5 * u, 3.6 * u)..lineTo(19.9 * u, 6.6 * u)..lineTo(16.4 * u, 7.4 * u), _s(ink.withValues(alpha: .6), w * .85));
    final wc = Offset(12 * u, 12 * u);
    c.drawArc(Rect.fromCircle(center: wc + Offset(2.2 * u, -2.2 * u), radius: 2.4 * u), math.pi * .45, math.pi * 1.15, false, _s(ink, w));
    c.drawLine(wc + Offset(.6 * u, -.6 * u), wc + Offset(-3.4 * u, 3.4 * u), _s(ink, w));
  }

  /// بيت: سقفٌ وجداران وبابٌ نحاسي — «الرئيسية» بدفء المنزل لا برمز نظام.
  void _home(Canvas c, double u, double w) {
    final roof = Path()..moveTo(3.5 * u, 11 * u)..lineTo(12 * u, 4 * u)..lineTo(20.5 * u, 11 * u);
    c.drawPath(roof, _s(ink, w));
    final walls = Path()..moveTo(5.5 * u, 11.5 * u)..lineTo(5.5 * u, 20 * u)..lineTo(18.5 * u, 20 * u)..lineTo(18.5 * u, 11.5 * u);
    c.drawPath(walls, _s(ink, w));
    final door = Path()..moveTo(10.2 * u, 20 * u)..lineTo(10.2 * u, 15.5 * u)..quadraticBezierTo(12 * u, 14 * u, 13.8 * u, 15.5 * u)..lineTo(13.8 * u, 20 * u);
    c.drawPath(door, _s(accent, w * .95));
  }

  /// أوامر: مستندٌ بزاويةٍ مطوية وأسطر — وسطرُ المجموع نحاسي.
  void _orders(Canvas c, double u, double w) {
    final doc = Path()
      ..moveTo(6 * u, 3.5 * u)..lineTo(14.5 * u, 3.5 * u)..lineTo(18 * u, 7 * u)..lineTo(18 * u, 20.5 * u)
      ..lineTo(6 * u, 20.5 * u)..close();
    c.drawPath(doc, _s(ink, w));
    c.drawPath(Path()..moveTo(14.5 * u, 3.5 * u)..lineTo(14.5 * u, 7 * u)..lineTo(18 * u, 7 * u), _s(ink, w * .8));
    c.drawLine(Offset(8.5 * u, 10.5 * u), Offset(15.5 * u, 10.5 * u), _s(ink.withValues(alpha: .6), w * .8));
    c.drawLine(Offset(8.5 * u, 13.5 * u), Offset(15.5 * u, 13.5 * u), _s(ink.withValues(alpha: .6), w * .8));
    c.drawLine(Offset(8.5 * u, 16.8 * u), Offset(13 * u, 16.8 * u), _s(accent, w * .95));
  }

  /// شخص: رأسٌ وكتفان بخط البيت.
  void _person(Canvas c, double u, double w) {
    c.drawCircle(Offset(12 * u, 8 * u), 3.6 * u, _s(ink, w));
    c.drawArc(Rect.fromLTWH(4.5 * u, 13.5 * u, 15 * u, 13 * u), math.pi, math.pi, false, _s(ink, w));
  }

  /// محفظة: جيبٌ بغطاءٍ وزرٌّ نحاسي.
  void _wallet(Canvas c, double u, double w) {
    final r = RRect.fromRectAndRadius(Rect.fromLTWH(3.5 * u, 6.5 * u, 17 * u, 12.5 * u), Radius.circular(2.6 * u));
    c.drawRRect(r, _s(ink, w));
    c.drawLine(Offset(3.5 * u, 10 * u), Offset(15 * u, 10 * u), _s(ink.withValues(alpha: .5), w * .8));
    c.drawCircle(Offset(17 * u, 13 * u), 1.5 * u, Paint()..color = accent);
  }

  /// اليوم: تقويمٌ بحلقتين ونقطةُ اليوم نحاسية.
  void _today(Canvas c, double u, double w) {
    final r = RRect.fromRectAndRadius(Rect.fromLTWH(4 * u, 5.5 * u, 16 * u, 14.5 * u), Radius.circular(2.6 * u));
    c.drawRRect(r, _s(ink, w));
    c.drawLine(Offset(8.5 * u, 3.5 * u), Offset(8.5 * u, 7 * u), _s(ink, w));
    c.drawLine(Offset(15.5 * u, 3.5 * u), Offset(15.5 * u, 7 * u), _s(ink, w));
    c.drawLine(Offset(4 * u, 9.8 * u), Offset(20 * u, 9.8 * u), _s(ink.withValues(alpha: .5), w * .8));
    c.drawCircle(Offset(9.5 * u, 14.5 * u), 1.7 * u, Paint()..color = accent);
  }

  /// مزاد: مطرقةٌ رأسها نحاسي وقاعدة — طلبات القطع تُكسب بالضربة الأفضل.
  void _auction(Canvas c, double u, double w) {
    c.save();
    c.translate(12 * u, 10 * u);
    c.rotate(-.6);
    c.drawLine(Offset(-1.5 * u, 0), Offset(6.5 * u, 0), _s(ink, w));                       // الذراع
    c.drawRRect(RRect.fromRectAndRadius(Rect.fromCenter(center: Offset(-3.4 * u, 0), width: 4.2 * u, height: 7 * u), Radius.circular(1.2 * u)), _s(accent, w * .95));
    c.restore();
    c.drawLine(Offset(6 * u, 20 * u), Offset(15.5 * u, 20 * u), _s(ink, w));               // القاعدة
  }

  /// متجر: مظلةٌ متموجة وواجهة — «مبيعاتي» بملامح السوق لا برمزٍ عام.
  void _store(Canvas c, double u, double w) {
    final awn = Path()..moveTo(3.5 * u, 10 * u)..lineTo(4.5 * u, 5 * u)..lineTo(19.5 * u, 5 * u)..lineTo(20.5 * u, 10 * u);
    c.drawPath(awn, _s(ink, w));
    for (var i = 0; i < 4; i++) {
      final x = (3.5 + i * 4.25) * u;
      c.drawArc(Rect.fromLTWH(x, 8.4 * u, 4.25 * u, 3.2 * u), math.pi, math.pi, false, _s(i == 1 ? accent : ink, w * .9));
    }
    c.drawPath(Path()..moveTo(5.5 * u, 12 * u)..lineTo(5.5 * u, 20 * u)..lineTo(18.5 * u, 20 * u)..lineTo(18.5 * u, 12 * u), _s(ink, w));
  }

  /// درعُ ضمان: درعٌ يحتضن حلقة الختم النحاسية — الضمان توثيقٌ لا وعد.
  void _shield(Canvas c, double u, double w) {
    final sh = Path()
      ..moveTo(12 * u, 3.5 * u)..lineTo(19 * u, 6 * u)..lineTo(19 * u, 12 * u)
      ..quadraticBezierTo(19 * u, 17.5 * u, 12 * u, 20.5 * u)
      ..quadraticBezierTo(5 * u, 17.5 * u, 5 * u, 12 * u)..lineTo(5 * u, 6 * u)..close();
    c.drawPath(sh, _s(ink, w));
    c.drawCircle(Offset(12 * u, 11.5 * u), 3 * u, _s(accent, w * .95));
    c.drawCircle(Offset(12 * u, 11.5 * u), 1.1 * u, Paint()..color = accent);
  }

  /// جرس: جسمٌ ولسانٌ نحاسي.
  void _bell(Canvas c, double u, double w) {
    final b = Path()
      ..moveTo(6 * u, 16.5 * u)
      ..lineTo(6 * u, 11 * u)
      ..quadraticBezierTo(6 * u, 5 * u, 12 * u, 5 * u)
      ..quadraticBezierTo(18 * u, 5 * u, 18 * u, 11 * u)
      ..lineTo(18 * u, 16.5 * u)
      ..moveTo(4.5 * u, 16.5 * u)..lineTo(19.5 * u, 16.5 * u);
    c.drawPath(b, _s(ink, w));
    c.drawCircle(Offset(12 * u, 19.5 * u), 1.4 * u, Paint()..color = accent);
  }

  /// سيارة جانبية: سقفٌ منحنٍ، جسمٌ، عجلتان — و(اختياراً) مفتاح ربطٍ نحاسي يعلوها.
  void _car(Canvas c, double u, double w, {required bool withWrench}) {
    final dy = withWrench ? 3.0 * u : 0.0;
    final body = Path()
      ..moveTo(2.5 * u, 15 * u + dy)
      ..lineTo(2.5 * u, 13 * u + dy)
      ..quadraticBezierTo(2.5 * u, 11.5 * u + dy, 4.5 * u, 11 * u + dy)
      ..lineTo(7 * u, 10.5 * u + dy)
      ..quadraticBezierTo(9 * u, 7.5 * u + dy, 12 * u, 7.5 * u + dy)
      ..lineTo(15 * u, 7.5 * u + dy)
      ..quadraticBezierTo(18 * u, 7.5 * u + dy, 19.5 * u, 10.5 * u + dy)
      ..lineTo(20.5 * u, 11 * u + dy)
      ..quadraticBezierTo(21.5 * u, 11.5 * u + dy, 21.5 * u, 13 * u + dy)
      ..lineTo(21.5 * u, 15 * u + dy);
    c.drawPath(body, _s(ink, w));
    // نافذة
    c.drawLine(Offset(12.5 * u, 7.8 * u + dy), Offset(12.5 * u, 10.4 * u + dy), _s(ink.withValues(alpha: .55), w * .8));
    // عجلتان
    c.drawCircle(Offset(7.5 * u, 15 * u + dy), 2.2 * u, _s(ink, w));
    c.drawCircle(Offset(16.5 * u, 15 * u + dy), 2.2 * u, _s(ink, w));
    if (withWrench) {
      // مفتاح ربطٍ نحاسي صغير يعلو السيارة — الفكّان قوسان متقابلان وذراعٌ مائل
      final wc = Offset(17.5 * u, 3.6 * u);
      c.drawArc(Rect.fromCircle(center: wc, radius: 2.1 * u), math.pi * .45, math.pi * 1.15, false, _s(accent, w * .95));
      c.drawLine(wc + Offset(-1.4 * u, 1.4 * u), wc + Offset(-4.6 * u, 4.4 * u), _s(accent, w * .95));
    }
  }

  /// ترسٌ من عائلة الشعار: ثمانية أسنانٍ مستديرة وقلبٌ مفتوح.
  void _gear(Canvas c, double u, double w, Size s) {
    final center = Offset(s.width / 2, s.height / 2);
    final r = 7.2 * u;
    for (var i = 0; i < 8; i++) {
      final a = i * math.pi / 4;
      final p1 = center + Offset(math.cos(a) * r, math.sin(a) * r);
      final p2 = center + Offset(math.cos(a) * (r + 2.4 * u), math.sin(a) * (r + 2.4 * u));
      c.drawLine(p1, p2, _s(ink, w));
    }
    c.drawCircle(center, r, _s(ink, w));
    c.drawCircle(center, 2.6 * u, _s(accent, w * .95));
  }

  /// سطحة: كابينةٌ أماميّة، سريرٌ مائل، وسيارةٌ صغيرة نحاسية راكبة — الرمز الذي يفهمه
  /// صاحبُ سيارةٍ معطلة من نظرة.
  void _tow(Canvas c, double u, double w) {
    // السرير المائل
    c.drawLine(Offset(8.5 * u, 13.5 * u), Offset(21.5 * u, 9.5 * u), _s(ink, w));
    // الكابينة
    final cab = Path()
      ..moveTo(8.5 * u, 13.5 * u)
      ..lineTo(6 * u, 13.5 * u)
      ..lineTo(4.5 * u, 10.5 * u)
      ..lineTo(2.5 * u, 10.5 * u)
      ..lineTo(2.5 * u, 15.5 * u)
      ..lineTo(8.5 * u, 15.5 * u)
      ..close();
    c.drawPath(cab, _s(ink, w));
    // عجلات
    c.drawCircle(Offset(5.5 * u, 17.5 * u), 1.9 * u, _s(ink, w));
    c.drawCircle(Offset(16.5 * u, 15.8 * u), 1.9 * u, _s(ink, w));
    // السيارة الراكبة — نحاسية: هي بطلة المشهد
    final car = Path()
      ..moveTo(12.5 * u, 11.6 * u)
      ..quadraticBezierTo(14 * u, 8.6 * u, 16.5 * u, 8.2 * u)
      ..lineTo(19.5 * u, 7.3 * u)
      ..quadraticBezierTo(21 * u, 7 * u, 21 * u, 8.4 * u);
    c.drawPath(car, _s(accent, w * .95));
  }

  @override
  bool shouldRepaint(covariant _GlyphPainter old) => old.glyph != glyph || old.ink != ink || old.accent != accent;
}
