import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sinaaty/core/theme/tokens.dart';

/// نسبة التباين (WCAG 2.1) بين لونين معتمين.
double _ratio(Color a, Color b) {
  double lum(Color c) {
    double ch(double v) => v <= 0.03928 ? v / 12.92 : math.pow((v + 0.055) / 1.055, 2.4).toDouble();
    return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
  }
  final la = lum(a), lb = lum(b);
  return (math.max(la, lb) + 0.05) / (math.min(la, lb) + 0.05);
}

void main() {
  group('الوضع الداكن يُرى', () {
    // البطاقة والخلفية كانتا 1.09:1 — لونٌ واحد عملياً، فبدت الشاشة مسطّحة بلا حدود.
    test('البطاقة تُميَّز عن الخلفية', () {
      expect(_ratio(SinaatyColors.dPaper, SinaatyColors.dGround), greaterThanOrEqualTo(1.30));
    });
    test('الطبقة الثانية تُميَّز عن البطاقة', () {
      expect(_ratio(SinaatyColors.dPaper2, SinaatyColors.dPaper), greaterThanOrEqualTo(1.15));
    });
    test('الحدّ يُرى على البطاقة', () {
      expect(_ratio(SinaatyColors.dLine, SinaatyColors.dPaper), greaterThanOrEqualTo(1.40));
    });
    test('النصّ الثانوي يبلغ AA — أكثر ما نكتبه به', () {
      expect(_ratio(SinaatyColors.dMuted, SinaatyColors.dPaper), greaterThanOrEqualTo(4.5));
    });
    test('النصّ الرئيسي مريح لا صارخ', () {
      final r = _ratio(SinaatyColors.dInk, SinaatyColors.dPaper);
      expect(r, greaterThanOrEqualTo(7.0));
      expect(r, lessThan(17.0));            // أبيضٌ ناصع على أسود يُتعب العين ليلاً
    });
  });
}
