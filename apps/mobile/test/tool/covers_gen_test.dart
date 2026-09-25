import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sinaaty/core/theme/tokens.dart';
import 'package:sinaaty/core/ui/ui.dart';
import '../workshop_flow_test.dart' show loadArabicFont;

/// مطبعة أغلفة المنشآت التجريبية — حتى تكون بيئة العرض حيّةً بوجوهٍ لا صفوفاً باردة.
/// أغلفة «هويةٍ» لا صور مزيفة: تدرج الختم، نقش المعين، رمز الصنعة كبيراً خافتاً، وخيط نحاس.
/// الورش الحقيقية ترفع صورها الحقيقية من التطبيق (⋯ > صورة الورشة) فتحل محلها.
void main() {
  setUpAll(loadArabicFont);
  for (final (name, glyph, _) in [
    ('cover_workshop', BrandGlyph.carRepair, 'ورشة معتمدة في صناعية'),
    ('cover_scrapyard', BrandGlyph.gear, 'تشليح موثّق في صناعية'),
    ('cover_parts', BrandGlyph.store, 'قطع غيار موثّقة في صناعية'),
  ]) {
    testWidgets('غلاف $name', (t) async {
      t.view.physicalSize = const Size(1200, 675);
      t.view.devicePixelRatio = 1;
      addTearDown(t.view.reset);
      await t.pumpWidget(Directionality(textDirection: TextDirection.rtl, child: Container(
        decoration: const BoxDecoration(gradient: LinearGradient(begin: Alignment.topRight, end: Alignment.bottomLeft,
            colors: [SinaatyColors.sealInk, SinaatyColors.seal])),
        child: Stack(alignment: Alignment.center, children: [
          // نقش المعين الخافت — توقيع السطح الختمي نفسه
          Positioned.fill(child: CustomPaint(painter: _DiamondPainter())),
          // التكوين مركزيٌّ عمداً: الغلاف يُقصّ مربعاً في القائمة (44px) وعريضاً في الملف —
          // ما يقع في المنتصف وحده يظهر في الحالتين، فالوسط الفارغ كان يقرأ مربعاً أخضر ميتاً.
          // بلا نصٍّ داخل الصورة: التطبيق يكتب الاسم فوق الغلاف، فنصُّ الصورة كان يصطدم به.
          // (والصور الحقيقية لا تحمل نصاً أصلاً — الغلاف المولّد يتصرّف مثلها.)
          Padding(padding: const EdgeInsets.only(bottom: 40),
              child: Opacity(opacity: .92, child: BrandIcon(glyph, size: 190, color: Colors.white))),
          // خيط النحاس أسفل الغلاف
          Positioned(bottom: 0, left: 0, right: 0, child: Container(height: 10, color: const Color(0xFFC49A52))),
        ]),
      )));
      await expectLater(find.byType(Container).first, matchesGoldenFile('$name.png'));
    });
  }
}

class _DiamondPainter extends CustomPainter {
  @override void paint(Canvas c, Size s) {
    final p = Paint()..color = Colors.white.withValues(alpha: .05)..strokeWidth = 1.4..style = PaintingStyle.stroke;
    for (double x = -s.height; x < s.width + s.height; x += 46) {
      c.drawLine(Offset(x, 0), Offset(x + s.height, s.height), p);
      c.drawLine(Offset(x + s.height, 0), Offset(x, s.height), p);
    }
  }
  @override bool shouldRepaint(covariant CustomPainter _) => false;
}
