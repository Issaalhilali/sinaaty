import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import '../../theme/tokens.dart';
import 'seal_card.dart';

/// تركيب شاشات ما قبل الدخول: أخضر الختم يملأ الأعلى، ولوحٌ أبيض يرتفع فوقه بالفعل الوحيد.
///
/// شاشتان تستعملانه (الجوال ثم الرمز) فلا تنكسر اللغة بينهما — وأي شاشة لاحقة تُبنى عليه بدل
/// اختراع شكل ثالث. اللوح يعلو مع لوحة المفاتيح، والأخضر يبقى وراءه بلا قفزة.
class SealScaffold extends StatelessWidget {
  /// ما يُعرض على الأخضر — يُوسَّط رأسياً في المساحة الباقية فوق اللوح.
  final Widget top;

  /// محتوى اللوح الأبيض: الحقل والفعل.
  final Widget sheet;

  /// زر رجوع أبيض فوق الأخضر (شاشة الرمز)، ولا شيء في أول شاشة.
  final VoidCallback? onBack;

  const SealScaffold({super.key, required this.top, required this.sheet, this.onBack});

  @override Widget build(BuildContext context) => Theme(
      // شاشات ما قبل الدخول تلتزم المظهر الفاتح مهما كان وضع الجهاز: هويةٌ تُعرض لا تفضيلٌ
      // يُتبع — لوحٌ داكن استقبل المالك على جهازه الداكن فقال كلمته. داخل التطبيق يبقى التفضيل له.
      data: AppTheme.light(),
      child: Builder(builder: (context) => _body(context)));

  Widget _body(BuildContext context) => Scaffold(
        backgroundColor: SinaatyColors.sealDeep,
        // السقالة تُقلّص الجسم فوق لوحة المفاتيح؛ فلا نضيف ارتفاعها مرة ثانية داخل اللوح (كان حشواً
        // مزدوجاً)، والتمرير يستوعب ما تبقّى بدل أن يفيض التخطيط على جهاز قصير.
        body: LayoutBuilder(builder: (context, box) => SingleChildScrollView(
          child: ConstrainedBox(
            constraints: BoxConstraints(minHeight: box.maxHeight),
            child: IntrinsicHeight(child: Column(children: [
              Expanded(child: SealSurface(child: SafeArea(bottom: false, child: Stack(children: [
                if (onBack != null) PositionedDirectional(start: 4, top: 4, child: IconButton(onPressed: onBack, icon: const Icon(Icons.arrow_forward), color: Colors.white)),
                // المحتوى يهبط إلى أسفل الأخضر لا وسطه: شاشة الرمز محتواها سطران فكان ثلث الشاشة
                // العلوي فراغاً ميتاً والعين تقفز فوقه. الهبوط يُقرّب الكلام من الحقل الذي يخصّه.
                Padding(padding: const EdgeInsets.fromLTRB(SinaatySpace.xl, SinaatySpace.xxl, SinaatySpace.xl, SinaatySpace.lg),
                    child: Align(alignment: AlignmentDirectional.bottomStart, child: top)),
              ])))),
              Container(
                width: double.infinity,
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surface,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
                  boxShadow: [BoxShadow(color: SinaatyColors.sealDeep.withValues(alpha: .35), blurRadius: 34, offset: const Offset(0, -12))],
                ),
                child: SafeArea(top: false, child: Padding(
                  padding: const EdgeInsets.all(SinaatySpace.xl),
                  child: sheet,
                )),
              ),
            ])),
          ),
        )),
      );
}
