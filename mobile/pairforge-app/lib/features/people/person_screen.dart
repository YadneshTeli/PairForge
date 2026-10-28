import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/api.dart';
import '../../models/models.dart';
import '../../providers/dio_provider.dart';
import '../../ui/widgets.dart';

class PersonScreen extends ConsumerWidget {
  const PersonScreen({super.key, required this.profileId});

  final String profileId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(_personProvider(profileId));
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: profile.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => ErrorView(message: error.toString(), onRetry: () => ref.invalidate(_personProvider(profileId))),
        data: (person) => ListView(
          padding: const EdgeInsets.all(20),
          children: [
            RoleBadge(role: person.role),
            const SizedBox(height: 12),
            Text(person.displayName, style: Theme.of(context).textTheme.headlineSmall),
            if (person.bio != null) ...[const SizedBox(height: 8), Text(person.bio!)],
            if (person.location != null) Text(person.location!),
            const SizedBox(height: 12),
            Wrap(spacing: 8, children: person.skills.map((skill) => Chip(label: Text('${skill.name} ${skill.proficiency}'))).toList()),
            const SizedBox(height: 16),
            FutureBuilder<Compatibility>(
              future: ref.read(apiProvider).compatibility(profileId),
              builder: (context, snapshot) {
                if (snapshot.connectionState != ConnectionState.done) return const LinearProgressIndicator();
                if (snapshot.hasError) return Text(snapshot.error.toString());
                final score = snapshot.data!;
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${score.score.toStringAsFixed(1)}% compatibility', style: Theme.of(context).textTheme.titleLarge),
                    Text('Signal from ${score.source == 'ai' ? 'the matchmaking service' : 'shared skills and interests'}'),
                    for (final entry in score.components.entries)
                      Text('${entry.key}: ${(entry.value * 100).toStringAsFixed(0)}'),
                  ],
                );
              },
            ),
            TextButton(
              onPressed: () async {
                final reason = await askForText(context, title: 'Report person', label: 'What is wrong?', action: 'Report');
                if (reason == null || reason.length < 3 || !context.mounted) return;
                try {
                  await ref.read(apiProvider).report(targetType: 'user', targetId: profileId, reason: reason);
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
        ),
      ),
    );
  }
}

final _personProvider = FutureProvider.family<Profile, String>((ref, id) {
  return ref.watch(apiProvider).profile(id);
});
