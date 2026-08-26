import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sinaaty/core/theme/tokens.dart';

/// درجة اللون على عجلة الألوان (0–360).
double _hue(Color c) => HSLColor.fromColor(c).hue;
/// أقصر مسافة بين درجتين — العجلة دائرة، فـ350° و10° متجاورتان لا متباعدتان.
double _apart(Color a, Color b) {
  final d = (_hue(a) - _hue(b)).abs() % 360;
  return math.min(d, 360 - d);
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
}
