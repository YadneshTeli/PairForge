import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers/auth_provider.dart';
import '../../ui/widgets.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authStateProvider);
    return AuthScaffold(
      eyebrow: 'WELCOME BACK',
      title: 'Sign in',
      children: [
        TextField(controller: _email, decoration: const InputDecoration(labelText: 'Email'), keyboardType: TextInputType.emailAddress),
        const SizedBox(height: 12),
        TextField(controller: _password, decoration: const InputDecoration(labelText: 'Password'), obscureText: true),
        if (auth.error != null) ...[
          const SizedBox(height: 12),
          Text(auth.error!, style: TextStyle(color: Theme.of(context).colorScheme.error, fontWeight: FontWeight.w700)),
        ],
        const SizedBox(height: 20),
        FilledButton(
          onPressed: auth.isLoading
              ? null
              : () => ref.read(authStateProvider.notifier).login(_email.text.trim(), _password.text),
          child: Text(auth.isLoading ? 'Signing in…' : 'Sign in'),
        ),
        TextButton(onPressed: () => context.go('/signup'), child: const Text('Create an account')),
      ],
    );
  }
}
