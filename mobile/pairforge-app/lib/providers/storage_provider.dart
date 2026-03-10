import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/services/storage_service.dart';

// Secure storage — for tokens, sensitive data
final secureStorageProvider = Provider<FlutterSecureStorage>((ref) {
  return const FlutterSecureStorage();
});

// Shared prefs — for non-sensitive app state
final sharedPreferencesProvider = FutureProvider<SharedPreferences>((ref) async {
  return SharedPreferences.getInstance();
});

// Convenience: current auth token
final authTokenProvider = FutureProvider<String?>((ref) async {
  final storage = ref.watch(secureStorageProvider);
  return storage.read(key: 'auth_token');
});

final storageServiceProvider = Provider<StorageService>(
  (ref) => StorageService(ref.read(secureStorageProvider)),
);
