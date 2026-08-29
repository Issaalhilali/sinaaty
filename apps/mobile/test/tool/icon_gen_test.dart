import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sinaaty/core/theme/tokens.dart';
import 'package:sinaaty/core/ui/ui.dart';

/// مولّد أيقونة التطبيق — ليس اختباراً بل مطبعة: `flutter test --update-goldens test/tool`
/// يكتب icon_1024.png، وسكربت tool/gen_launcher_icons.sh ينزلها إلى كثافات أندرويد.
///
/// لماذا هنا؟ لأن العلامة مرسومة بـCustomPaint في الشيفرة (BrandMark) لا في ملف تصميم —
/// فأي تعديل عليها يعيد طباعة الأيقونة من المصدر نفسه، ولا تفترق الأيقونة عن التطبيق أبداً.
void main() {
  testWidgets('أيقونة المشغّل: علامة الطريق النحاسية على ختمٍ أخضر عميق', (t) async {
    t.view.physicalSize = const Size(1024, 1024);
    t.view.devicePixelRatio = 1;
    addTearDown(t.view.reset);
    await t.pumpWidget(Directionality(
      textDirection: TextDirection.rtl,
      child: Container(
        // تدرّج عميق هادئ — لا أسود: الهوية خضراء حتى في أصغر تمثيل لها
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft, end: Alignment.bottomRight,
            colors: [SinaatyColors.sealInk, SinaatyColors.sealDeep],
          ),
        ),
        // 58%: يملأ العين داخل قناع المشغّل الدائري ولا تُقص أطرافه
        child: const Center(child: BrandMark(size: 594)),
      ),
    ));
    await expectLater(find.byType(Container), matchesGoldenFile('icon_1024.png'));
  });

  testWidgets('طبقة المقدمة التكيفية: العلامة وحدها على شفاف — أندرويد يركّبها على الخلفية الخضراء', (t) async {
    t.view.physicalSize = const Size(1024, 1024);
    t.view.devicePixelRatio = 1;
    addTearDown(t.view.reset);
    // منطقة الأمان في الأيقونة التكيفية 66/108 من اللوحة — العلامة عند 46% تسلم من كل قصّات المصنّعين
    await t.pumpWidget(const Directionality(
      textDirection: TextDirection.rtl,
      child: Center(child: RepaintBoundary(child: SizedBox(width: 1024, height: 1024, child: Center(child: BrandMark(size: 470))))),
    ));
    await expectLater(find.byType(SizedBox).first, matchesGoldenFile('icon_fg_1024.png'));
  });
}
