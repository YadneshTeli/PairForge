import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/api.dart';
import '../models/models.dart';
import 'dio_provider.dart';

class AuthState {
  const AuthState({
    this.ready = false,
    this.token,
    this.userId,
    this.profileId,
    this.displayName,
    this.role,
    this.isLoading = false,
    this.error,
  });

  final bool ready;
  final String? token;
  final String? userId;
  final String? profileId;
  final String? displayName;
  final String? role;
  final bool isLoading;
  final String? error;

  bool get isAuthenticated => token != null && token!.isNotEmpty;

  AuthState copy({
    bool? ready,
    String? token,
    String? userId,
    String? profileId,
    String? displayName,
    String? role,
    bool clearRole = false,
    bool? isLoading,
    String? error,
    bool clearError = false,
  }) {
    return AuthState(
      ready: ready ?? this.ready,
      token: token ?? this.token,
      userId: userId ?? this.userId,
      profileId: profileId ?? this.profileId,
      displayName: displayName ?? this.displayName,
      role: clearRole ? null : (role ?? this.role),
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

class AuthNotifier extends Notifier<AuthState> {
  @override
  AuthState build() {
    Future.microtask(_restore);
    return const AuthState();
  }

  Future<void> _restore() async {
    try {
      final storage = ref.read(secureStorageProvider);
      final token = await storage.read(key: authTokenKey);
      if (token == null || token.isEmpty) {
        state = const AuthState(ready: true);
        return;
      }
      final session = await ref.read(apiProvider).me(token);
      state = _fromSession(session);
    } catch (_) {
      state = const AuthState(ready: true);
    }
  }

  AuthState _fromSession(Session session) {
    return AuthState(
      ready: true,
      token: session.token,
      userId: session.userId,
      profileId: session.profileId,
      displayName: session.displayName,
      role: session.role,
    );
  }

  Future<void> _persist(Session session) async {
    final storage = ref.read(secureStorageProvider);
    await storage.write(key: authTokenKey, value: session.token);
    state = _fromSession(session);
  }

  Future<void> login(String email, String password) async {
    state = state.copy(isLoading: true, clearError: true);
    try {
      final session = await ref.read(apiProvider).login(email: email, password: password);
      await _persist(session);
    } on ApiException catch (error) {
      state = state.copy(isLoading: false, error: error.message);
    }
  }

  Future<void> signup({
    required String email,
    required String username,
    required String password,
    required String displayName,
  }) async {
    state = state.copy(isLoading: true, clearError: true);
    try {
      final session = await ref.read(apiProvider).register(
        email: email,
        username: username,
        password: password,
        displayName: displayName,
      );
      await _persist(session);
    } on ApiException catch (error) {
      state = state.copy(isLoading: false, error: error.message);
    }
  }

  Future<String?> setRole(String role) async {
    state = state.copy(isLoading: true, clearError: true);
    try {
      final profile = await ref.read(apiProvider).setRole(role);
      state = state.copy(isLoading: false, role: profile.role, displayName: profile.displayName);
      return null;
    } on ApiException catch (error) {
      state = state.copy(isLoading: false, error: error.message);
      return error.message;
    }
  }

  void rememberProfile(Profile profile) {
    state = state.copy(displayName: profile.displayName, role: profile.role);
  }

  Future<void> logout() async {
    try {
      await ref.read(secureStorageProvider).delete(key: authTokenKey);
    } catch (_) {}
    state = const AuthState(ready: true);
  }
}

final authStateProvider = NotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);
