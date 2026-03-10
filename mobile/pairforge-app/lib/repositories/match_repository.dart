import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/services/api_service.dart';
import '../models/match_model.dart';
import '../providers/dio_provider.dart';

class MatchRepository {
  final ApiService _api;

  const MatchRepository({required ApiService api}) : _api = api;

  Future<List<Map<String, dynamic>>> getRecommendations(
    String userId, {
    int limit = 20,
  }) async {
    final res = await _api.get(
      '/match/recommendations/$userId',
      params: {'limit': limit},
    );
    return List<Map<String, dynamic>>.from(
      res.data['recommendations'] as List,
    );
  }

  Future<void> swipeRight(String userId, String targetUserId) =>
      _api.post('/match/like', data: {
        'userId': userId,
        'targetUserId': targetUserId,
      });

  Future<void> swipeLeft(String userId, String targetUserId) =>
      _api.post('/match/pass', data: {
        'userId': userId,
        'targetUserId': targetUserId,
      });

  Future<List<MatchModel>> getMatches(String userId) async {
    final res = await _api.get('/match/matches/$userId');
    return (res.data['matches'] as List)
        .map((e) => MatchModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}

final matchRepositoryProvider = Provider<MatchRepository>(
  (ref) => MatchRepository(api: ref.read(apiServiceProvider)),
);
