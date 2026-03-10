import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../models/match_model.dart';
import '../repositories/match_repository.dart';
import 'auth_provider.dart';

// ─── Match State ──────────────────────────────────────────────────────────────

class MatchState {
  final List<MatchModel> matches;
  final bool isLoading;
  final String? error;

  const MatchState({
    this.matches = const [],
    this.isLoading = false,
    this.error,
  });

  MatchState copyWith({
    List<MatchModel>? matches,
    bool? isLoading,
    String? error,
  }) =>
      MatchState(
        matches: matches ?? this.matches,
        isLoading: isLoading ?? this.isLoading,
        error: error,
      );
}

// ─── Match Notifier ───────────────────────────────────────────────────────────

class MatchNotifier extends Notifier<MatchState> {
  late final MatchRepository _repo;
  late final String _userId;

  @override
  MatchState build() {
    _repo = ref.read(matchRepositoryProvider);
    _userId = ref.read(authStateProvider).userId ?? '';
    fetchMatches();
    return const MatchState();
  }

  Future<void> fetchMatches() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final matches = await _repo.getMatches(_userId);
      state = state.copyWith(matches: matches, isLoading: false);
    } on DioException catch (e) {
      state = state.copyWith(
        isLoading: false,
        error:
            e.response?.data['message'] as String? ?? 'Failed to load matches',
      );
    }
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

final matchProvider =
    NotifierProvider<MatchNotifier, MatchState>(MatchNotifier.new);
