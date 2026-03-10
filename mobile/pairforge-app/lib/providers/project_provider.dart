import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../models/project_model.dart';
import '../repositories/project_repository.dart';

// ─── Project State ────────────────────────────────────────────────────────────

class ProjectState {
  final List<ProjectModel> projects;
  final bool isLoading;
  final String? error;

  const ProjectState({
    this.projects = const [],
    this.isLoading = false,
    this.error,
  });

  ProjectState copyWith({
    List<ProjectModel>? projects,
    bool? isLoading,
    String? error,
  }) =>
      ProjectState(
        projects: projects ?? this.projects,
        isLoading: isLoading ?? this.isLoading,
        error: error,
      );
}

// ─── Project Notifier ─────────────────────────────────────────────────────────

class ProjectNotifier extends Notifier<ProjectState> {
  late final ProjectRepository _repo;

  @override
  ProjectState build() {
    _repo = ref.read(projectRepositoryProvider);
    fetchProjects();
    return const ProjectState();
  }

  Future<void> fetchProjects() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final projects = await _repo.getProjects();
      state = state.copyWith(projects: projects, isLoading: false);
    } on DioException catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.response?.data['message'] as String? ?? 'Failed to load projects',
      );
    }
  }

  Future<void> createProject(Map<String, dynamic> data) async {
    try {
      await _repo.createProject(data);
      await fetchProjects();
    } on DioException catch (_) {}
  }

  Future<void> joinProject(String projectId) async {
    try {
      await _repo.joinProject(projectId);
      await fetchProjects();
    } on DioException catch (_) {}
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

final projectProvider =
    NotifierProvider<ProjectNotifier, ProjectState>(ProjectNotifier.new);
