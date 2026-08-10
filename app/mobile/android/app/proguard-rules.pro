# Flutter's own engine/plugin classes are kept automatically by the Flutter
# Gradle plugin's bundled rules. These cover the few third-party SDKs in this
# app that are known to break under aggressive R8 shrinking/obfuscation.

# Firebase Auth / Firestore internals use reflection for some transports.
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# Google Sign-In / Play Services auth.
-keep class com.google.android.gms.auth.** { *; }
-dontwarn com.google.android.gms.**

# Razorpay checkout SDK — keep its public API and payment result callbacks.
-keep class com.razorpay.** { *; }
-dontwarn com.razorpay.**
-optimizations !method/removal/parameter
-keepclasseswithmembers class * {
  public void onPayment*(...);
}
-keepattributes JavascriptInterface
-keepattributes *Annotation*
