import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/services/api_service.dart';
import '../models/project_model.dart';
import '../providers/dio_provider.dart';

class ProjectRepository {
  final ApiService _api;

  const ProjectRepository({required ApiService api}) : _api = api;

  Future<List<ProjectModel>> getProjects() async {
    final res = await _api.get('/projects');
    return (res.data['projects'] as List)
        .map((e) => ProjectModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<ProjectModel> createProject(Map<String, dynamic> data) async {
    final res = await _api.post('/projects', data: data);
    return ProjectModel.fromJson(res.data as Map<String, dynamic>);
  }

  Future<void> joinProject(String projectId) =>
      _api.post('/projects/$projectId/join');
}

final projectRepositoryProvider = Provider<ProjectRepository>(
  (ref) => ProjectRepository(api: ref.read(apiServiceProvider)),
);
