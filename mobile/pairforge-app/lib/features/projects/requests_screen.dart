import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../data/api.dart';
import '../../models/models.dart';
import '../../providers/app_providers.dart';
import '../../providers/dio_provider.dart';
import '../../ui/widgets.dart';

class RequestsScreen extends ConsumerWidget {
  const RequestsScreen({super.key, required this.projectId});

  final String projectId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final requests = ref.watch(_requestsProvider(projectId));
    return Scaffold(
      appBar: AppBar(title: const Text('Requests')),
      body: requests.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => ErrorView(message: error.toString(), onRetry: () => ref.invalidate(_requestsProvider(projectId))),
        data: (items) {
          final pending = items.where((item) => item.status == 'pending').toList();
          if (pending.isEmpty) {
            return const EmptyView(
              title: 'No requests yet',
              message: 'When someone superlikes this project, their ratings will show up here.',
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: pending.length,
            separatorBuilder: (context, index) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final request = pending[index];
              return Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(children: [
                        Text(request.requester.displayName, style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(width: 8),
                        RoleBadge(role: request.requester.role),
                      ]),
                      const SizedBox(height: 8),
                      for (final entry in request.ratings.entries) Text('${entry.key}: ${entry.value} / 5'),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () => _decide(context, ref, request, 'declined'),
                              child: const Text('Decline'),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: FilledButton(
                              onPressed: () => _decide(context, ref, request, 'accepted'),
                              child: const Text('Accept'),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }

  Future<void> _decide(BuildContext context, WidgetRef ref, ConnectionRequest request, String status) async {
    try {
      final matchId = await ref.read(apiProvider).respondToRequest(request.id, status);
      ref.invalidate(_requestsProvider(projectId));
      ref.invalidate(matchesProvider);
      ref.invalidate(notificationsProvider);
      if (!context.mounted) return;
      if (matchId != null) context.push('/matches/$matchId');
    } on ApiException catch (error) {
      if (context.mounted) await showError(context, error);
    }
  }
}

final _requestsProvider = FutureProvider.family<List<ConnectionRequest>, String>((ref, id) {
  return ref.watch(apiProvider).requests(id);
});
