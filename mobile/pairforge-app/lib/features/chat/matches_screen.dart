import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers/app_providers.dart';
import '../../ui/widgets.dart';

class MatchesScreen extends ConsumerWidget {
  const MatchesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final matches = ref.watch(matchesProvider);
    return matches.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => ErrorView(message: error.toString(), onRetry: () => ref.invalidate(matchesProvider)),
      data: (items) {
        if (items.isEmpty) {
          return const EmptyView(
            title: 'No matches yet',
            message: 'A chat opens after a project owner accepts your superlike, or when two people like each other.',
          );
        }
        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: items.length,
          separatorBuilder: (context, index) => const SizedBox(height: 8),
          itemBuilder: (context, index) {
            final match = items[index];
            return Card(
              child: ListTile(
                title: Text(match.other.displayName),
                subtitle: Text(match.lastMessage ?? match.projectTitle ?? 'No messages yet'),
                leading: RoleBadge(role: match.other.role),
                trailing: match.unreadCount > 0
                    ? CircleAvatar(radius: 12, child: Text('${match.unreadCount}', style: const TextStyle(fontSize: 12)))
                    : const Icon(Icons.chevron_right),
                onTap: () => context.push('/matches/${match.id}'),
              ),
            );
          },
        );
      },
    );
  }
}
