import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/services/api_service.dart';
import '../core/services/storage_service.dart';
import '../providers/dio_provider.dart';
import '../providers/storage_provider.dart';

class AuthRepository {
  final ApiService _api;
  final StorageService _storage;

  const AuthRepository({
    required ApiService api,
    required StorageService storage,
  })  : _api = api,
        _storage = storage;

  Future<({String token, String userId})> login(
    String email,
    String password,
  ) async {
    final res = await _api.post('/auth/login', data: {
      'email': email,
      'password': password,
    });
    final token = res.data['token'] as String;
    final userId = res.data['userId'] as String;
    await _storage.write('auth_token', token);
    await _storage.write('user_id', userId);
    return (token: token, userId: userId);
  }

  Future<({String token, String userId})> signup(
    String email,
    String password,
    String username,
  ) async {
    final res = await _api.post('/auth/register', data: {
      'email': email,
      'password': password,
      'username': username,
    });
    final token = res.data['token'] as String;
    final userId = res.data['userId'] as String;
    await _storage.write('auth_token', token);
    await _storage.write('user_id', userId);
    return (token: token, userId: userId);
  }

  Future<({String token, String userId})?> restoreSession() async {
    final token = await _storage.read('auth_token');
    final userId = await _storage.read('user_id');
    if (token == null || userId == null) return null;
    return (token: token, userId: userId);
  }

  Future<void> logout() => _storage.deleteAll();
}

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AuthRepository(
    api: ref.read(apiServiceProvider),
    storage: ref.read(storageServiceProvider),
  ),
);
