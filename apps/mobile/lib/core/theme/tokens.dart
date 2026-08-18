import 'package:flutter/material.dart';
/// Design tokens (docs/design/sinaaty-visual-concept.html). One accent (seal), one secondary (brass), calm neutrals.
abstract final class SinaatyColors {
  static const seal = Color(0xFF0E6B54); static const sealInk = Color(0xFF0A4F3E); static const sealDeep = Color(0xFF083A2E); static const sealSoft = Color(0xFFDCEFE6);
  static const brass = Color(0xFFA97A22); static const brassSoft = Color(0xFFF4EAD3);
  static const ink = Color(0xFF12201C); static const ink2 = Color(0xFF3B4A45); static const muted = Color(0xFF66756F);
  static const ground = Color(0xFFEEF2EF); static const paper = Color(0xFFFFFFFF); static const paper2 = Color(0xFFF7F9F7); static const line = Color(0xFFD3DCD7);
  static const ok = Color(0xFF1F8A5B); static const warn = Color(0xFFC27A12); static const warnSoft = Color(0xFFFBEFD9); static const bad = Color(0xFFB4382F); static const badSoft = Color(0xFFF9E1DE);
  // dark
  static const dGround = Color(0xFF0C1310); static const dPaper = Color(0xFF141D19); static const dPaper2 = Color(0xFF1A2620); static const dInk = Color(0xFFE8EEEA); static const dInk2 = Color(0xFFC2CDC7); static const dMuted = Color(0xFF8C9C95); static const dLine = Color(0xFF26332D);
  static const dSeal = Color(0xFF3FBF95); static const dSealSoft = Color(0xFF123A2F); static const dBrass = Color(0xFFD9A84B); static const dBrassSoft = Color(0xFF3A2E14);
}
abstract final class SinaatySpace { static const xs = 4.0; static const sm = 8.0; static const md = 12.0; static const lg = 16.0; static const xl = 24.0; static const xxl = 32.0; static const radius = 14.0; static const radiusLg = 20.0; static const tapTarget = 56.0; }
