import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../data/api.dart';
import '../../models/models.dart';
import '../../providers/app_providers.dart';
import '../../providers/dio_provider.dart';
import '../../core/constants/colors.dart';
import '../../ui/widgets.dart';

class ProjectFeedScreen extends ConsumerWidget {
  const ProjectFeedScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final feed = ref.watch(feedProvider);
    return feed.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => ErrorView(message: error.toString(), onRetry: () => ref.invalidate(feedProvider)),
      data: (projects) {
        if (projects.isEmpty) {
          return const EmptyView(
            title: 'No projects left',
            message: 'You have seen everything in the feed. Check back when someone posts a new idea.',
          );
        }
        final project = projects.first;
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SectionTitle('Discover', 'Rate the next project from the seat you chose.'),
              Expanded(child: _ProjectCard(project: project)),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => _swipe(context, ref, project, 'pass'),
                      child: const Text('Pass'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: FilledButton(
                      onPressed: () => _swipe(context, ref, project, 'like'),
                      child: const Text('Like'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: FilledButton(
                      style: FilledButton.styleFrom(backgroundColor: AppColors.cta, foregroundColor: Colors.white),
                      onPressed: () => _swipe(context, ref, project, 'superlike'),
                      child: const Text('Superlike'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _swipe(BuildContext context, WidgetRef ref, Project project, String action) async {
    Map<String, int>? ratings;
    if (action != 'pass') {
      final criteria = await ref.read(criteriaProvider.future);
      if (!context.mounted) return;
      ratings = await showModalBottomSheet<Map<String, int>>(
        context: context,
        isDismissible: false,
        enableDrag: false,
        isScrollControlled: true,
        builder: (context) => RatingSheet(criteria: criteria, superlike: action == 'superlike'),
      );
      if (ratings == null || !context.mounted) return;
    }
    try {
      await ref.read(apiProvider).swipeProject(project.id, action, ratings);
      await ref.read(feedProvider.notifier).remove(project.id);
    } on ApiException catch (error) {
      if (context.mounted) await showError(context, error);
    }
  }
}

class _ProjectCard extends StatelessWidget {
  const _ProjectCard({required this.project});

  final Project project;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: () => context.push('/projects/${project.id}'),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  RoleBadge(role: project.owner?.role),
                  const Spacer(),
                  StageChip(project.stage),
                ],
              ),
              const SizedBox(height: 20),
              Text(project.title, style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 8),
              Text(project.tagline, style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 16),
              Text(project.description, maxLines: 6, overflow: TextOverflow.ellipsis),
              const Spacer(),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: project.tags.map((tag) => Chip(label: Text(tag))).toList(),
              ),
              if (project.owner != null) ...[
                const SizedBox(height: 12),
                Text('Posted by ${project.owner!.displayName}'),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class RatingSheet extends StatefulWidget {
  const RatingSheet({super.key, required this.criteria, required this.superlike});

  final List<Criterion> criteria;
  final bool superlike;

  @override
  State<RatingSheet> createState() => _RatingSheetState();
}

class _RatingSheetState extends State<RatingSheet> {
  late final Map<String, int> _scores = {for (final item in widget.criteria) item.key: 3};

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 16, 20, 16 + MediaQuery.viewInsetsOf(context).bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(widget.superlike ? 'Superlike' : 'Like', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 4),
          Text(widget.superlike
              ? 'A superlike asks the owner to connect. Score all three before it is sent.'
              : 'Score all three. Nothing is saved until you submit.'),
          const SizedBox(height: 12),
          for (final item in widget.criteria)
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${item.label} · ${_scores[item.key]}'),
                Slider(
                  value: (_scores[item.key] ?? 3).toDouble(),
                  min: 1,
                  max: 5,
                  divisions: 4,
                  label: '${_scores[item.key]}',
                  onChanged: (value) => setState(() => _scores[item.key] = value.round()),
                ),
              ],
            ),
          Row(
            children: [
              Expanded(child: OutlinedButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel'))),
              const SizedBox(width: 12),
              Expanded(child: FilledButton(onPressed: () => Navigator.pop(context, _scores), child: const Text('Submit'))),
            ],
          ),
        ],
      ),
    );
  }
}
