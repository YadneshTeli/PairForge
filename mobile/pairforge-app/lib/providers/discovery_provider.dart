import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../repositories/match_repository.dart';
import 'auth_provider.dart';

// ─── Profile Card Model ───────────────────────────────────────────────────────

class DiscoveryProfile {
  final String userId;
  final String displayName;
  final String? avatarUrl;
  final String? bio;
  final List<String> skills;
  final String experienceLevel;
  final double compatibilityScore;

  const DiscoveryProfile({
    required this.userId,
    required this.displayName,
    this.avatarUrl,
    this.bio,
    this.skills = const [],
    required this.experienceLevel,
    this.compatibilityScore = 0.0,
  });

  factory DiscoveryProfile.fromJson(Map<String, dynamic> json) =>
      DiscoveryProfile(
        userId: json['userId'] as String,
        displayName: json['displayName'] as String,
        avatarUrl: json['avatarUrl'] as String?,
        bio: json['bio'] as String?,
        skills: List<String>.from(json['skills'] as List? ?? []),
        experienceLevel: json['experienceLevel'] as String,
        compatibilityScore:
            (json['compatibilityScore'] as num?)?.toDouble() ?? 0.0,
      );
}

// ─── Discovery State ──────────────────────────────────────────────────────────

class DiscoveryState {
  final List<DiscoveryProfile> profiles;
  final bool isLoading;
  final String? error;
  final int currentIndex;

  const DiscoveryState({
    this.profiles = const [],
    this.isLoading = false,
    this.error,
    this.currentIndex = 0,
  });

  DiscoveryProfile? get currentProfile =>
      profiles.isEmpty ? null : profiles[currentIndex % profiles.length];

  DiscoveryState copyWith({
    List<DiscoveryProfile>? profiles,
    bool? isLoading,
    String? error,
    int? currentIndex,
  }) {
    return DiscoveryState(
      profiles: profiles ?? this.profiles,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      currentIndex: currentIndex ?? this.currentIndex,
    );
  }
}

// ─── Discovery Notifier ───────────────────────────────────────────────────────

class DiscoveryNotifier extends Notifier<DiscoveryState> {
  late final MatchRepository _repo;
  late final String _userId;

  @override
  DiscoveryState build() {
    _repo = ref.read(matchRepositoryProvider);
    _userId = ref.read(authStateProvider).userId ?? '';
    fetchProfiles();
    return const DiscoveryState();
  }

  Future<void> fetchProfiles() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final data = await _repo.getRecommendations(_userId);
      final profiles =
          data.map((e) => DiscoveryProfile.fromJson(e)).toList();
      state = state.copyWith(profiles: profiles, isLoading: false);
    } on DioException catch (e) {
      state = state.copyWith(
        isLoading: false,
        error:
            e.response?.data['message'] as String? ?? 'Failed to load profiles',
      );
    }
  }

  Future<void> swipeRight(String targetUserId) async {
    try {
      await _repo.swipeRight(_userId, targetUserId);
    } catch (_) {}
    _advance();
  }

  void swipeLeft(String targetUserId) => _advance();

  void _advance() {
    final next = state.currentIndex + 1;
    state = state.copyWith(currentIndex: next);
    if (next >= state.profiles.length - 5) fetchProfiles();
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

final discoveryProvider =
    NotifierProvider<DiscoveryNotifier, DiscoveryState>(DiscoveryNotifier.new);
