import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sinaaty/core/theme/tokens.dart';
import '../workshop_flow_test.dart' show loadArabicFont;

/// مسودات شعار للعرض على المالك — معالم الصنعة لا حروف: بوابة الصناعية، السيارة على الرافعة، المفتاح.
const _brass = Color(0xFFC49A52);
const _brassHi = Color(0xFFE2BC7A);

BoxDecoration _ground() => BoxDecoration(
    borderRadius: BorderRadius.circular(110),
    gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight,
        colors: [SinaatyColors.sealInk, SinaatyColors.sealDeep]));

Paint _brassStroke(double w) => Paint()
  ..style = PaintingStyle.stroke..strokeWidth = w..strokeCap = StrokeCap.round
  ..shader = const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight,
      colors: [_brassHi, _brass]).createShader(const Rect.fromLTWH(0, 0, 480, 480));
Paint _brassFill() => Paint()
  ..shader = const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight,
      colors: [_brassHi, _brass]).createShader(const Rect.fromLTWH(0, 0, 480, 480));

/// أ — بوابة الصناعية: القوس وباب الشرائح المرفوع نصفه، والطريق يمر من تحته
class _GatePainter extends CustomPainter {
  @override void paint(Canvas c, Size s) {
    final w = s.width;
    final arch = Path()
      ..moveTo(w * .18, w * .78)
      ..lineTo(w * .18, w * .42)
      ..arcToPoint(Offset(w * .82, w * .42), radius: Radius.circular(w * .34))
      ..lineTo(w * .82, w * .78);
    c.drawPath(arch, _brassStroke(w * .055));
    // شرائح الباب الملفوف — مرفوع نصفه: الورشة مفتوحة تستقبل
    for (var i = 0; i < 3; i++) {
      final y = w * (.335 + .085 * i);
      final inset = w * (i == 0 ? .285 : .255);
      c.drawLine(Offset(inset, y), Offset(w - inset, y), _brassStroke(w * .038));
    }
    // الأرض: طريق يمتد أوسع من البوابة
    c.drawLine(Offset(w * .10, w * .78), Offset(w * .90, w * .78), _brassStroke(w * .05));
  }
  @override bool shouldRepaint(covariant CustomPainter _) => false;
}

/// ب — السيارة على الرافعة المقصّية: صنعة السيارات بلا كلمة واحدة
class _LiftPainter extends CustomPainter {
  @override void paint(Canvas c, Size s) {
    final w = s.width;
    final body = Path()
      ..moveTo(w * .16, w * .46)
      ..quadraticBezierTo(w * .18, w * .40, w * .30, w * .38)
      ..quadraticBezierTo(w * .38, w * .27, w * .52, w * .27)
      ..quadraticBezierTo(w * .66, w * .27, w * .72, w * .375)
      ..quadraticBezierTo(w * .83, w * .395, w * .84, w * .45)
      ..quadraticBezierTo(w * .845, w * .48, w * .82, w * .485)
      ..lineTo(w * .18, w * .485)
      ..quadraticBezierTo(w * .155, w * .48, w * .16, w * .46)
      ..close();
    Path cut(double cx) => Path()..addOval(Rect.fromCircle(center: Offset(w * cx, w * .485), radius: w * .065));
    final cutBody = Path.combine(PathOperation.difference,
        Path.combine(PathOperation.difference, body, cut(.30)), cut(.70));
    c.drawPath(cutBody, _brassFill());
    for (final cx in [.30, .70]) {
      c.drawCircle(Offset(w * cx, w * .485), w * .042, _brassStroke(w * .03));
    }
    // الرافعة المقصية: منصة، مقص X، قاعدة
    c.drawLine(Offset(w * .20, w * .58), Offset(w * .80, w * .58), _brassStroke(w * .045));
    c.drawLine(Offset(w * .28, w * .58), Offset(w * .72, w * .76), _brassStroke(w * .04));
    c.drawLine(Offset(w * .72, w * .58), Offset(w * .28, w * .76), _brassStroke(w * .04));
    c.drawLine(Offset(w * .20, w * .76), Offset(w * .80, w * .76), _brassStroke(w * .045));
  }
  @override bool shouldRepaint(covariant CustomPainter _) => false;
}

/// ج — مفتاح الربط: رأس مفتوح وذراع، وصامولة سداسية في فكّيه
class _WrenchPainter extends CustomPainter {
  @override void paint(Canvas c, Size s) {
    final w = s.width;
    c.save();
    c.translate(w / 2, w / 2);
    c.rotate(-math.pi / 4);
    c.translate(-w / 2, -w / 2);
    c.drawLine(Offset(w * .5, w * .40), Offset(w * .5, w * .82), _brassStroke(w * .085));
    final head = Path.combine(
      PathOperation.difference,
      Path()..addOval(Rect.fromCircle(center: Offset(w * .5, w * .30), radius: w * .155)),
      Path()..addOval(Rect.fromCircle(center: Offset(w * .5, w * .30), radius: w * .075)),
    );
    final jaw = Path()..addRect(Rect.fromLTWH(w * .5 - w * .062, w * .06, w * .124, w * .17));
    c.drawPath(Path.combine(PathOperation.difference, head, jaw), _brassFill());
    c.restore();
    final center = Offset(w * .655, w * .345);
    final hexR = w * .052;
    final hex = Path();
    for (var i = 0; i < 6; i++) {
      final a = (i * 60 - 90) * math.pi / 180;
      final o = Offset(center.dx + hexR * math.cos(a), center.dy + hexR * math.sin(a));
      i == 0 ? hex.moveTo(o.dx, o.dy) : hex.lineTo(o.dx, o.dy);
    }
    hex.close();
    c.drawPath(hex, _brassStroke(w * .028));
  }
  @override bool shouldRepaint(covariant CustomPainter _) => false;
}

void main() {
  setUpAll(loadArabicFont);
  testWidgets('ورقة مقارنة الشعار — معالم', (t) async {
    t.view.physicalSize = const Size(1100, 1250);
    t.view.devicePixelRatio = 1;
    addTearDown(t.view.reset);

    Widget cell(String label, CustomPainter p) => Column(mainAxisSize: MainAxisSize.min, children: [
          Container(width: 480, height: 480, decoration: _ground(),
              child: CustomPaint(size: const Size(480, 480), painter: p)),
          const SizedBox(height: 14),
          Text(label, style: const TextStyle(fontFamily: 'Almarai', fontSize: 26, fontWeight: FontWeight.w700, color: Color(0xFF12241D))),
        ]);

    await t.pumpWidget(MaterialApp(home: Directionality(textDirection: TextDirection.rtl,
        child: Material(color: const Color(0xFFF3F6F4), child: Center(child: Wrap(spacing: 40, runSpacing: 40, children: [
          cell('أ — بوابة الصناعية', _GatePainter()),
          cell('ب — السيارة على الرافعة', _LiftPainter()),
          cell('ج — مفتاح الصنعة', _WrenchPainter()),
        ]))))));
    await expectLater(find.byType(Wrap), matchesGoldenFile('logo_candidates.png'));
  });
}
