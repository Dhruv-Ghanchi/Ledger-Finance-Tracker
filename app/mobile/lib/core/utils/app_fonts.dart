/// Central font family constants used across the app.
///
/// Families are registered at runtime via `google_fonts` (see `main.dart`
/// where the theme is built). These raw string references then resolve
/// without needing the family to be bundled as an asset.
class AppFonts {
  AppFonts._();

  /// Display / heading typeface.
  static const String display = 'Outfit';

  /// Body typeface.
  static const String body = 'IBM Plex Sans';

  /// Numbers / tabular data typeface.
  static const String mono = 'JetBrains Mono';
}
