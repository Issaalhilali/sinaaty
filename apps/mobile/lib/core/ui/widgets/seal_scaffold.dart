import 'package:flutter/material.dart';
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

  @override Widget build(BuildContext context) => Scaffold(
        backgroundColor: SinaatyColors.sealDeep,
        body: Column(children: [
          Expanded(child: SealSurface(child: SafeArea(bottom: false, child: Stack(children: [
            if (onBack != null) PositionedDirectional(start: 4, top: 4, child: IconButton(onPressed: onBack, icon: const Icon(Icons.arrow_forward), color: Colors.white)),
            Padding(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.xl), child: Center(child: top)),
          ])))),
          Container(
            width: double.infinity,
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
              boxShadow: [BoxShadow(color: SinaatyColors.sealDeep.withValues(alpha: .35), blurRadius: 34, offset: const Offset(0, -12))],
            ),
            child: SafeArea(top: false, child: Padding(
              padding: EdgeInsets.fromLTRB(SinaatySpace.xl, SinaatySpace.xl, SinaatySpace.xl, MediaQuery.viewInsetsOf(context).bottom + SinaatySpace.xl),
              child: sheet,
            )),
          ),
        ]),
      );
}
