typedef Json = Map<String, dynamic>;

Json asJson(dynamic value) {
  if (value is Json) return value;
  if (value is Map) return Json.from(value);
  throw const FormatException('Expected a JSON object');
}

List<String> asStrings(dynamic value) {
  if (value is! List) return const [];
  return value.map((item) => item.toString()).toList();
}

double? asDouble(dynamic value) => value == null ? null : (value as num).toDouble();

int asInt(dynamic value) => value == null ? 0 : (value as num).toInt();

class Session {
  const Session({
    required this.token,
    required this.userId,
    required this.profileId,
    required this.displayName,
    required this.role,
    required this.isAdmin,
  });

  final String token;
  final String userId;
  final String profileId;
  final String displayName;
  final String? role;
  final bool isAdmin;

  factory Session.fromAuth(dynamic data) {
    final json = asJson(data);
    final session = Session.fromMe(json['token'] as String, json);
    return session;
  }

  factory Session.fromMe(String token, dynamic data) {
    final json = asJson(data);
    final user = asJson(json['user']);
    final profile = asJson(json['profile']);
    return Session(
      token: token,
      userId: user['id'] as String,
      profileId: profile['id'] as String,
      displayName: profile['displayName'] as String,
      role: profile['role'] as String?,
      isAdmin: user['isAdmin'] == true,
    );
  }
}

class Skill {
  const Skill({required this.name, required this.proficiency});

  final String name;
  final int proficiency;

  factory Skill.fromJson(dynamic data) {
    final json = asJson(data);
    return Skill(name: json['name'] as String, proficiency: asInt(json['proficiency']));
  }
}

class Profile {
  const Profile({
    required this.id,
    required this.userId,
    required this.displayName,
    required this.role,
    required this.bio,
    required this.location,
    required this.experienceLevel,
    required this.interests,
    required this.connectionIntent,
    required this.visibility,
    required this.githubUrl,
    required this.linkedinUrl,
    required this.portfolioUrl,
    required this.skills,
  });

  final String id;
  final String userId;
  final String displayName;
  final String? role;
  final String? bio;
  final String? location;
  final String? experienceLevel;
  final List<String> interests;
  final String? connectionIntent;
  final String visibility;
  final String? githubUrl;
  final String? linkedinUrl;
  final String? portfolioUrl;
  final List<Skill> skills;

  factory Profile.fromJson(dynamic data) {
    final json = asJson(data);
    return Profile(
      id: json['id'] as String,
      userId: json['userId'] as String,
      displayName: json['displayName'] as String,
      role: json['role'] as String?,
      bio: json['bio'] as String?,
      location: json['location'] as String?,
      experienceLevel: json['experienceLevel'] as String?,
      interests: asStrings(json['interests']),
      connectionIntent: json['connectionIntent'] as String?,
      visibility: json['visibility'] as String? ?? 'public',
      githubUrl: json['githubUrl'] as String?,
      linkedinUrl: json['linkedinUrl'] as String?,
      portfolioUrl: json['portfolioUrl'] as String?,
      skills: (json['skills'] as List? ?? const []).map(Skill.fromJson).toList(),
    );
  }
}

class PersonRef {
  const PersonRef({required this.id, required this.displayName, required this.role});

  final String id;
  final String displayName;
  final String? role;

  factory PersonRef.fromJson(dynamic data) {
    final json = asJson(data);
    return PersonRef(
      id: json['id'] as String,
      displayName: json['displayName'] as String,
      role: json['role'] as String?,
    );
  }
}

class Project {
  const Project({
    required this.id,
    required this.ownerId,
    required this.title,
    required this.tagline,
    required this.description,
    required this.stage,
    required this.lookingFor,
    required this.tags,
    required this.owner,
    required this.successScore,
    required this.ratingCount,
    required this.band,
  });

  final String id;
  final String ownerId;
  final String title;
  final String tagline;
  final String description;
  final String stage;
  final List<String> lookingFor;
  final List<String> tags;
  final PersonRef? owner;
  final double? successScore;
  final int? ratingCount;
  final String? band;

  factory Project.fromJson(dynamic data) {
    final json = asJson(data);
    return Project(
      id: json['id'] as String,
      ownerId: json['ownerId'] as String,
      title: json['title'] as String,
      tagline: json['tagline'] as String,
      description: json['description'] as String,
      stage: json['stage'] as String,
      lookingFor: asStrings(json['lookingFor']),
      tags: asStrings(json['tags']),
      owner: json['owner'] == null ? null : PersonRef.fromJson(json['owner']),
      successScore: asDouble(json['successScore']),
      ratingCount: json['ratingCount'] == null ? null : asInt(json['ratingCount']),
      band: json['band'] as String?,
    );
  }
}

class Criterion {
  const Criterion({required this.key, required this.label});

  final String key;
  final String label;

  factory Criterion.fromJson(dynamic data) {
    final json = asJson(data);
    return Criterion(key: json['key'] as String, label: json['label'] as String);
  }
}

class ConnectionRequest {
  const ConnectionRequest({
    required this.id,
    required this.status,
    required this.ratings,
    required this.requester,
  });

  final String id;
  final String status;
  final Map<String, int> ratings;
  final PersonRef requester;

  factory ConnectionRequest.fromJson(dynamic data) {
    final json = asJson(data);
    final raw = asJson(json['ratings'] ?? const {});
    return ConnectionRequest(
      id: json['id'] as String,
      status: json['status'] as String,
      ratings: raw.map((key, value) => MapEntry(key, asInt(value))),
      requester: PersonRef.fromJson(json['requester']),
    );
  }
}

class MatchSummary {
  const MatchSummary({
    required this.id,
    required this.kind,
    required this.projectTitle,
    required this.unreadCount,
    required this.other,
    required this.lastMessage,
  });

  final String id;
  final String kind;
  final String? projectTitle;
  final int unreadCount;
  final PersonRef other;
  final String? lastMessage;

  factory MatchSummary.fromJson(dynamic data) {
    final json = asJson(data);
    final last = json['lastMessage'];
    return MatchSummary(
      id: json['id'] as String,
      kind: json['kind'] as String,
      projectTitle: json['projectTitle'] as String?,
      unreadCount: asInt(json['unreadCount']),
      other: PersonRef.fromJson(json['other']),
      lastMessage: last == null ? null : asJson(last)['content'] as String?,
    );
  }
}

class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.matchId,
    required this.senderId,
    required this.content,
    required this.createdAt,
    required this.readAt,
  });

  final String id;
  final String matchId;
  final String senderId;
  final String content;
  final String createdAt;
  final String? readAt;

  factory ChatMessage.fromJson(dynamic data) {
    final json = asJson(data);
    return ChatMessage(
      id: json['id'] as String,
      matchId: json['matchId'] as String,
      senderId: json['senderId'] as String,
      content: json['content'] as String,
      createdAt: json['createdAt'].toString(),
      readAt: json['readAt']?.toString(),
    );
  }
}

class Compatibility {
  const Compatibility({required this.score, required this.source, required this.components});

  final double score;
  final String source;
  final Map<String, double> components;

  factory Compatibility.fromJson(dynamic data) {
    final json = asJson(data);
    final raw = asJson(json['components'] ?? const {});
    return Compatibility(
      score: asDouble(json['score']) ?? 0,
      source: json['source'] as String? ?? 'rules',
      components: raw.map((key, value) => MapEntry(key, asDouble(value) ?? 0)),
    );
  }
}

class EventItem {
  const EventItem({
    required this.id,
    required this.title,
    required this.description,
    required this.eventType,
    required this.startDate,
    required this.location,
    required this.isOnline,
    required this.url,
    required this.participantCount,
    required this.joined,
    required this.creatorName,
  });

  final String id;
  final String title;
  final String description;
  final String eventType;
  final String startDate;
  final String? location;
  final bool isOnline;
  final String? url;
  final int participantCount;
  final bool joined;
  final String? creatorName;

  factory EventItem.fromJson(dynamic data) {
    final json = asJson(data);
    return EventItem(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String? ?? '',
      eventType: json['eventType'] as String? ?? 'meetup',
      startDate: json['startDate'].toString(),
      location: json['location'] as String?,
      isOnline: json['isOnline'] == true,
      url: json['url'] as String?,
      participantCount: asInt(json['participantCount']),
      joined: json['joined'] == true,
      creatorName: json['creatorName'] as String?,
    );
  }
}

class AppNotification {
  const AppNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.readAt,
  });

  final String id;
  final String type;
  final String title;
  final String body;
  final String? readAt;

  bool get unread => readAt == null;

  factory AppNotification.fromJson(dynamic data) {
    final json = asJson(data);
    return AppNotification(
      id: json['id'] as String,
      type: json['type'] as String,
      title: json['title'] as String,
      body: json['body'] as String,
      readAt: json['readAt']?.toString(),
    );
  }
}

class PageResult<T> {
  const PageResult({required this.items, required this.nextCursor});

  final List<T> items;
  final String? nextCursor;
}
