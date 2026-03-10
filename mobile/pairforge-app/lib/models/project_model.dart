class ProjectModel {
  final String id;
  final String title;
  final String description;
  final List<String> techStack;
  final String ownerId;

  const ProjectModel({
    required this.id,
    required this.title,
    required this.description,
    this.techStack = const [],
    required this.ownerId,
  });

  factory ProjectModel.fromJson(Map<String, dynamic> json) => ProjectModel(
        id: json['id'] as String,
        title: json['title'] as String,
        description: json['description'] as String,
        techStack: List<String>.from(json['techStack'] as List? ?? []),
        ownerId: json['ownerId'] as String,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'description': description,
        'techStack': techStack,
        'ownerId': ownerId,
      };
}
