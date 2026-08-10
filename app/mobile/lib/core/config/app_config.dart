/// Centralized build-time configuration, overridable via --dart-define so a
/// build can point at a different backend or Razorpay key without editing
/// source. Defaults match production, so a plain `flutter run` still works.
///
/// Example (local backend + Razorpay test key):
///   flutter run \
///     --dart-define=BACKEND_URL=http://10.0.2.2:8000/api \
///     --dart-define=RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
///
/// Example (release build against live Razorpay):
///   flutter build apk --release \
///     --dart-define=RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx
class AppConfig {
  static const String backendUrl = String.fromEnvironment(
    'BACKEND_URL',
    defaultValue: 'https://ledger-finance-tracker-backend.onrender.com/api',
  );

  static const String razorpayKeyId = String.fromEnvironment(
    'RAZORPAY_KEY_ID',
    defaultValue: 'rzp_test_TMCLkHZWo6QOvj',
  );
}
