class ProfileModel {
  final String userId;
  final String displayName;
  final String? bio;
  final List<String> skills;

  const ProfileModel({
    required this.userId,
    required this.displayName,
    this.bio,
    this.skills = const [],
  });

  factory ProfileModel.fromJson(Map<String, dynamic> json) => ProfileModel(
        userId: json['userId'] as String,
        displayName: json['displayName'] as String,
        bio: json['bio'] as String?,
        skills: List<String>.from(json['skills'] as List? ?? []),
      );

  Map<String, dynamic> toJson() => {
        'userId': userId,
        'displayName': displayName,
        if (bio != null) 'bio': bio,
        'skills': skills,
      };
}
