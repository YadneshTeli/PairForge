import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../repositories/auth_repository.dart';

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
  late final AuthRepository _repo;

  @override
  AuthState build() {
    _repo = ref.read(authRepositoryProvider);
    _restoreSession();
    return const AuthState();
  }

  Future<void> _restoreSession() async {
    final session = await _repo.restoreSession();
    if (session != null) {
      state = state.copyWith(
        isAuthenticated: true,
        token: session.token,
        userId: session.userId,
      );
    }
  }

  Future<void> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final session = await _repo.login(email, password);
      state = state.copyWith(
        isAuthenticated: true,
        token: session.token,
        userId: session.userId,
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
      final session = await _repo.signup(email, password, username);
      state = state.copyWith(
        isAuthenticated: true,
        token: session.token,
        userId: session.userId,
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
    await _repo.logout();
    state = const AuthState();
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────

final authStateProvider =
    NotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);
