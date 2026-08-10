import 'package:dio/dio.dart';

void main() async {
  print('Running backend connectivity test...');
  final dio = Dio(
    BaseOptions(
      baseUrl: 'https://expense-tracker-h6e9.onrender.com/api',
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
    ),
  );

  try {
    print('Pinging root endpoint...');
    final response = await dio.get('/');
    print('✅ SUCCESS: Connected to backend!');
    print('Response status: ${response.statusCode}');
    print('Response data: ${response.data}');

    print('\nTesting /users/sync (without auth token to verify 401 handling)...');
    try {
      await dio.post('/users/sync', data: {
        'name': 'Test User',
        'provider': 'test',
      });
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        print('✅ SUCCESS: Backend correctly rejected unauthorized request (401)');
      } else {
        print('❌ FAILED: Unexpected status code: ${e.response?.statusCode}');
      }
    }
  } catch (e) {
    print('❌ FAILED: Could not reach backend. Error: $e');
  }
}
