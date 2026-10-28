import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../data/api.dart';
import '../../models/models.dart';
import '../../providers/app_providers.dart';
import '../../providers/dio_provider.dart';
import '../../ui/widgets.dart';

class EventDetailScreen extends ConsumerWidget {
  const EventDetailScreen({super.key, required this.eventId});

  final String eventId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final event = ref.watch(_eventProvider(eventId));
    return Scaffold(
      appBar: AppBar(title: const Text('Event')),
      body: event.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => ErrorView(message: error.toString(), onRetry: () => ref.invalidate(_eventProvider(eventId))),
        data: (item) => ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Text(item.title, style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 8),
            Text(item.description),
            const SizedBox(height: 8),
            Text(item.isOnline ? 'Online' : (item.location ?? 'Location TBA')),
            Text('${item.participantCount} going'),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: () async {
                try {
                  final api = ref.read(apiProvider);
                  if (item.joined) {
                    await api.leaveEvent(item.id);
                  } else {
                    await api.joinEvent(item.id);
                  }
                  ref.invalidate(_eventProvider(eventId));
                  ref.invalidate(eventsProvider);
                } on ApiException catch (error) {
                  if (context.mounted) await showError(context, error);
                }
              },
              child: Text(item.joined ? 'Leave' : 'Join'),
            ),
          ],
        ),
      ),
    );
  }
}

final _eventProvider = FutureProvider.family<EventItem, String>((ref, id) {
  return ref.watch(apiProvider).event(id);
});

class CreateEventScreen extends ConsumerStatefulWidget {
  const CreateEventScreen({super.key});

  @override
  ConsumerState<CreateEventScreen> createState() => _CreateEventScreenState();
}

class _CreateEventScreenState extends ConsumerState<CreateEventScreen> {
  final _title = TextEditingController();
  final _description = TextEditingController();
  final _location = TextEditingController();
  bool _online = false;
  bool _saving = false;
  DateTime _start = DateTime.now().add(const Duration(days: 1));

  @override
  void dispose() {
    _title.dispose();
    _description.dispose();
    _location.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('New event')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          TextField(controller: _title, decoration: const InputDecoration(labelText: 'Title')),
          const SizedBox(height: 12),
          TextField(controller: _description, decoration: const InputDecoration(labelText: 'Description'), maxLines: 4),
          const SizedBox(height: 12),
          SwitchListTile(value: _online, title: const Text('Online'), onChanged: (value) => setState(() => _online = value)),
          if (!_online) TextField(controller: _location, decoration: const InputDecoration(labelText: 'Location')),
          const SizedBox(height: 12),
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Starts'),
            subtitle: Text(_start.toLocal().toString()),
            onTap: () async {
              final date = await showDatePicker(context: context, firstDate: DateTime.now(), lastDate: DateTime.now().add(const Duration(days: 365)), initialDate: _start);
              if (date == null) return;
              setState(() => _start = DateTime(date.year, date.month, date.day, _start.hour, _start.minute));
            },
          ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _saving
                ? null
                : () async {
                    setState(() => _saving = true);
                    try {
                      final event = await ref.read(apiProvider).createEvent({
                        'title': _title.text.trim(),
                        'description': _description.text.trim(),
                        'eventType': 'meetup',
                        'startDate': _start.toUtc().toIso8601String(),
                        'isOnline': _online,
                        'location': _online ? null : _location.text.trim(),
                      });
                      ref.invalidate(eventsProvider);
                      if (context.mounted) context.go('/events/${event.id}');
                    } on ApiException catch (error) {
                      if (context.mounted) await showError(context, error);
                    } finally {
                      if (mounted) setState(() => _saving = false);
                    }
                  },
            child: Text(_saving ? 'Saving…' : 'Create'),
          ),
        ],
      ),
    );
  }
}
