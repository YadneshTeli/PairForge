import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/services/api_service.dart';
import '../models/profile_model.dart';
import '../providers/dio_provider.dart';

class UserRepository {
  final ApiService _api;

  const UserRepository({required ApiService api}) : _api = api;

  Future<ProfileModel> getProfile(String userId) async {
    final res = await _api.get('/users/$userId/profile');
    return ProfileModel.fromJson(res.data as Map<String, dynamic>);
  }

  Future<void> updateProfile(String userId, Map<String, dynamic> data) =>
      _api.put('/users/$userId/profile', data: data);
}

final userRepositoryProvider = Provider<UserRepository>(
  (ref) => UserRepository(api: ref.read(apiServiceProvider)),
);
