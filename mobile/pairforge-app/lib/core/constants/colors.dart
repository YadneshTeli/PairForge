import 'package:flutter/material.dart';

class AppColors {
  static const primary = Color(0xFFE11D48);
  static const primaryDeep = Color(0xFFBE123C);
  static const secondary = Color(0xFFFB7185);
  static const cta = Color(0xFF2563EB);
  static const ctaDeep = Color(0xFF1D4ED8);
  static const paper = Color(0xFFFFF1F2);
  static const ink = Color(0xFF881337);
  static const muted = Color(0xFF9F1239);
  static const line = Color(0xFFFECDD3);
  static const lineStrong = Color(0xFFFDA4AF);
  static const rose100 = Color(0xFFFFE4E6);
  static const blue100 = Color(0xFFDBEAFE);

  static const seed = primary;
  static const superlike = cta;

  static const darkPaper = Color(0xFF4C0519);
  static const darkSurface = Color(0xFF3F0D18);
  static const darkInk = Color(0xFFFFF1F2);
}

const roleOptions = <(String, String)>[
  ('founder', 'Founder'),
  ('cofounder', 'Cofounder'),
  ('vc', 'VC'),
  ('developer', 'Developer'),
  ('freelancer', 'Freelancer'),
  ('student', 'Student'),
];

const roleCopy = <String, String>{
  'founder': 'You post the idea and choose who comes in.',
  'cofounder': 'You want to build beside a founder.',
  'vc': 'You rate whether this can become a company.',
  'developer': 'You rate whether you can build it.',
  'freelancer': 'You rate the work you could take on.',
  'student': 'You are here to learn on a real project.',
};

String roleLabel(String? role) {
  for (final option in roleOptions) {
    if (option.$1 == role) return option.$2;
  }
  return role ?? 'No role';
}

String pretty(String value) {
  if (value.toLowerCase() == 'mvp') return 'MVP';
  return value
      .replaceAll('_', ' ')
      .split(' ')
      .map((word) => word.isEmpty ? word : '${word[0].toUpperCase()}${word.substring(1)}')
      .join(' ');
}
