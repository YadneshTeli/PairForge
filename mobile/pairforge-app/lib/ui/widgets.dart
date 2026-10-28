import 'package:flutter/material.dart';

import '../core/constants/colors.dart';

class RoleBadge extends StatelessWidget {
  const RoleBadge({super.key, required this.role});

  final String? role;

  @override
  Widget build(BuildContext context) {
    final color = AppColors.role(role);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        roleLabel(role),
        style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600),
      ),
    );
  }
}

class EmptyView extends StatelessWidget {
  const EmptyView({
    super.key,
    required this.title,
    required this.message,
    this.actionLabel,
    this.onAction,
  });

  final String title;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleLarge, textAlign: TextAlign.center),
            const SizedBox(height: 8),
            Text(message, textAlign: TextAlign.center),
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: 20),
              FilledButton(onPressed: onAction, child: Text(actionLabel!)),
            ],
          ],
        ),
      ),
    );
  }
}

class ErrorView extends StatelessWidget {
  const ErrorView({super.key, required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return EmptyView(title: 'Something went wrong', message: message, actionLabel: 'Try again', onAction: onRetry);
  }
}

class ScoreReadout extends StatelessWidget {
  const ScoreReadout({super.key, required this.band, required this.score, required this.count});

  final String? band;
  final double? score;
  final int? count;

  @override
  Widget build(BuildContext context) {
    final headline = band ?? 'No signal yet';
    final detail = score == null ? 'Waiting for ratings' : '${score!.toStringAsFixed(1)} / 5 · ${count ?? 0} ratings';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(headline, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
        Text(detail, style: Theme.of(context).textTheme.bodySmall),
      ],
    );
  }
}

Future<void> showError(BuildContext context, Object error) {
  return showDialog<void>(
    context: context,
    builder: (context) => AlertDialog(
      title: const Text('Could not do that'),
      content: Text(error.toString()),
      actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('OK'))],
    ),
  );
}

Future<String?> askForText(BuildContext context, {required String title, required String label, String action = 'Send'}) {
  final controller = TextEditingController();
  return showDialog<String>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(title),
      content: TextField(controller: controller, decoration: InputDecoration(labelText: label), maxLines: 3),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        FilledButton(
          onPressed: () => Navigator.pop(context, controller.text.trim()),
          child: Text(action),
        ),
      ],
    ),
  );
}
