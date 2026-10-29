import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers/app_providers.dart';
import '../../ui/widgets.dart';

class EventsScreen extends ConsumerWidget {
  const EventsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final events = ref.watch(eventsProvider);
    return events.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => ErrorView(message: error.toString(), onRetry: () => ref.invalidate(eventsProvider)),
      data: (items) {
        if (items.isEmpty) {
          return EmptyView(
            title: 'No events yet',
            message: 'Post a meetup or hackathon and people can join from here.',
            actionLabel: 'Create an event',
            onAction: () => context.push('/events/new'),
          );
        }
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const SectionTitle('Events', 'Meetups and hackathons people can join.'),
            FilledButton.icon(
              onPressed: () => context.push('/events/new'),
              icon: const Icon(Icons.add),
              label: const Text('Create an event'),
            ),
            const SizedBox(height: 12),
            for (final event in items) ...[
              Card(
                child: ListTile(
                  title: Text(event.title),
                  subtitle: Text('${event.eventType} · ${event.participantCount} going'),
                  trailing: event.joined ? const StageChip('joined') : const Icon(Icons.chevron_right),
                  onTap: () => context.push('/events/${event.id}'),
                ),
              ),
              const SizedBox(height: 8),
            ],
          ],
        );
      },
    );
  }
}
