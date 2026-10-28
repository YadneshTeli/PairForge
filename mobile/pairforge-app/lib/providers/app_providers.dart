import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/models.dart';
import 'dio_provider.dart';

final criteriaProvider = FutureProvider<List<Criterion>>((ref) {
  return ref.watch(apiProvider).criteria();
});

final myProjectsProvider = FutureProvider<List<Project>>((ref) {
  return ref.watch(apiProvider).myProjects();
});

final matchesProvider = FutureProvider<List<MatchSummary>>((ref) {
  return ref.watch(apiProvider).matches();
});

final eventsProvider = FutureProvider<List<EventItem>>((ref) {
  return ref.watch(apiProvider).events();
});

final notificationsProvider = FutureProvider<List<AppNotification>>((ref) {
  return ref.watch(apiProvider).notifications();
});

class FeedNotifier extends AsyncNotifier<List<Project>> {
  String? _cursor;

  @override
  Future<List<Project>> build() async {
    final page = await ref.watch(apiProvider).projectFeed();
    _cursor = page.nextCursor;
    return page.items;
  }

  Future<void> remove(String id) async {
    final current = state.value ?? const <Project>[];
    final next = current.where((project) => project.id != id).toList();
    state = AsyncData(next);
    if (next.length < 3 && _cursor != null) {
      final page = await ref.read(apiProvider).projectFeed(cursor: _cursor);
      _cursor = page.nextCursor;
      state = AsyncData([...next, ...page.items]);
    }
  }
}

final feedProvider = AsyncNotifierProvider<FeedNotifier, List<Project>>(FeedNotifier.new);

class PeopleNotifier extends AsyncNotifier<List<Profile>> {
  @override
  Future<List<Profile>> build() async {
    final page = await ref.watch(apiProvider).peopleFeed();
    return page.items;
  }

  Future<String?> swipe(String id, String action) async {
    final matchId = await ref.read(apiProvider).swipePerson(id, action);
    final current = state.value ?? const <Profile>[];
    state = AsyncData(current.where((person) => person.id != id).toList());
    if (matchId != null) ref.invalidate(matchesProvider);
    return matchId;
  }
}

final peopleProvider = AsyncNotifierProvider<PeopleNotifier, List<Profile>>(PeopleNotifier.new);
