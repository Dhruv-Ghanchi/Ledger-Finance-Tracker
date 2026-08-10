import 'package:dio/dio.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../network/api_client.dart';

class AuthState {
  final User? firebaseUser;
  final Map<String, dynamic>? dbUser;
  final bool isLoading;

  AuthState({
    this.firebaseUser,
    this.dbUser,
    this.isLoading = true,
  });

  AuthState copyWith({
    User? firebaseUser,
    Map<String, dynamic>? dbUser,
    bool? isLoading,
  }) {
    return AuthState(
      firebaseUser: firebaseUser ?? this.firebaseUser,
      dbUser: dbUser ?? this.dbUser,
      isLoading: isLoading ?? this.isLoading,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final Dio apiClient;

  AuthNotifier(this.apiClient, {bool autoInit = true}) : super(AuthState()) {
    if (autoInit) {
      _init();
    }
  }

  void _init() {
    FirebaseAuth.instance.authStateChanges().listen((User? user) async {
      if (user != null) {
        state = state.copyWith(firebaseUser: user, isLoading: true);
        try {
          // Attempt to sync with backend as done in React AuthContext
          final providerData = user.providerData.isNotEmpty
              ? user.providerData.first
              : null;

          final payload = <String, dynamic>{};

          final name = user.displayName ?? providerData?.displayName;
          if (name != null && name.isNotEmpty) {
            payload['name'] = name;
          }
          final photo = user.photoURL ?? providerData?.photoURL ?? '';
          if (photo.isNotEmpty) {
            payload['profile_picture'] = photo;
          }
          final phone = user.phoneNumber ?? providerData?.phoneNumber ?? '';
          if (phone.isNotEmpty) {
            payload['phone'] = phone;
          }
          payload['provider'] = providerData?.providerId ?? 'email';

          final response = await apiClient.post('/users/sync', data: payload);

          state = state.copyWith(dbUser: response.data, isLoading: false);
        } catch (e) {
          debugPrint('Failed to sync user with backend: $e');
          state = state.copyWith(isLoading: false);
        }
      } else {
        state = AuthState(isLoading: false);
      }
    });
  }

  Future<void> syncWithBackend({String? promoCode}) async {
    final user = state.firebaseUser;
    if (user != null) {
      try {
        final providerData = user.providerData.isNotEmpty
            ? user.providerData.first
            : null;

        final payload = <String, dynamic>{};

        final name = user.displayName ?? providerData?.displayName;
        if (name != null && name.isNotEmpty) {
          payload['name'] = name;
        }
        final photo = user.photoURL ?? providerData?.photoURL ?? '';
        if (photo.isNotEmpty) {
          payload['profile_picture'] = photo;
        }
        final phone = user.phoneNumber ?? providerData?.phoneNumber ?? '';
        if (phone.isNotEmpty) {
          payload['phone'] = phone;
        }
        payload['provider'] = providerData?.providerId ?? 'email';

        if (promoCode != null && promoCode.isNotEmpty) {
          payload['promo_code'] = promoCode;
        }

        final response = await apiClient.post('/users/sync', data: payload);

        state = state.copyWith(dbUser: response.data);
      } catch (e) {
        debugPrint('Failed to manual sync: $e');
      }
    }
  }

  Future<void> logout() async {
    await FirebaseAuth.instance.signOut();
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final dio = ref.watch(apiClientProvider);
  return AuthNotifier(dio);
});
