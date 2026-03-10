import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../models/event_model.dart';
import '../repositories/event_repository.dart';

// ─── Event State ──────────────────────────────────────────────────────────────

class EventState {
  final List<EventModel> events;
  final bool isLoading;
  final String? error;

  const EventState({
    this.events = const [],
    this.isLoading = false,
    this.error,
  });

  EventState copyWith({
    List<EventModel>? events,
    bool? isLoading,
    String? error,
  }) =>
      EventState(
        events: events ?? this.events,
        isLoading: isLoading ?? this.isLoading,
        error: error,
      );
}

// ─── Event Notifier ───────────────────────────────────────────────────────────

class EventNotifier extends Notifier<EventState> {
  late final EventRepository _repo;

  @override
  EventState build() {
    _repo = ref.read(eventRepositoryProvider);
    fetchEvents();
    return const EventState();
  }

  Future<void> fetchEvents() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final events = await _repo.getEvents();
      state = state.copyWith(events: events, isLoading: false);
    } on DioException catch (e) {
      state = state.copyWith(
        isLoading: false,
        error:
            e.response?.data['message'] as String? ?? 'Failed to load events',
      );
    }
  }

  Future<void> joinEvent(String eventId) async {
    try {
      await _repo.joinEvent(eventId);
    } on DioException catch (_) {}
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

final eventProvider =
    NotifierProvider<EventNotifier, EventState>(EventNotifier.new);
