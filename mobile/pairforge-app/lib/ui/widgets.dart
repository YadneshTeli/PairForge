import 'package:flutter/material.dart';

import '../core/constants/colors.dart';

class BrandMark extends StatelessWidget {
  const BrandMark({super.key, this.size = 28});

  final double size;

  @override
  Widget build(BuildContext context) {
    final block = size * 0.62;
    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        children: [
          Positioned(left: 0, top: 0, child: _block(block, AppColors.secondary)),
          Positioned(right: 0, bottom: 0, child: _block(block, AppColors.primary)),
        ],
      ),
    );
  }

  Widget _block(double side, Color color) {
    return Container(
      width: side,
      height: side,
      decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(side * 0.3)),
    );
  }
}

class SwipeDeck extends StatefulWidget {
  const SwipeDeck({super.key, required this.child, required this.onPass, required this.onLike});

  final Widget child;
  final VoidCallback onPass;
  final VoidCallback onLike;

  @override
  State<SwipeDeck> createState() => _SwipeDeckState();
}

class _SwipeDeckState extends State<SwipeDeck> {
  double _dx = 0;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onHorizontalDragUpdate: (details) => setState(() => _dx += details.delta.dx),
      onHorizontalDragEnd: (_) {
        final shift = _dx;
        setState(() => _dx = 0);
        if (shift <= -96) widget.onPass();
        if (shift >= 96) widget.onLike();
      },
      child: Transform.translate(
        offset: Offset(_dx, 0),
        child: Transform.rotate(
          angle: _dx / 800,
          child: widget.child,
        ),
      ),
    );
  }
}

class SectionTitle extends StatelessWidget {
  const SectionTitle(this.title, this.lede, {super.key});

  final String title;
  final String lede;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 4),
          Text(lede, style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
    );
  }
}

class RoleBadge extends StatelessWidget {
  const RoleBadge({super.key, required this.role});

  final String? role;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: AppColors.rose100, borderRadius: BorderRadius.circular(999)),
      child: Text(roleLabel(role), style: const TextStyle(color: AppColors.muted, fontSize: 12, fontWeight: FontWeight.w700)),
    );
  }
}

class StageChip extends StatelessWidget {
  const StageChip(this.stage, {super.key});

  final String stage;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: AppColors.blue100, borderRadius: BorderRadius.circular(999)),
      child: Text(pretty(stage), style: const TextStyle(color: AppColors.ctaDeep, fontSize: 12, fontWeight: FontWeight.w700)),
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
            const BrandMark(size: 40),
            const SizedBox(height: 16),
            Text(title, style: Theme.of(context).textTheme.titleLarge, textAlign: TextAlign.center),
            const SizedBox(height: 8),
            Text(message, textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodySmall),
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
    final readable = message == 'Failed to fetch' || message.contains('SocketException')
        ? "Can't reach the server. Check that the API is running, then try again."
        : message;
    return EmptyView(title: 'Something went wrong', message: readable, actionLabel: 'Try again', onAction: onRetry);
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
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(color: AppColors.paper, borderRadius: BorderRadius.circular(16)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(headline, style: Theme.of(context).textTheme.titleMedium),
          Text(detail, style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
    );
  }
}

class AuthScaffold extends StatelessWidget {
  const AuthScaffold({super.key, required this.eyebrow, required this.title, required this.children});

  final String eyebrow;
  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          Container(
            width: double.infinity,
            color: AppColors.primary,
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(24, 20, 24, 28),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'PAIRFORGE',
                      style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 1.4),
                    ),
                    const SizedBox(height: 10),
                    const Text(
                      'Build with the person who gets the idea.',
                      style: TextStyle(color: Colors.white, fontSize: 32, height: 1.05, fontWeight: FontWeight.w700, letterSpacing: -0.8),
                    ),
                    const SizedBox(height: 16),
                    _Proof('Rate', 'Score ideas on the criteria that match your role.'),
                    const SizedBox(height: 8),
                    _Proof('Match', 'A superlike asks the owner. A mutual like opens a chat.'),
                    const SizedBox(height: 8),
                    _Proof('Pair', 'Write together and join a call from the match.'),
                  ],
                ),
              ),
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(24, 24, 24, 32),
              children: [
                Text(eyebrow, style: const TextStyle(color: AppColors.primary, fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 1.2)),
                const SizedBox(height: 4),
                Text(title, style: Theme.of(context).textTheme.headlineMedium),
                const SizedBox(height: 20),
                ...children,
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Proof extends StatelessWidget {
  const _Proof(this.title, this.body);

  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(color: AppColors.ink, fontWeight: FontWeight.w700)),
          Text(body, style: const TextStyle(color: AppColors.muted, fontSize: 13)),
        ],
      ),
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
          onPressed: () {
            final value = controller.text.trim();
            Navigator.pop(context, value);
          },
          child: Text(action),
        ),
      ],
    ),
  );
}
