class MessageModel {
  final String id;
  final String matchId;
  final String senderId;
  final String content;
  final String type;
  final DateTime createdAt;

  const MessageModel({
    required this.id,
    required this.matchId,
    required this.senderId,
    required this.content,
    this.type = 'text',
    required this.createdAt,
  });

  factory MessageModel.fromJson(Map<String, dynamic> json) => MessageModel(
        id: json['id'] as String,
        matchId: json['matchId'] as String,
        senderId: json['senderId'] as String,
        content: json['content'] as String,
        type: json['type'] as String? ?? 'text',
        createdAt: DateTime.parse(json['createdAt'] as String),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'matchId': matchId,
        'senderId': senderId,
        'content': content,
        'type': type,
        'createdAt': createdAt.toIso8601String(),
      };
}
