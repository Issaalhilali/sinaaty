import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import '../workshop_flow_test.dart' show loadArabicFont;

/// ورقة اتجاهات جذرية بعد رفض نمط «الرسوم الحرفية بنحاس على داكن» كله:
/// رموز مجردة بيضاء على تدرج أخضر حي — لغة التطبيقات الحديثة لا الأيقونات.
const _g1 = Color(0xFF0B7A5C);
const _g2 = Color(0xFF15AD7F);

BoxDecoration _tile() => BoxDecoration(
    borderRadius: BorderRadius.circular(110),
    gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [_g1, _g2]));

/// ب — «الصامولة»: صامولة العجلة من الأعلى — سداسيةٌ بيضاء بقلب مفرّغ: أبسط رمز صنعةٍ ممكن
class _LugNutPainter extends CustomPainter {
  @override void paint(Canvas c, Size s) {
    final w = s.width; final center = Offset(w * .5, w * .5);
    final hex = Path();
    const r = .34;
    for (var i = 0; i < 6; i++) {
      final a = (i * 60 - 90) * math.pi / 180;
      final o = Offset(center.dx + w * r * math.cos(a), center.dy + w * r * math.sin(a));
      i == 0 ? hex.moveTo(o.dx, o.dy) : hex.lineTo(o.dx, o.dy);
    }
    hex.close();
    // زوايا مستديرة عبر تكبير الحد ثم دمجه
    c.drawPath(hex, Paint()..color = Colors.white..style = PaintingStyle.stroke..strokeWidth = w * .10..strokeJoin = StrokeJoin.round);
    c.drawPath(hex, Paint()..color = Colors.white);
    c.drawCircle(center, w * .155, Paint()..color = _g1..blendMode = BlendMode.srcOver);
  }
  @override bool shouldRepaint(covariant CustomPainter _) => false;
}

void main() {
  setUpAll(loadArabicFont);
  testWidgets('ورقة الاتجاهات الجذرية', (t) async {
    t.view.physicalSize = const Size(1100, 1250);
    t.view.devicePixelRatio = 1;
    addTearDown(t.view.reset);

    Widget cell(String label, Widget mark) => Column(mainAxisSize: MainAxisSize.min, children: [
          Container(width: 480, height: 480, decoration: _tile(), clipBehavior: Clip.antiAlias,
              child: mark),
          const SizedBox(height: 14),
          Text(label, style: const TextStyle(fontFamily: 'Almarai', fontSize: 26, fontWeight: FontWeight.w700, color: Color(0xFF12241D))),
        ]);

    // ج — النظام الكامل: الصامولة فوق الوسم — أيقونة المتجر وكلمة الشاشات من عائلة واحدة
    final lockup = Column(mainAxisAlignment: MainAxisAlignment.center, children: [
      SizedBox(width: 190, height: 190, child: CustomPaint(painter: _LugNutPainter())),
      const SizedBox(height: 26),
      const Text('صناعية', style: TextStyle(fontFamily: 'Almarai', fontSize: 86, fontWeight: FontWeight.w800, color: Colors.white, height: 1)),
    ]);

    // د — «وسم صناعية»: الاسم كاملاً بخط عريض — الهوية هي الكلمة
    final wordmark = Center(child: Text('صناعية',
        style: TextStyle(fontFamily: 'Almarai', fontSize: 120, fontWeight: FontWeight.w800, color: Colors.white, height: 1,
            shadows: [Shadow(color: const Color(0xFF06392B).withValues(alpha: .25), offset: const Offset(0, 6), blurRadius: 18)])));

    await t.pumpWidget(MaterialApp(home: Directionality(textDirection: TextDirection.rtl,
        child: Material(color: const Color(0xFFF3F6F4), child: Center(child: Wrap(spacing: 40, runSpacing: 40, children: [
          cell('أ — الصامولة (الأيقونة)', CustomPaint(size: const Size(480, 480), painter: _LugNutPainter())),
          cell('ب — الوسم (الكلمة)', wordmark),
          cell('ج — النظام الكامل', lockup),
        ]))))));
    await expectLater(find.byType(Wrap), matchesGoldenFile('logo_candidates.png'));
  });
}
