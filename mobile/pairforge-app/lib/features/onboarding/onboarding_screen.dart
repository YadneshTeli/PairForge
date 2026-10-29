import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/constants/colors.dart';
import '../../providers/auth_provider.dart';
import '../../ui/widgets.dart';

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  String? _role;

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authStateProvider);
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            const SizedBox(height: 24),
            Text('How are you showing up?', style: Theme.of(context).textTheme.headlineMedium),
            const SizedBox(height: 8),
            const Text('Your role decides which questions you rate projects on. You can set it once.'),
            const SizedBox(height: 24),
            ...roleOptions.map((option) {
              final selected = _role == option.$1;
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Material(
                  color: selected ? AppColors.rose100 : Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                    side: BorderSide(color: selected ? AppColors.primary : AppColors.line),
                  ),
                  child: ListTile(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    title: Text(option.$2, style: const TextStyle(fontWeight: FontWeight.w700)),
                    subtitle: Text(roleCopy[option.$1] ?? ''),
                    trailing: RoleBadge(role: option.$1),
                    onTap: () => setState(() => _role = option.$1),
                  ),
                ),
              );
            }),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: _role == null || auth.isLoading
                  ? null
                  : () async {
                      final error = await ref.read(authStateProvider.notifier).setRole(_role!);
                      if (error != null && context.mounted) await showError(context, error);
                    },
              child: const Text('Continue'),
            ),
          ],
        ),
      ),
    );
  }
}
