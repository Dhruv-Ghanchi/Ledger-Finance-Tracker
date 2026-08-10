import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../network/api_client.dart';
import 'workspace_provider.dart';

/// Central data-version counter. Bumping it invalidates every data provider
/// that depends on it, so the whole dashboard refreshes after a mutation.
class DataVersionNotifier extends StateNotifier<int> {
  DataVersionNotifier() : super(0);

  void bump() => state++;
}

final dataVersionProvider = StateNotifierProvider<DataVersionNotifier, int>(
  (ref) => DataVersionNotifier(),
);

/// Fired when a Premium-only feature is attempted by a non-premium user.
final premiumRequiredProvider = StateProvider<int>((ref) => 0);

/// Convenience: request a full data refresh.
void bumpDataRefresh(WidgetRef ref) =>
    ref.read(dataVersionProvider.notifier).bump();

/// Convenience: signal a premium-required event so the UI can prompt upgrade.
void requirePremium(WidgetRef ref) {
  ref.read(premiumRequiredProvider.notifier).state++;
}

final categoriesProvider = FutureProvider<List<dynamic>>((ref) async {
  ref.watch(dataVersionProvider);
  final workspace = ref.watch(workspaceProvider);
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/categories', queryParameters: {'workspace': workspace});
  return response.data as List<dynamic>;
});

final debtsProvider = FutureProvider<List<dynamic>>((ref) async {
  ref.watch(dataVersionProvider);
  final workspace = ref.watch(workspaceProvider);
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/debts', queryParameters: {'workspace': workspace});
  return response.data as List<dynamic>;
});

final entriesProvider = FutureProvider.family<List<dynamic>, int>((ref, fyStart) async {
  ref.watch(dataVersionProvider);
  final workspace = ref.watch(workspaceProvider);
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/entries', queryParameters: {'fy_start': fyStart, 'workspace': workspace});
  return response.data as List<dynamic>;
});

final monthlySummaryProvider = FutureProvider.family<Map<String, dynamic>, ({int year, int month})>((ref, params) async {
  ref.watch(dataVersionProvider);
  final workspace = ref.watch(workspaceProvider);
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/summary/monthly', queryParameters: {
    'year': params.year,
    'month': params.month,
    'workspace': workspace,
  });
  return response.data as Map<String, dynamic>;
});

final yearlySummaryProvider = FutureProvider.family<Map<String, dynamic>, int>((ref, fyStart) async {
  ref.watch(dataVersionProvider);
  final workspace = ref.watch(workspaceProvider);
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/summary/yearly', queryParameters: {'fy_start': fyStart, 'workspace': workspace});
  return response.data as Map<String, dynamic>;
});
