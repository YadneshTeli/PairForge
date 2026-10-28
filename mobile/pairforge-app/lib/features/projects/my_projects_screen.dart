import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers/app_providers.dart';
import '../../ui/widgets.dart';

class MyProjectsScreen extends ConsumerWidget {
  const MyProjectsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final projects = ref.watch(myProjectsProvider);
    return projects.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => ErrorView(message: error.toString(), onRetry: () => ref.invalidate(myProjectsProvider)),
      data: (items) {
        if (items.isEmpty) {
          return EmptyView(
            title: 'No projects yet',
            message: 'Post an idea to start collecting ratings from other roles.',
            actionLabel: 'Post a project',
            onAction: () => context.push('/projects/new'),
          );
        }
        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: items.length + 1,
          separatorBuilder: (context, index) => const SizedBox(height: 12),
          itemBuilder: (context, index) {
            if (index == 0) {
              return FilledButton.icon(
                onPressed: () => context.push('/projects/new'),
                icon: const Icon(Icons.add),
                label: const Text('Post a project'),
              );
            }
            final project = items[index - 1];
            return Card(
              child: ListTile(
                title: Text(project.title),
                subtitle: ScoreReadout(band: project.band, score: project.successScore, count: project.ratingCount),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push('/projects/${project.id}'),
              ),
            );
          },
        );
      },
    );
  }
}
