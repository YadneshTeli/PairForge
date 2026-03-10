import 'package:flutter/material.dart';

class TechStackChip extends StatelessWidget {
  final String label;

  const TechStackChip({super.key, required this.label});

  @override
  Widget build(BuildContext context) {
    return Chip(label: Text(label));
  }
}
