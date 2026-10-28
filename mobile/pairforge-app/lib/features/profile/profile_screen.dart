import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../models/models.dart';
import '../../providers/app_providers.dart';
import '../../providers/auth_provider.dart';
import '../../providers/dio_provider.dart';
import '../../ui/widgets.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(_meProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Your profile')),
      body: profile.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => ErrorView(message: error.toString(), onRetry: () => ref.invalidate(_meProvider)),
        data: (me) => ListView(
          padding: const EdgeInsets.all(20),
          children: [
            RoleBadge(role: me.role),
            const SizedBox(height: 12),
            Text(me.displayName, style: Theme.of(context).textTheme.headlineSmall),
            if (me.bio != null) Text(me.bio!),
            const SizedBox(height: 8),
            Text(me.interests.join(' · ')),
            const SizedBox(height: 8),
            Wrap(spacing: 8, children: me.skills.map((skill) => Chip(label: Text(skill.name))).toList()),
            const SizedBox(height: 20),
            FilledButton(onPressed: () => context.push('/profile/edit'), child: const Text('Edit profile')),
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: () async {
                await ref.read(authStateProvider.notifier).logout();
              },
              child: const Text('Log out'),
            ),
          ],
        ),
      ),
    );
  }
}

final _meProvider = FutureProvider<Profile>((ref) => ref.watch(apiProvider).profile());

class EditProfileScreen extends ConsumerStatefulWidget {
  const EditProfileScreen({super.key});

  @override
  ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  final _bio = TextEditingController();
  final _location = TextEditingController();
  final _interests = TextEditingController();
  final _skills = TextEditingController();
  final _github = TextEditingController();
  String? _experience;
  String? _intent;
  String _visibility = 'public';
  bool _ready = false;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final profile = await ref.read(apiProvider).profile();
    _bio.text = profile.bio ?? '';
    _location.text = profile.location ?? '';
    _interests.text = profile.interests.join(', ');
    _skills.text = profile.skills.map((skill) => '${skill.name} ${skill.proficiency}').join('\n');
    _experience = profile.experienceLevel;
    _intent = profile.connectionIntent;
    _visibility = profile.visibility;
    if (mounted) setState(() => _ready = true);
  }

  @override
  void dispose() {
    _bio.dispose();
    _location.dispose();
    _interests.dispose();
    _skills.dispose();
    _github.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      final interests = _interests.text.split(',').map((item) => item.trim()).where((item) => item.isNotEmpty).toList();
      final skills = <Map<String, dynamic>>[];
      for (final line in _skills.text.split('\n')) {
        final parts = line.trim().split(RegExp(r'\s+'));
        if (parts.length < 2) continue;
        final proficiency = int.tryParse(parts.last);
        if (proficiency == null) continue;
        skills.add({'name': parts.sublist(0, parts.length - 1).join(' '), 'proficiency': proficiency});
      }
      final api = ref.read(apiProvider);
      final profile = await api.updateProfile({
        'bio': _bio.text.trim().isEmpty ? null : _bio.text.trim(),
        'location': _location.text.trim().isEmpty ? null : _location.text.trim(),
        'experienceLevel': _experience,
        'connectionIntent': _intent,
        'visibility': _visibility,
        'interests': interests,
      });
      await api.updateSkills(skills);
      final github = _github.text.trim();
      if (github.isNotEmpty) {
        await api.linkGithub(github);
      }
      ref.read(authStateProvider.notifier).rememberProfile(profile);
      ref.invalidate(_meProvider);
      ref.invalidate(peopleProvider);
      if (mounted) context.pop();
    } catch (error) {
      if (mounted) await showError(context, error);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Edit profile')),
      body: !_ready
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(20),
              children: [
                TextField(controller: _bio, decoration: const InputDecoration(labelText: 'Bio'), maxLines: 3),
                const SizedBox(height: 12),
                TextField(controller: _location, decoration: const InputDecoration(labelText: 'Location')),
                const SizedBox(height: 12),
                DropdownButtonFormField<String?>(
                  initialValue: _experience,
                  decoration: const InputDecoration(labelText: 'Experience'),
                  items: const [
                    DropdownMenuItem(value: 'junior', child: Text('Junior')),
                    DropdownMenuItem(value: 'mid', child: Text('Mid')),
                    DropdownMenuItem(value: 'senior', child: Text('Senior')),
                    DropdownMenuItem(value: 'lead', child: Text('Lead')),
                  ],
                  onChanged: (value) => setState(() => _experience = value),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String?>(
                  initialValue: _intent,
                  decoration: const InputDecoration(labelText: 'Looking for'),
                  items: const [
                    DropdownMenuItem(value: 'dating', child: Text('Dating')),
                    DropdownMenuItem(value: 'networking', child: Text('Networking')),
                    DropdownMenuItem(value: 'collab', child: Text('Collaboration')),
                  ],
                  onChanged: (value) => setState(() => _intent = value),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: _visibility,
                  decoration: const InputDecoration(labelText: 'Visibility'),
                  items: const [
                    DropdownMenuItem(value: 'public', child: Text('Public')),
                    DropdownMenuItem(value: 'semi_private', child: Text('Semi-private')),
                    DropdownMenuItem(value: 'anonymous', child: Text('Anonymous')),
                  ],
                  onChanged: (value) => setState(() => _visibility = value ?? 'public'),
                ),
                const SizedBox(height: 12),
                TextField(controller: _interests, decoration: const InputDecoration(labelText: 'Interests, comma separated')),
                const SizedBox(height: 12),
                TextField(
                  controller: _skills,
                  decoration: const InputDecoration(labelText: 'Skills', hintText: 'typescript 5\nflutter 3'),
                  maxLines: 4,
                ),
                const SizedBox(height: 12),
                TextField(controller: _github, decoration: const InputDecoration(labelText: 'GitHub username')),
                const SizedBox(height: 20),
                FilledButton(onPressed: _saving ? null : _save, child: Text(_saving ? 'Saving…' : 'Save')),
              ],
            ),
    );
  }
}
