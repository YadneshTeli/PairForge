import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../data/api.dart';
import '../../providers/app_providers.dart';
import '../../ui/widgets.dart';

class PeopleScreen extends ConsumerStatefulWidget {
  const PeopleScreen({super.key});

  @override
  ConsumerState<PeopleScreen> createState() => _PeopleScreenState();
}

class _PeopleScreenState extends ConsumerState<PeopleScreen> {
  final _skill = TextEditingController();

  @override
  void dispose() {
    _skill.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final people = ref.watch(peopleProvider);
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SectionTitle('People', 'Drag left to pass or right to like. Filter by a skill when you need a narrower list.'),
              Row(
                children: [
                  Expanded(child: TextField(controller: _skill, decoration: const InputDecoration(labelText: 'Skill', hintText: 'TypeScript'))),
                  const SizedBox(width: 8),
                  OutlinedButton(
                    onPressed: () => ref.read(peopleSkillProvider.notifier).set(_skill.text),
                    child: const Text('Filter'),
                  ),
                ],
              ),
            ],
          ),
        ),
        Expanded(child: people.when(
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
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                child: SwipeDeck(
                  onPass: () => _swipe(person.id, 'pass'),
                  onLike: () => _swipe(person.id, 'like'),
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
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(child: OutlinedButton(onPressed: () => _swipe(person.id, 'pass'), child: const Text('Pass'))),
                  const SizedBox(width: 12),
                  Expanded(child: FilledButton(onPressed: () => _swipe(person.id, 'like'), child: const Text('Like'))),
                ],
              ),
            ],
          ),
        );
      },
    )),
      ],
    );
  }

  Future<void> _swipe(String id, String action) async {
    try {
      final matchId = await ref.read(peopleProvider.notifier).swipe(id, action);
      if (!mounted) return;
      if (matchId != null) context.push('/matches/$matchId');
    } on ApiException catch (error) {
      if (!mounted) return;
      await showError(context, error);
    }
  }
}
