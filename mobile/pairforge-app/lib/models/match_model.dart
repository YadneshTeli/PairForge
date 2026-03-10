class MatchModel {
  final String id;
  final String user1Id;
  final String user2Id;
  final double score;

  const MatchModel({
    required this.id,
    required this.user1Id,
    required this.user2Id,
    required this.score,
  });

  factory MatchModel.fromJson(Map<String, dynamic> json) => MatchModel(
        id: json['id'] as String,
        user1Id: json['user1Id'] as String,
        user2Id: json['user2Id'] as String,
        score: (json['score'] as num).toDouble(),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'user1Id': user1Id,
        'user2Id': user2Id,
        'score': score,
      };
}
