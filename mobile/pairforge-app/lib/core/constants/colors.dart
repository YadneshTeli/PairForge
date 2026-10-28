import 'package:flutter/material.dart';

class AppColors {
  static const seed = Color(0xFF5B4DDB);
  static const paper = Color(0xFFF6F3EC);
  static const ink = Color(0xFF1F1A17);
  static const superlike = Color(0xFFB45309);

  static Color role(String? role) {
    switch (role) {
      case 'founder':
        return const Color(0xFFC4493A);
      case 'cofounder':
        return const Color(0xFFD4892A);
      case 'vc':
        return const Color(0xFF1F7A6B);
      case 'developer':
        return const Color(0xFF4F46C7);
      case 'freelancer':
        return const Color(0xFF2F5F86);
      case 'student':
        return const Color(0xFF6E5AA6);
      default:
        return const Color(0xFF6B6560);
    }
  }
}

const roleOptions = <(String, String)>[
  ('founder', 'Founder'),
  ('cofounder', 'Cofounder'),
  ('vc', 'VC'),
  ('developer', 'Developer'),
  ('freelancer', 'Freelancer'),
  ('student', 'Student'),
];

String roleLabel(String? role) {
  for (final option in roleOptions) {
    if (option.$1 == role) return option.$2;
  }
  return role ?? 'No role';
}
