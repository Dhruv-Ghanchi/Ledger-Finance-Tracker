import 'package:dio/dio.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/app_config.dart';
import '../providers/data_providers.dart';

final apiClientProvider = Provider<Dio>((ref) {
  final dio = Dio(
    BaseOptions(
      baseUrl: AppConfig.backendUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 20),
      sendTimeout: const Duration(seconds: 20),
    ),
  );

  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        final user = FirebaseAuth.instance.currentUser;
        if (user != null) {
          try {
            final token = await user.getIdToken();
            if (token != null) {
              options.headers['Authorization'] = 'Bearer $token';
            }
          } catch (e) {
            debugPrint('Failed to refresh auth token: $e');
          }
        }
        return handler.next(options);
      },
      onError: (DioException e, handler) {
        if (e.response?.statusCode == 401) {
          // Session expired / invalid token. Signing out triggers the router
          // redirect back to the login screen.
          debugPrint('Unauthorized! Forcing re-login.');
          FirebaseAuth.instance.signOut().catchError((_) {});
        } else if (e.response?.statusCode == 403) {
          // Premium feature accessed without an active plan/trial.
          debugPrint('Premium feature accessed without subscription.');
          ref.read(premiumRequiredProvider.notifier).state++;
        }
        return handler.next(e);
      },
    ),
  );

  return dio;
});

/// Human-readable error message extracted from a [DioException].
String apiErrorMessage(Object error, {String fallback = 'Something went wrong. Please try again.'}) {
  if (error is DioException) {
    final data = error.response?.data;
    if (data is Map && data['detail'] != null) {
      return data['detail'].toString();
    }
    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.sendTimeout ||
        error.type == DioExceptionType.receiveTimeout) {
      return 'Network timeout. Check your connection and try again.';
    }
    if (error.type == DioExceptionType.connectionError) {
      return 'Cannot reach the server. Check your internet connection.';
    }
    final status = error.response?.statusCode;
    if (status == 401) return 'Your session has expired. Please sign in again.';
    if (status == 403) return 'Premium access is required for this feature.';
  }
  return fallback;
}
