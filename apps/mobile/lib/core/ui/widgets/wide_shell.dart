import 'package:flutter/material.dart';
import '../../theme/tokens.dart';

/// عمودٌ مريح على الشاشات العريضة.
///
/// التطبيق مبنيٌّ للجوال، ويُفتح على الوِب من حاسوب: عند 800×450 كانت ورقة الدخول تُدفع خارج
/// الشاشة فلا يرى الزائر إلا خلفيةً خضراء — تطبيقٌ سليم يبدو معطّلاً.
///
/// ولا نمدّه على العرض كلّه: سطرٌ يمتدّ متراً لا يُقرأ، وزرٌّ بعرض الشاشة يبدو خطأً. نحصره في
/// عمودٍ بعرض الجوال ونُلوّن ما حوله بأخضر الهوية — قرارٌ مقصود لا شاشةٌ ممطوطة.
class WideShell extends StatelessWidget {
  final Widget child;
  /// أوسع من هذا لا يُقرأ سطرٌ مريحاً، وأضيق منه يخنق المحتوى.
  static const maxWidth = 520.0;
  const WideShell({super.key, required this.child});

  @override Widget build(BuildContext context) {
    final w = MediaQuery.sizeOf(context).width;
    if (w <= maxWidth) return child;
    final dark = Theme.of(context).brightness == Brightness.dark;
    return ColoredBox(
      color: dark ? SinaatyColors.dGround : SinaatyColors.sealDeep,
      child: Center(child: ClipRRect(
        borderRadius: BorderRadius.circular(SinaatySpace.radiusLg),
        child: SizedBox(width: maxWidth, child: MediaQuery.removePadding(
          context: context, removeTop: false,
          child: child,
        )),
      )),
    );
  }
}
