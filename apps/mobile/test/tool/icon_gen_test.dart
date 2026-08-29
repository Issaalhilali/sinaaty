import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sinaaty/core/theme/tokens.dart';
import 'package:sinaaty/core/ui/ui.dart';

/// مولّد أيقونة التطبيق — ليس اختباراً بل مطبعة: `flutter test --update-goldens test/tool/icon_gen_test.dart`
/// يكتب icon_1024.png وicon_fg_1024.png، وtool/gen_launcher_icons.sh ينزلهما إلى كثافات أندرويد وiOS.
///
/// لماذا هنا؟ لأن العلامة (بوابة الصناعية — GateMarkPainter) مرسومة في الشيفرة لا في ملف
/// تصميم — فأي تعديل عليها يعيد طباعة الأيقونة من المصدر نفسه ولا تفترق الأيقونة عن التطبيق.
void main() {
  testWidgets('أيقونة المشغّل: بوابة الصناعية النحاسية على ختمٍ أخضر عميق', (t) async {
    t.view.physicalSize = const Size(1024, 1024);
    t.view.devicePixelRatio = 1;
    addTearDown(t.view.reset);
    await t.pumpWidget(Directionality(
      textDirection: TextDirection.rtl,
      child: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft, end: Alignment.bottomRight,
            colors: [SinaatyColors.sealInk, SinaatyColors.sealDeep],
          ),
        ),
        // 72%: البوابة تملأ العين داخل قناع المشغّل الدائري ولا تُقص أطرافها
        child: const Center(child: SizedBox(width: 737, height: 737, child: CustomPaint(painter: GateMarkPainter()))),
      ),
    ));
    await expectLater(find.byType(Container), matchesGoldenFile('icon_1024.png'));
  });

  testWidgets('طبقة المقدمة التكيفية: البوابة وحدها على شفاف — أندرويد يركّبها على الخلفية الخضراء', (t) async {
    t.view.physicalSize = const Size(1024, 1024);
    t.view.devicePixelRatio = 1;
    addTearDown(t.view.reset);
    // منطقة الأمان في الأيقونة التكيفية 66/108 من اللوحة — البوابة عند 52% تسلم من كل قصّات المصنّعين
    await t.pumpWidget(const Directionality(
      textDirection: TextDirection.rtl,
      child: Center(child: RepaintBoundary(child: SizedBox(width: 1024, height: 1024,
          child: Center(child: SizedBox(width: 532, height: 532, child: CustomPaint(painter: GateMarkPainter())))))),
    ));
    await expectLater(find.byType(SizedBox).first, matchesGoldenFile('icon_fg_1024.png'));
  });
}
