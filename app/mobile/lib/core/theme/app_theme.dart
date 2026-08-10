import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../utils/app_fonts.dart';

class AppTheme {
  AppTheme._();

  static const Color seed = Color(0xFFF59E0B); // Amber-500, mirrors the web brand

  static ThemeData get light {
    final base = ThemeData(useMaterial3: true, brightness: Brightness.light);

    final textTheme = GoogleFonts.ibmPlexSansTextTheme(base.textTheme).copyWith(
      displayLarge: GoogleFonts.outfit(
        textStyle: base.textTheme.displayLarge?.copyWith(
          fontFamily: AppFonts.display,
          fontWeight: FontWeight.w700,
          letterSpacing: -1,
          fontFeatures: const [FontFeature.tabularFigures()],
        ),
      ),
      displayMedium: GoogleFonts.outfit(
        textStyle: base.textTheme.displayMedium?.copyWith(
          fontFamily: AppFonts.display,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.5,
          fontFeatures: const [FontFeature.tabularFigures()],
        ),
      ),
      displaySmall: GoogleFonts.outfit(
        textStyle: base.textTheme.displaySmall?.copyWith(
          fontFamily: AppFonts.display,
          fontWeight: FontWeight.w700,
          fontFeatures: const [FontFeature.tabularFigures()],
        ),
      ),
      headlineLarge: GoogleFonts.outfit(
        textStyle: base.textTheme.headlineLarge?.copyWith(
          fontFamily: AppFonts.display,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.5,
          fontFeatures: const [FontFeature.tabularFigures()],
        ),
      ),
      headlineMedium: GoogleFonts.outfit(
        textStyle: base.textTheme.headlineMedium?.copyWith(
          fontFamily: AppFonts.display,
          fontWeight: FontWeight.w700,
          fontFeatures: const [FontFeature.tabularFigures()],
        ),
      ),
      headlineSmall: GoogleFonts.outfit(
        textStyle: base.textTheme.headlineSmall?.copyWith(
          fontFamily: AppFonts.display,
          fontWeight: FontWeight.w600,
          fontFeatures: const [FontFeature.tabularFigures()],
        ),
      ),
      titleLarge: GoogleFonts.outfit(
        textStyle: base.textTheme.titleLarge?.copyWith(
          fontFamily: AppFonts.display,
          fontWeight: FontWeight.w600,
          fontFeatures: const [FontFeature.tabularFigures()],
        ),
      ),
      titleMedium: GoogleFonts.outfit(
        textStyle: base.textTheme.titleMedium?.copyWith(
          fontFamily: AppFonts.display,
          fontWeight: FontWeight.w600,
          fontFeatures: const [FontFeature.tabularFigures()],
        ),
      ),
      titleSmall: GoogleFonts.outfit(
        textStyle: base.textTheme.titleSmall?.copyWith(
          fontFamily: AppFonts.display,
          fontWeight: FontWeight.w600,
          fontFeatures: const [FontFeature.tabularFigures()],
        ),
      ),
      labelLarge: GoogleFonts.ibmPlexSans(
        textStyle: base.textTheme.labelLarge?.copyWith(
          fontFamily: AppFonts.body,
          fontWeight: FontWeight.w600,
        ),
      ),
      labelMedium: GoogleFonts.ibmPlexSans(
        textStyle: base.textTheme.labelMedium?.copyWith(
          fontFamily: AppFonts.body,
          fontWeight: FontWeight.w600,
        ),
      ),
      labelSmall: GoogleFonts.ibmPlexSans(
        textStyle: base.textTheme.labelSmall?.copyWith(
          fontFamily: AppFonts.body,
          fontWeight: FontWeight.w600,
        ),
      ),
    );

    final colorScheme = const ColorScheme(
      brightness: Brightness.light,
      primary: Color(0xFF18181B),
      onPrimary: Color(0xFFFAFAFA),
      secondary: Color(0xFFF4F4F5),
      onSecondary: Color(0xFF0F0F10),
      error: Color(0xFFDC2626),
      onError: Color(0xFFFAFAFA),
      surface: Color(0xFFFFFFFF),
      onSurface: Color(0xFF0F0F10),
      surfaceContainerHighest: Color(0xFFE4E4E7),
      onSurfaceVariant: Color(0xFF64646A),
      outline: Color(0xFFE2E2E5),
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: colorScheme,
      textTheme: textTheme,
      scaffoldBackgroundColor: const Color(0xFFF8F9FA), // Canvas Light
      inputDecorationTheme: const InputDecorationTheme(
        floatingLabelBehavior: FloatingLabelBehavior.auto,
        filled: true,
        fillColor: Colors.transparent,
        border: OutlineInputBorder(borderSide: BorderSide(color: Color(0xFFE2E2E5)), borderRadius: BorderRadius.all(Radius.circular(12))),
        enabledBorder: OutlineInputBorder(borderSide: BorderSide(color: Color(0xFFE2E2E5)), borderRadius: BorderRadius.all(Radius.circular(12))),
        focusedBorder: OutlineInputBorder(borderSide: BorderSide(color: Color(0xFF18181B), width: 1.5), borderRadius: BorderRadius.all(Radius.circular(12))),
        contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        labelStyle: TextStyle(color: Color(0xFF64646A)),
        floatingLabelStyle: TextStyle(color: Color(0xFF18181B), fontWeight: FontWeight.w600),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: const Color(0xFFFFFFFF),
        shadowColor: const Color(0x0C000000),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: Color(0xFFE2E2E5), width: 1),
        ),
      ),
      appBarTheme: const AppBarTheme(
        elevation: 0,
        scrolledUnderElevation: 0,
        backgroundColor: Color(0xFFF5F5F5),
        foregroundColor: Color(0xFF0F0F10),
        centerTitle: false,
      ),
      snackBarTheme: const SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: Color(0xFF18181B),
        contentTextStyle: TextStyle(color: Color(0xFFFAFAFA)),
      ),
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: Color(0xFF18181B),
        foregroundColor: Color(0xFFFAFAFA),
        elevation: 4,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF18181B),
          foregroundColor: const Color(0xFFFAFAFA),
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(9999)),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: const Color(0xFF0F0F10),
          side: const BorderSide(color: Color(0xFFE2E2E5)),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(9999)),
        ),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: Color(0xFFFFFFFF),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
      ),
    );
  }
}
