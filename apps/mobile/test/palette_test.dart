import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sinaaty/core/theme/app_theme.dart';
import 'package:sinaaty/core/theme/tokens.dart';

/// درجة اللون على عجلة الألوان (0–360).
double _hue(Color c) => HSLColor.fromColor(c).hue;
/// أقصر مسافة بين درجتين — العجلة دائرة، فـ350° و10° متجاورتان لا متباعدتان.
double _apart(Color a, Color b) {
  final d = (_hue(a) - _hue(b)).abs() % 360;
  return math.min(d, 360 - d);
}

/// نسبة التباين (WCAG 2.1).
double _ratio(Color a, Color b) {
  double lum(Color c) {
    double ch(double v) => v <= 0.03928 ? v / 12.92 : math.pow((v + 0.055) / 1.055, 2.4).toDouble();
    return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
  }
  final la = lum(a), lb = lum(b);
  return (math.max(la, lb) + 0.05) / (math.min(la, lb) + 0.05);
}

void main() {
  group('لون الهوية لا يحمل حالة، ولون الحالة لا يحمل هوية', () {
    // النحاسي (٣٩°) والتحذير (٣٥°) كانا على بعد **أربع درجات** — لا تراها عين. فشارةٌ نحاسية
    // تعني «انظر هنا» تبدو إنذاراً كهرمانياً، ولا يعرف قارئها أهي حالة عادية أم خلل.
    test('التحذير يُميَّز عن النحاسي بوضوح', () {
      expect(_apart(SinaatyColors.warn, SinaatyColors.brass), greaterThanOrEqualTo(10));
    });
    test('التحذير يُميَّز عن الخطأ — الإنذار ليس عطلاً', () {
      expect(_apart(SinaatyColors.warn, SinaatyColors.bad), greaterThanOrEqualTo(15));
    });
    test('ولا يقترب أيٌّ منهما من أخضر الهوية', () {
      for (final c in [SinaatyColors.warn, SinaatyColors.bad]) {
        expect(_apart(c, SinaatyColors.seal), greaterThanOrEqualTo(60));
      }
    });
    test('الوضع الداكن يحفظ الفواصل نفسها — القاعدة لا تسقط بالليل', () {
      expect(_apart(SinaatyColors.dWarn, SinaatyColors.dBrass), greaterThanOrEqualTo(10));
      expect(_apart(SinaatyColors.dWarn, SinaatyColors.dSeal), greaterThanOrEqualTo(60));
    });
  });

  group('العربية تُقرأ ولا يُصرخ بها', () {
    final light = AppTheme.light().textTheme;
    // كانت ثمانية أنماط من أحد عشر بوزن w700 — كل شيء عريض فلا شيء يبرز.
    test('العرض محجوزٌ لما يقرّر: المبلغ وحده', () {
      final bold = [light.headlineMedium, light.headlineSmall, light.titleLarge, light.titleMedium, light.titleSmall]
          .where((s) => (s?.fontWeight?.index ?? 0) >= FontWeight.w700.index).length;
      expect(bold, lessThanOrEqualTo(1));
    });
    test('ارتفاع السطر يكفي العربية — الضيق أول ما يُتعب العين', () {
      for (final s in [light.headlineMedium, light.headlineSmall, light.titleLarge, light.titleMedium, light.titleSmall]) {
        expect(s?.height ?? 0, greaterThanOrEqualTo(1.35));
      }
      for (final s in [light.bodyLarge, light.bodyMedium]) {
        expect(s?.height ?? 0, greaterThanOrEqualTo(1.55));
      }
    });
  });

  group('النهار: البطاقة تطفو على أرضيتها', () {
    // كانت البطاقة البيضاء على الأرضية 1.13:1 — بقعةٌ في الخلفية لا جسمٌ مستقلّ.
    test('بطاقة على أرضية', () {
      expect(_ratio(SinaatyColors.paper, SinaatyColors.ground), greaterThanOrEqualTo(1.17));
    });
    test('الحدّ يُرى على البطاقة', () {
      expect(_ratio(SinaatyColors.line, SinaatyColors.paper), greaterThanOrEqualTo(1.45));
    });
    test('النصّ الثانوي يبلغ AA', () {
      expect(_ratio(SinaatyColors.muted, SinaatyColors.paper), greaterThanOrEqualTo(4.5));
    });
  });
}
