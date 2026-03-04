import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dio_provider.dart';
import 'storage_provider.dart';

// ─── Auth State ──────────────────────────────────────────────────────────────

class AuthState {
  final bool isAuthenticated;
  final String? userId;
  final String? token;
  final bool isLoading;
  final String? error;

  const AuthState({
    this.isAuthenticated = false,
    this.userId,
    this.token,
    this.isLoading = false,
    this.error,
  });

  AuthState copyWith({
    bool? isAuthenticated,
    String? userId,
    String? token,
    bool? isLoading,
    String? error,
  }) {
    return AuthState(
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      userId: userId ?? this.userId,
      token: token ?? this.token,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

// ─── Auth Notifier ───────────────────────────────────────────────────────────

class AuthNotifier extends Notifier<AuthState> {
  late final Dio _dio;
  late final FlutterSecureStorage _storage;

  @override
  AuthState build() {
    _dio = ref.read(dioProvider);
    _storage = ref.read(secureStorageProvider);
    _restoreSession();
    return const AuthState();
  }

  Future<void> _restoreSession() async {
    final token = await _storage.read(key: 'auth_token');
    final userId = await _storage.read(key: 'user_id');
    if (token != null && userId != null) {
      _dio.options.headers['Authorization'] = 'Bearer $token';
      state = state.copyWith(
        isAuthenticated: true,
        token: token,
        userId: userId,
      );
    }
  }

  Future<void> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final response = await _dio.post('/auth/login', data: {
        'email': email,
        'password': password,
      });
      final token = response.data['token'] as String;
      final userId = response.data['userId'] as String;

      await _storage.write(key: 'auth_token', value: token);
      await _storage.write(key: 'user_id', value: userId);
      _dio.options.headers['Authorization'] = 'Bearer $token';

      state = state.copyWith(
        isAuthenticated: true,
        token: token,
        userId: userId,
        isLoading: false,
      );
    } on DioException catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.response?.data['message'] as String? ?? 'Login failed',
      );
    }
  }

  Future<void> signup(String email, String password, String username) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final response = await _dio.post('/auth/register', data: {
        'email': email,
        'password': password,
        'username': username,
      });
      final token = response.data['token'] as String;
      final userId = response.data['userId'] as String;

      await _storage.write(key: 'auth_token', value: token);
      await _storage.write(key: 'user_id', value: userId);
      _dio.options.headers['Authorization'] = 'Bearer $token';

      state = state.copyWith(
        isAuthenticated: true,
        token: token,
        userId: userId,
        isLoading: false,
      );
    } on DioException catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.response?.data['message'] as String? ?? 'Signup failed',
      );
    }
  }

  Future<void> logout() async {
    await _storage.deleteAll();
    _dio.options.headers.remove('Authorization');
    state = const AuthState();
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────

final authStateProvider =
    NotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);
