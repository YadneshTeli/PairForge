import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../data/api.dart';
import '../../models/models.dart';
import '../../providers/app_providers.dart';
import '../../providers/auth_provider.dart';
import '../../providers/dio_provider.dart';
import '../../ui/widgets.dart';

class ProjectDetailScreen extends ConsumerWidget {
  const ProjectDetailScreen({super.key, required this.projectId});

  final String projectId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final project = ref.watch(_projectProvider(projectId));
    final me = ref.watch(authStateProvider).profileId;
    return Scaffold(
      appBar: AppBar(title: const Text('Project')),
      body: project.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => ErrorView(message: error.toString(), onRetry: () => ref.invalidate(_projectProvider(projectId))),
        data: (item) {
          final owner = item.ownerId == me;
          return ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Row(children: [RoleBadge(role: item.owner?.role), const SizedBox(width: 8), Text(item.stage)]),
              const SizedBox(height: 12),
              Text(item.title, style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 8),
              Text(item.tagline, style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 16),
              Text(item.description),
              const SizedBox(height: 16),
              Wrap(spacing: 8, children: item.tags.map((tag) => Chip(label: Text(tag))).toList()),
              if (item.lookingFor.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text('Looking for ${item.lookingFor.join(', ')}'),
              ],
              if (item.owner != null) ...[
                const SizedBox(height: 8),
                Text('Owner ${item.owner!.displayName}'),
              ],
              if (owner) ...[
                const SizedBox(height: 20),
                ScoreReadout(band: item.band, score: item.successScore, count: item.ratingCount),
                const SizedBox(height: 16),
                FilledButton(onPressed: () => context.push('/projects/${item.id}/requests'), child: const Text('Requests')),
                const SizedBox(height: 8),
                OutlinedButton(onPressed: () => context.push('/projects/${item.id}/edit'), child: const Text('Edit')),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: () async {
                    try {
                      await ref.read(apiProvider).deleteProject(item.id);
                      ref.invalidate(myProjectsProvider);
                      if (context.mounted) context.go('/mine');
                    } on ApiException catch (error) {
                      if (context.mounted) await showError(context, error);
                    }
                  },
                  child: const Text('Delete'),
                ),
                _Members(projectId: item.id),
              ] else ...[
                const SizedBox(height: 20),
                OutlinedButton(
                  onPressed: () async {
                    final message = await askForText(context, title: 'Ask to join', label: 'What would you take on?');
                    if (message == null || message.length < 3 || !context.mounted) return;
                    try {
                      await ref.read(apiProvider).requestToJoin(item.id, message);
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Request sent')));
                      }
                    } on ApiException catch (error) {
                      if (context.mounted) await showError(context, error);
                    }
                  },
                  child: const Text('Ask to join the team'),
                ),
                TextButton(
                  onPressed: () async {
                    final reason = await askForText(context, title: 'Report project', label: 'What is wrong?', action: 'Report');
                    if (reason == null || reason.length < 3 || !context.mounted) return;
                    try {
                      await ref.read(apiProvider).report(targetType: 'project', targetId: item.id, reason: reason);
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Report saved')));
                      }
                    } on ApiException catch (error) {
                      if (context.mounted) await showError(context, error);
                    }
                  },
                  child: const Text('Report'),
                ),
              ],
            ],
          );
        },
      ),
    );
  }
}

final _projectProvider = FutureProvider.family<Project, String>((ref, id) {
  return ref.watch(apiProvider).project(id);
});

class _Members extends ConsumerWidget {
  const _Members({required this.projectId});

  final String projectId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (projectId.isEmpty) return const SizedBox.shrink();
    final members = ref.watch(_membersProvider(projectId));
    return members.maybeWhen(
      data: (people) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 16),
          Text('Team', style: Theme.of(context).textTheme.titleMedium),
          for (final person in people)
            ListTile(contentPadding: EdgeInsets.zero, title: Text(person.displayName), trailing: RoleBadge(role: person.role)),
        ],
      ),
      orElse: () => const SizedBox.shrink(),
    );
  }
}

final _membersProvider = FutureProvider.family<List<PersonRef>, String>((ref, id) {
  return ref.watch(apiProvider).members(id);
});
