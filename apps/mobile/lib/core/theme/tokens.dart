import 'package:flutter/material.dart';
/// Design tokens (docs/design/sinaaty-visual-concept.html). One accent (seal), one secondary (brass), calm neutrals.
abstract final class SinaatyColors {
  static const seal = Color(0xFF0E6B54); static const sealInk = Color(0xFF0A4F3E); static const sealDeep = Color(0xFF083A2E); static const sealSoft = Color(0xFFDCEFE6);
  static const brass = Color(0xFFA97A22); static const brassSoft = Color(0xFFF4EAD3);
  // النهار: البطاقة البيضاء كانت تذوب في أرضيتها (1.13:1). الأرضية أعمق قليلاً والحدّ أوضح،
  // فتطفو البطاقة كجسمٍ مستقلّ لا كبقعةٍ في الخلفية. القياسات في `test/palette_test.dart`.
  static const ink = Color(0xFF12201C); static const ink2 = Color(0xFF3B4A45); static const muted = Color(0xFF66756F);
  static const ground = Color(0xFFE9EDEB); static const paper = Color(0xFFFFFFFF); static const paper2 = Color(0xFFF7F9F7); static const line = Color(0xFFC9D4CE);
  // **لون الهوية لا يحمل حالة، ولون الحالة لا يحمل هوية.**
  //
  // كان «النجاح» أخضرَ ثانياً على بعد ١١° من أخضر الختم، و«التحذير» كهرمانياً على بعد **٤°** من
  // النحاسي — أربع درجات لا تراها عين، فشارةٌ نحاسية تعني «انظر هنا» تبدو إنذاراً. حُذف النجاح:
  // في منتجٍ أخضر يُقال «تمّ» بأخضر الختم نفسه، فـ«مختوم» و«ناجح» فكرة واحدة عندنا. وأُبعد
  // التحذير إلى برتقاليّ صريح. والنحاسي صار للهوية والوثائق وحدها، لا يحمل حالة أبداً.
  // `test/palette_test.dart` يقيس الفواصل فلا يعود أحد يُقارب بينها.
  static const warn = Color(0xFFC7650F); static const warnSoft = Color(0xFFF9EADC); static const bad = Color(0xFFB4382F); static const badSoft = Color(0xFFF9E1DE);
  static const dWarn = Color(0xFFEF8E39); static const dWarnSoft = Color(0xFF33200F);
  // dark
  // الوضع الداكن مُعايَر بالقياس لا بالذوق: كانت البطاقة على الخلفية 1.09:1 — لونٌ واحد عملياً،
  // فتختفي الحدود ويبدو كل شيء مسطّحاً. الأهداف: بطاقة/خلفية ≥1.30 (حدّ الإدراك)، حدّ/بطاقة ≥1.40،
  // ونصّ ثانوي ≥4.5 (WCAG AA). القياسات في `test/dark_contrast_test.dart` تمنع رجوعها.
  static const dGround = Color(0xFF050908); static const dPaper = Color(0xFF202823); static const dPaper2 = Color(0xFF2B372F); static const dInk = Color(0xFFEAF0EC); static const dInk2 = Color(0xFFC2CDC7); static const dMuted = Color(0xFF9AABA3); static const dLine = Color(0xFF36483F);
  static const dSeal = Color(0xFF3FBF95); static const dSealSoft = Color(0xFF123A2F); static const dBrass = Color(0xFFD9A84B); static const dBrassSoft = Color(0xFF3A2E14);
}
abstract final class SinaatySpace { static const xs = 4.0; static const sm = 8.0; static const md = 12.0; static const lg = 16.0; static const xl = 24.0; static const xxl = 32.0;
  /// الزوايا بثلاث درجات (design-system/SPACING_SYSTEM.md): زرّ/حقل 12 · ورقة 14 · بطل 20 — لا 24 في كل مكان.
  static const radius = 12.0; static const radiusCard = 14.0; static const radiusHero = 20.0; static const radiusLg = radiusHero; static const tapTarget = 56.0;
  /// The floating nav is 68 tall with a 14 margin — plus the device's own safe area. A list that
  /// guesses this number hides its last row behind the bar (owner review 2026-08-23 §3).
  static const navBar = 68.0 + 14.0;
  static double bottomClearance(BuildContext context) => navBar + MediaQuery.paddingOf(context).bottom + sm;
}

/// ظلٌّ واحد في المنتج كله — لبطاقة الختم. الورق يُفصل بالحدّ لا بالظلّ: كان كل ورقة بظلّ طبقتين
/// فبدت الصفحة «مُطفأة» وتساوت البطاقات مع البطل (design-audit/UX_PROBLEMS.md §16).
abstract final class SinaatyShadow {
  static final hero = <BoxShadow>[BoxShadow(color: SinaatyColors.sealDeep.withValues(alpha: .35), blurRadius: 32, spreadRadius: -12, offset: const Offset(0, 16))];
}
