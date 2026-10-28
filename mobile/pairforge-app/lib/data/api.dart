import 'package:dio/dio.dart';

import '../models/models.dart';

class ApiException implements Exception {
  ApiException(this.message);
  final String message;

  @override
  String toString() => message;
}

class PairforgeApi {
  PairforgeApi(this._dio);

  final Dio _dio;

  Future<T> _send<T>(Future<Response<dynamic>> future, T Function(dynamic data) decode) async {
    try {
      final response = await future;
      return decode(response.data);
    } on DioException catch (error) {
      throw ApiException(_message(error));
    }
  }

  String _message(DioException error) {
    final data = error.response?.data;
    if (data is Map && data['error'] is String) return data['error'] as String;
    return 'Could not reach PairForge';
  }

  Future<Session> register({
    required String email,
    required String username,
    required String password,
    required String displayName,
  }) {
    return _send(
      _dio.post('/auth/register', data: {
        'email': email,
        'username': username,
        'password': password,
        'displayName': displayName,
      }),
      Session.fromAuth,
    );
  }

  Future<Session> login({required String email, required String password}) {
    return _send(
      _dio.post('/auth/login', data: {'email': email, 'password': password}),
      Session.fromAuth,
    );
  }

  Future<Session> me(String token) {
    return _send(_dio.get('/auth/me'), (data) => Session.fromMe(token, data));
  }

  Future<Profile> setRole(String role) {
    return _send(_dio.patch('/profile/role', data: {'role': role}), (data) => Profile.fromJson(asJson(data)['profile']));
  }

  Future<Profile> profile([String? id]) {
    final path = id == null ? '/profile' : '/profiles/$id';
    return _send(_dio.get(path), (data) => Profile.fromJson(asJson(data)['profile']));
  }

  Future<Profile> updateProfile(Map<String, dynamic> body) {
    return _send(_dio.put('/profile', data: body), (data) => Profile.fromJson(asJson(data)['profile']));
  }

  Future<Profile> updateSkills(List<Map<String, dynamic>> skills) {
    return _send(
      _dio.put('/profile/skills', data: {'skills': skills}),
      (data) => Profile.fromJson(asJson(data)['profile']),
    );
  }

  Future<List<Criterion>> criteria() {
    return _send(_dio.get('/rating-criteria'), (data) {
      return (asJson(data)['criteria'] as List).map(Criterion.fromJson).toList();
    });
  }

  Future<PageResult<Project>> projectFeed({String? cursor}) {
    return _send(
      _dio.get('/projects/feed', queryParameters: {'limit': 20, if (cursor != null) 'cursor': cursor}),
      (data) {
        final json = asJson(data);
        return PageResult(
          items: (json['projects'] as List).map(Project.fromJson).toList(),
          nextCursor: json['nextCursor'] as String?,
        );
      },
    );
  }

  Future<List<Project>> myProjects() {
    return _send(_dio.get('/projects/mine'), (data) {
      return (asJson(data)['projects'] as List).map(Project.fromJson).toList();
    });
  }

  Future<Project> project(String id) {
    return _send(_dio.get('/projects/$id'), (data) => Project.fromJson(asJson(data)['project']));
  }

  Future<Project> createProject(Map<String, dynamic> body) {
    return _send(_dio.post('/projects', data: body), (data) => Project.fromJson(asJson(data)['project']));
  }

  Future<Project> updateProject(String id, Map<String, dynamic> body) {
    return _send(_dio.patch('/projects/$id', data: body), (data) => Project.fromJson(asJson(data)['project']));
  }

  Future<void> deleteProject(String id) => _void(_dio.delete('/projects/$id'));

  Future<void> swipeProject(String id, String action, [Map<String, int>? ratings]) {
    return _void(_dio.post('/projects/$id/swipe', data: {
      'action': action,
      if (ratings != null) 'ratings': ratings,
    }));
  }

  Future<List<ConnectionRequest>> requests(String projectId) {
    return _send(_dio.get('/projects/$projectId/requests'), (data) {
      return (asJson(data)['requests'] as List).map(ConnectionRequest.fromJson).toList();
    });
  }

  Future<String?> respondToRequest(String id, String status) {
    return _send(_dio.patch('/match-requests/$id', data: {'status': status}), (data) {
      final match = asJson(data)['match'];
      if (match == null) return null;
      return asJson(match)['id'] as String;
    });
  }

  Future<List<MatchSummary>> matches() {
    return _send(_dio.get('/matches'), (data) {
      return (asJson(data)['matches'] as List).map(MatchSummary.fromJson).toList();
    });
  }

  Future<List<ChatMessage>> messages(String matchId) {
    return _send(_dio.get('/matches/$matchId/messages'), (data) {
      return (asJson(data)['messages'] as List).map(ChatMessage.fromJson).toList();
    });
  }

  Future<void> report({required String targetType, required String targetId, required String reason}) {
    return _void(_dio.post('/reports', data: {
      'targetType': targetType,
      'targetId': targetId,
      'reason': reason,
    }));
  }

  Future<PageResult<Profile>> peopleFeed({String? cursor, String? skill}) {
    return _send(
      _dio.get('/people/feed', queryParameters: {
        'limit': 20,
        if (cursor != null) 'cursor': cursor,
        if (skill != null && skill.isNotEmpty) 'skill': skill,
      }),
      (data) {
        final json = asJson(data);
        return PageResult(
          items: (json['people'] as List).map(Profile.fromJson).toList(),
          nextCursor: json['nextCursor'] as String?,
        );
      },
    );
  }

  Future<Compatibility> compatibility(String profileId) {
    return _send(_dio.get('/people/$profileId/compatibility'), Compatibility.fromJson);
  }

  Future<String?> swipePerson(String profileId, String action) {
    return _send(_dio.post('/people/$profileId/swipe', data: {'action': action}), (data) {
      final match = asJson(data)['match'];
      if (match == null) return null;
      return asJson(match)['id'] as String;
    });
  }

  Future<List<EventItem>> events() {
    return _send(_dio.get('/events'), (data) {
      return (asJson(data)['events'] as List).map(EventItem.fromJson).toList();
    });
  }

  Future<EventItem> event(String id) {
    return _send(_dio.get('/events/$id'), (data) => EventItem.fromJson(asJson(data)['event']));
  }

  Future<EventItem> createEvent(Map<String, dynamic> body) {
    return _send(_dio.post('/events', data: body), (data) => EventItem.fromJson(asJson(data)['event']));
  }

  Future<EventItem> joinEvent(String id) {
    return _send(_dio.post('/events/$id/join'), (data) => EventItem.fromJson(asJson(data)['event']));
  }

  Future<EventItem> leaveEvent(String id) {
    return _send(_dio.delete('/events/$id/join'), (data) => EventItem.fromJson(asJson(data)['event']));
  }

  Future<void> requestToJoin(String projectId, String message) {
    return _void(_dio.post('/projects/$projectId/join-requests', data: {'message': message}));
  }

  Future<List<PersonRef>> members(String projectId) {
    return _send(_dio.get('/projects/$projectId/members'), (data) {
      return (asJson(data)['members'] as List).map((item) => PersonRef.fromJson(asJson(item)['profile'])).toList();
    });
  }

  Future<List<AppNotification>> notifications() {
    return _send(_dio.get('/notifications'), (data) {
      return (asJson(data)['notifications'] as List).map(AppNotification.fromJson).toList();
    });
  }

  Future<void> markNotificationsRead() => _void(_dio.post('/notifications/read', data: {}));

  Future<void> _void(Future<Response<dynamic>> future) async {
    try {
      await future;
    } on DioException catch (error) {
      throw ApiException(_message(error));
    }
  }
}
