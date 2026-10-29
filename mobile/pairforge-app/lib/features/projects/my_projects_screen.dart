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
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const SectionTitle('Your projects', 'Ideas you have posted, and how other roles scored them.'),
            FilledButton.icon(
              onPressed: () => context.push('/projects/new'),
              icon: const Icon(Icons.add),
              label: const Text('Post a project'),
            ),
            const SizedBox(height: 12),
            for (final project in items) ...[
              Card(
                child: ListTile(
                  title: Text(project.title),
                  subtitle: Text(project.tagline),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push('/projects/${project.id}'),
                ),
              ),
              const SizedBox(height: 8),
              ScoreReadout(band: project.band, score: project.successScore, count: project.ratingCount),
              const SizedBox(height: 12),
            ],
          ],
        );
      },
    );
  }
}
