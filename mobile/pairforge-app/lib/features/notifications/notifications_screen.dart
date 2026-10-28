import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers/app_providers.dart';
import '../../providers/dio_provider.dart';
import '../../ui/widgets.dart';

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notes = ref.watch(notificationsProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          TextButton(
            onPressed: () async {
              await ref.read(apiProvider).markNotificationsRead();
              ref.invalidate(notificationsProvider);
            },
            child: const Text('Mark read'),
          ),
        ],
      ),
      body: notes.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => ErrorView(message: error.toString(), onRetry: () => ref.invalidate(notificationsProvider)),
        data: (items) {
          if (items.isEmpty) {
            return const EmptyView(title: 'You are caught up', message: 'Connection requests and accepted matches will show up here.');
          }
          return ListView.separated(
            itemCount: items.length,
            separatorBuilder: (context, index) => const Divider(height: 1),
            itemBuilder: (context, index) {
              final item = items[index];
              return ListTile(
                title: Text(item.title, style: TextStyle(fontWeight: item.unread ? FontWeight.w700 : FontWeight.w500)),
                subtitle: Text(item.body),
              );
            },
          );
        },
      ),
    );
  }
}
