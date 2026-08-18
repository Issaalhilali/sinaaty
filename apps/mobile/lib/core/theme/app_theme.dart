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
    final r = BorderRadius.circular(SinaatySpace.radius); final rl = BorderRadius.circular(SinaatySpace.radiusLg);
    return base.copyWith(
      scaffoldBackgroundColor: dark ? SinaatyColors.dGround : SinaatyColors.ground,
      appBarTheme: AppBarTheme(backgroundColor: dark ? SinaatyColors.dGround : SinaatyColors.ground, foregroundColor: scheme.onSurface, elevation: 0, scrolledUnderElevation: 0, centerTitle: false, titleSpacing: 20, toolbarHeight: 64, titleTextStyle: TextStyle(fontFamily: fontFamily, fontSize: 22, fontWeight: FontWeight.w700, color: scheme.onSurface, letterSpacing: -.2), iconTheme: IconThemeData(color: scheme.onSurface, size: 22)),
      cardTheme: CardThemeData(color: scheme.surface, elevation: 0, margin: EdgeInsets.zero, shape: RoundedRectangleBorder(borderRadius: rl, side: BorderSide(color: dark ? SinaatyColors.dLine : SinaatyColors.line.withValues(alpha: .7)))),
      filledButtonTheme: FilledButtonThemeData(style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(SinaatySpace.tapTarget), shape: RoundedRectangleBorder(borderRadius: r), elevation: 0, textStyle: const TextStyle(fontFamily: fontFamily, fontSize: 16.5, fontWeight: FontWeight.w700))),
      outlinedButtonTheme: OutlinedButtonThemeData(style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(SinaatySpace.tapTarget), shape: RoundedRectangleBorder(borderRadius: r), side: BorderSide(color: scheme.primary, width: 1.5), textStyle: const TextStyle(fontFamily: fontFamily, fontSize: 16, fontWeight: FontWeight.w700))),
      textButtonTheme: TextButtonThemeData(style: TextButton.styleFrom(minimumSize: const Size(48, 48), textStyle: const TextStyle(fontFamily: fontFamily, fontWeight: FontWeight.w600))),
      inputDecorationTheme: InputDecorationTheme(filled: true, fillColor: scheme.surface, contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18), border: OutlineInputBorder(borderRadius: r, borderSide: BorderSide(color: scheme.outline)), enabledBorder: OutlineInputBorder(borderRadius: r, borderSide: BorderSide(color: scheme.outline)), focusedBorder: OutlineInputBorder(borderRadius: r, borderSide: BorderSide(color: scheme.primary, width: 2)), errorBorder: OutlineInputBorder(borderRadius: r, borderSide: const BorderSide(color: SinaatyColors.bad)), hintStyle: TextStyle(color: scheme.onSurfaceVariant)),
      navigationBarTheme: NavigationBarThemeData(backgroundColor: scheme.surface, indicatorColor: scheme.primaryContainer, height: 72, elevation: 0, surfaceTintColor: Colors.transparent, iconTheme: WidgetStateProperty.resolveWith((st) => IconThemeData(size: 24, color: st.contains(WidgetState.selected) ? scheme.onPrimaryContainer : scheme.onSurfaceVariant)), labelTextStyle: WidgetStateProperty.resolveWith((st) => TextStyle(fontFamily: fontFamily, fontSize: 12, fontWeight: st.contains(WidgetState.selected) ? FontWeight.w700 : FontWeight.w500, color: st.contains(WidgetState.selected) ? scheme.onSurface : scheme.onSurfaceVariant))),
      dividerTheme: DividerThemeData(color: scheme.outlineVariant, thickness: 1, space: 1),
      snackBarTheme: SnackBarThemeData(behavior: SnackBarBehavior.floating, shape: RoundedRectangleBorder(borderRadius: r)),
      textTheme: base.textTheme.apply(fontFamily: fontFamily, bodyColor: scheme.onSurface, displayColor: scheme.onSurface).copyWith(headlineMedium: TextStyle(fontFamily: fontFamily, fontSize: 30, fontWeight: FontWeight.w700, color: scheme.onSurface, height: 1.25, letterSpacing: -.3), headlineSmall: TextStyle(fontFamily: fontFamily, fontSize: 24, fontWeight: FontWeight.w700, color: scheme.onSurface, height: 1.3), titleLarge: TextStyle(fontFamily: fontFamily, fontSize: 20, fontWeight: FontWeight.w700, color: scheme.onSurface, height: 1.35), titleMedium: TextStyle(fontFamily: fontFamily, fontSize: 16.5, fontWeight: FontWeight.w700, color: scheme.onSurface, height: 1.4), titleSmall: TextStyle(fontFamily: fontFamily, fontSize: 15, fontWeight: FontWeight.w600, color: scheme.onSurface, height: 1.4), bodyLarge: TextStyle(fontFamily: fontFamily, fontSize: 16, height: 1.6, color: scheme.onSurface), bodyMedium: TextStyle(fontFamily: fontFamily, fontSize: 14, height: 1.6, color: scheme.onSurface), labelSmall: TextStyle(fontFamily: fontFamily, fontSize: 12, letterSpacing: .4, color: scheme.onSurfaceVariant)),
    );
  }
}
