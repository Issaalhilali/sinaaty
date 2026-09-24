import 'package:flutter/material.dart';
import '../../result/result.dart';
import '../../theme/tokens.dart';

/// الخطأ يُقال بلون الحالة وأيقونتها، يبقى ثماني ثوانٍ أو حتى يُغلَق، وفوق شريط التنقّل لا خلفه
/// (القرار D5). للنجاح العابر يبقى SnackBar الافتراضي؛ هذا للفشل وحده.
void showFailure(BuildContext context, Failure f) {
  final locale = Localizations.localeOf(context).languageCode; final m = ScaffoldMessenger.of(context);
  final network = f is NetworkFailure; final fg = network ? SinaatyColors.warn : SinaatyColors.bad;
  m.hideCurrentSnackBar();
  // ثماني ثوانٍ وزرّ إغلاق وأعلى شريط التنقّل — لا أربع ثوانٍ خلفه. (MaterialBanner بمؤقّتٍ خارجي
  // يترك Timer معلّقاً في الاختبارات؛ مؤقّت SnackBar يملكه الـScaffoldMessenger ويُلغيه.)
  m.showSnackBar(SnackBar(
    duration: const Duration(seconds: 8), showCloseIcon: true, closeIconColor: fg,
    backgroundColor: network ? SinaatyColors.warnSoft : SinaatyColors.badSoft,
    behavior: SnackBarBehavior.floating, margin: const EdgeInsets.fromLTRB(SinaatySpace.lg, 0, SinaatySpace.lg, SinaatySpace.navBar + SinaatySpace.sm),
    content: Row(children: [Icon(network ? Icons.cloud_off_outlined : Icons.error_outline, color: fg, size: 20), const SizedBox(width: SinaatySpace.sm), Expanded(child: Text(f.message(locale), style: TextStyle(color: fg, fontWeight: FontWeight.w600)))]),
  ));
}
