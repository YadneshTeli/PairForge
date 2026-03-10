class EventModel {
  final String id;
  final String title;
  final String description;
  final DateTime date;

  const EventModel({
    required this.id,
    required this.title,
    required this.description,
    required this.date,
  });

  factory EventModel.fromJson(Map<String, dynamic> json) => EventModel(
        id: json['id'] as String,
        title: json['title'] as String,
        description: json['description'] as String,
        date: DateTime.parse(json['date'] as String),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'description': description,
        'date': date.toIso8601String(),
      };
}
