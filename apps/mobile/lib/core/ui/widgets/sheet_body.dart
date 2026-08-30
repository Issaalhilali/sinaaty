import 'package:flutter/material.dart';
import '../../theme/tokens.dart';

/// جسد الورقة السفلية: حشوة اللوحة السفلية **وتمرير** معاً.
///
/// انفجر على جوال المالك (RenderFlex overflowed by 40px في ورقة طلب القطعة): الورقة عمودٌ
/// ثابت، فإذا فتحت لوحة المفاتيح وأكلت نصف الشاشة لم يعد للعمود مكان — والنمط نفسه كان
/// منسوخاً في أربعة عشر موضعاً، كلها قنابل تنتظر جوالاً أقصر أو لوحة مفاتيح أطول.
/// المكوّن الواحد يعالجها جميعاً: المحتوى يتمرر حين يضيق المكان ويبقى كما هو حين يتسع.
class SheetBody extends StatelessWidget {
  final Widget child;
  const SheetBody({super.key, required this.child});
  @override
  Widget build(BuildContext context) => Padding(
        padding: EdgeInsets.fromLTRB(SinaatySpace.lg, 0, SinaatySpace.lg, MediaQuery.viewInsetsOf(context).bottom + SinaatySpace.xl),
        child: SingleChildScrollView(child: child),
      );
}
