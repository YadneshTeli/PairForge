import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/services/api_service.dart';
import '../models/event_model.dart';
import '../providers/dio_provider.dart';

class EventRepository {
  final ApiService _api;

  const EventRepository({required ApiService api}) : _api = api;

  Future<List<EventModel>> getEvents() async {
    final res = await _api.get('/events');
    return (res.data['events'] as List)
        .map((e) => EventModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> joinEvent(String eventId) =>
      _api.post('/events/$eventId/join');
}

final eventRepositoryProvider = Provider<EventRepository>(
  (ref) => EventRepository(api: ref.read(apiServiceProvider)),
);
