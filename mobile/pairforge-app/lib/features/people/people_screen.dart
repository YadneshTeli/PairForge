import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../data/api.dart';
import '../../providers/app_providers.dart';
import '../../ui/widgets.dart';

class PeopleScreen extends ConsumerWidget {
  const PeopleScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final people = ref.watch(peopleProvider);
    return people.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => ErrorView(message: error.toString(), onRetry: () => ref.invalidate(peopleProvider)),
      data: (items) {
        if (items.isEmpty) {
          return const EmptyView(
            title: 'No one new right now',
            message: 'You have seen the people who are open to a connection. Check back later.',
          );
        }
        final person = items.first;
        return Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              Expanded(
                child: Card(
                  child: InkWell(
                    borderRadius: BorderRadius.circular(20),
                    onTap: () => context.push('/people/${person.id}'),
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          RoleBadge(role: person.role),
                          const SizedBox(height: 16),
                          Text(person.displayName, style: Theme.of(context).textTheme.headlineSmall),
                          if (person.experienceLevel != null) Text(person.experienceLevel!),
                          const SizedBox(height: 12),
                          Text(person.bio ?? 'No bio yet'),
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 8,
                            children: person.skills.map((skill) => Chip(label: Text(skill.name))).toList(),
                          ),
                          const Spacer(),
                          Text(person.interests.join(' · ')),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(child: OutlinedButton(onPressed: () => _swipe(context, ref, person.id, 'pass'), child: const Text('Pass'))),
                  const SizedBox(width: 12),
                  Expanded(child: FilledButton(onPressed: () => _swipe(context, ref, person.id, 'like'), child: const Text('Like'))),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _swipe(BuildContext context, WidgetRef ref, String id, String action) async {
    try {
      final matchId = await ref.read(peopleProvider.notifier).swipe(id, action);
      if (matchId != null && context.mounted) context.push('/matches/$matchId');
    } on ApiException catch (error) {
      if (context.mounted) await showError(context, error);
    }
  }
}
