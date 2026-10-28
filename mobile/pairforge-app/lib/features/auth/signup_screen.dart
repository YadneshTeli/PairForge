import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers/auth_provider.dart';

class SignupScreen extends ConsumerStatefulWidget {
  const SignupScreen({super.key});

  @override
  ConsumerState<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends ConsumerState<SignupScreen> {
  final _email = TextEditingController();
  final _username = TextEditingController();
  final _displayName = TextEditingController();
  final _password = TextEditingController();

  @override
  void dispose() {
    _email.dispose();
    _username.dispose();
    _displayName.dispose();
    _password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authStateProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Create account')),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          TextField(controller: _displayName, decoration: const InputDecoration(labelText: 'Display name')),
          const SizedBox(height: 12),
          TextField(controller: _username, decoration: const InputDecoration(labelText: 'Username')),
          const SizedBox(height: 12),
          TextField(controller: _email, decoration: const InputDecoration(labelText: 'Email'), keyboardType: TextInputType.emailAddress),
          const SizedBox(height: 12),
          TextField(controller: _password, decoration: const InputDecoration(labelText: 'Password'), obscureText: true),
          if (auth.error != null) ...[
            const SizedBox(height: 12),
            Text(auth.error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ],
          const SizedBox(height: 20),
          FilledButton(
            onPressed: auth.isLoading
                ? null
                : () => ref.read(authStateProvider.notifier).signup(
                      email: _email.text.trim(),
                      username: _username.text.trim(),
                      password: _password.text,
                      displayName: _displayName.text.trim().isEmpty ? _username.text.trim() : _displayName.text.trim(),
                    ),
            child: Text(auth.isLoading ? 'Creating…' : 'Create account'),
          ),
          TextButton(onPressed: () => context.go('/login'), child: const Text('I already have an account')),
        ],
      ),
    );
  }
}
