import 'package:flutter/material.dart';
import 'tokens.dart';
/// Calm, Arabic-first Material theme. Big tap targets (56dp), one accent, generous spacing.
abstract final class AppTheme {
  static const fontFamily = 'PlexArabic';
  static ThemeData light() => _build(Brightness.light);
  static ThemeData dark() => _build(Brightness.dark);
  static ThemeData _build(Brightness b) {
    final dark = b == Brightness.dark;
    final scheme = ColorScheme(
      brightness: b,
      primary: dark ? SinaatyColors.dSeal : SinaatyColors.seal, onPrimary: dark ? SinaatyColors.dGround : Colors.white,
      primaryContainer: dark ? SinaatyColors.dSealSoft : SinaatyColors.sealSoft, onPrimaryContainer: dark ? SinaatyColors.dSeal : SinaatyColors.sealInk,
      secondary: dark ? SinaatyColors.dBrass : SinaatyColors.brass, onSecondary: dark ? SinaatyColors.dGround : Colors.white,
      secondaryContainer: dark ? SinaatyColors.dBrassSoft : SinaatyColors.brassSoft, onSecondaryContainer: dark ? SinaatyColors.dBrass : SinaatyColors.brass,
      error: SinaatyColors.bad, onError: Colors.white, errorContainer: SinaatyColors.badSoft, onErrorContainer: SinaatyColors.bad,
      surface: dark ? SinaatyColors.dPaper : SinaatyColors.paper, onSurface: dark ? SinaatyColors.dInk : SinaatyColors.ink,
      surfaceContainerHighest: dark ? SinaatyColors.dPaper2 : SinaatyColors.paper2, onSurfaceVariant: dark ? SinaatyColors.dMuted : SinaatyColors.muted,
      outline: dark ? SinaatyColors.dLine : SinaatyColors.line, outlineVariant: dark ? SinaatyColors.dLine : SinaatyColors.line,
      shadow: Colors.black, scrim: Colors.black, inverseSurface: dark ? SinaatyColors.paper : SinaatyColors.ink, onInverseSurface: dark ? SinaatyColors.ink : SinaatyColors.paper, inversePrimary: dark ? SinaatyColors.seal : SinaatyColors.dSeal, tertiary: dark ? SinaatyColors.dBrass : SinaatyColors.brass, onTertiary: Colors.white,
    );
    final base = ThemeData(useMaterial3: true, colorScheme: scheme, fontFamily: fontFamily, brightness: b);
    final r = BorderRadius.circular(SinaatySpace.radius);
    return base.copyWith(
      scaffoldBackgroundColor: dark ? SinaatyColors.dGround : SinaatyColors.ground,
      appBarTheme: AppBarTheme(backgroundColor: dark ? SinaatyColors.dGround : SinaatyColors.ground, foregroundColor: scheme.onSurface, elevation: 0, scrolledUnderElevation: 0, centerTitle: false, titleTextStyle: TextStyle(fontFamily: fontFamily, fontSize: 20, fontWeight: FontWeight.w700, color: scheme.onSurface)),
      cardTheme: CardThemeData(color: scheme.surface, elevation: 0, margin: EdgeInsets.zero, shape: RoundedRectangleBorder(borderRadius: r, side: BorderSide(color: scheme.outlineVariant))),
      filledButtonTheme: FilledButtonThemeData(style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(SinaatySpace.tapTarget), shape: RoundedRectangleBorder(borderRadius: r), textStyle: const TextStyle(fontFamily: fontFamily, fontSize: 16, fontWeight: FontWeight.w700))),
      outlinedButtonTheme: OutlinedButtonThemeData(style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(SinaatySpace.tapTarget), shape: RoundedRectangleBorder(borderRadius: r), side: BorderSide(color: scheme.primary, width: 1.5), textStyle: const TextStyle(fontFamily: fontFamily, fontSize: 16, fontWeight: FontWeight.w700))),
      textButtonTheme: TextButtonThemeData(style: TextButton.styleFrom(minimumSize: const Size(48, 48), textStyle: const TextStyle(fontFamily: fontFamily, fontWeight: FontWeight.w600))),
      inputDecorationTheme: InputDecorationTheme(filled: true, fillColor: scheme.surface, contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18), border: OutlineInputBorder(borderRadius: r, borderSide: BorderSide(color: scheme.outline)), enabledBorder: OutlineInputBorder(borderRadius: r, borderSide: BorderSide(color: scheme.outline)), focusedBorder: OutlineInputBorder(borderRadius: r, borderSide: BorderSide(color: scheme.primary, width: 2)), errorBorder: OutlineInputBorder(borderRadius: r, borderSide: const BorderSide(color: SinaatyColors.bad)), hintStyle: TextStyle(color: scheme.onSurfaceVariant)),
      navigationBarTheme: NavigationBarThemeData(backgroundColor: scheme.surface, indicatorColor: scheme.primaryContainer, height: 68, labelTextStyle: WidgetStatePropertyAll(TextStyle(fontFamily: fontFamily, fontSize: 12, fontWeight: FontWeight.w600, color: scheme.onSurface))),
      dividerTheme: DividerThemeData(color: scheme.outlineVariant, thickness: 1, space: 1),
      snackBarTheme: SnackBarThemeData(behavior: SnackBarBehavior.floating, shape: RoundedRectangleBorder(borderRadius: r)),
      textTheme: base.textTheme.apply(fontFamily: fontFamily, bodyColor: scheme.onSurface, displayColor: scheme.onSurface).copyWith(headlineSmall: TextStyle(fontFamily: fontFamily, fontSize: 24, fontWeight: FontWeight.w700, color: scheme.onSurface, height: 1.3), titleLarge: TextStyle(fontFamily: fontFamily, fontSize: 20, fontWeight: FontWeight.w700, color: scheme.onSurface), bodyLarge: TextStyle(fontFamily: fontFamily, fontSize: 16, height: 1.6, color: scheme.onSurface), bodyMedium: TextStyle(fontFamily: fontFamily, fontSize: 14, height: 1.6, color: scheme.onSurface), labelSmall: TextStyle(fontFamily: fontFamily, fontSize: 12, letterSpacing: .4, color: scheme.onSurfaceVariant)),
    );
  }
}
