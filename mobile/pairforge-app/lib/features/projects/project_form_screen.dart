import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../data/api.dart';
import '../../models/models.dart';
import '../../providers/app_providers.dart';
import '../../providers/dio_provider.dart';
import '../../ui/widgets.dart';

const stages = ['idea', 'prototype', 'mvp', 'launched'];
const lookingOptions = ['cofounder', 'funding', 'developer', 'freelancer', 'feedback'];

class ProjectFormScreen extends ConsumerStatefulWidget {
  const ProjectFormScreen({super.key, this.projectId});

  final String? projectId;

  @override
  ConsumerState<ProjectFormScreen> createState() => _ProjectFormScreenState();
}

class _ProjectFormScreenState extends ConsumerState<ProjectFormScreen> {
  final _title = TextEditingController();
  final _tagline = TextEditingController();
  final _description = TextEditingController();
  final _tags = TextEditingController();
  String _stage = 'idea';
  final Set<String> _lookingFor = {};
  bool _loading = false;
  bool _ready = false;

  @override
  void initState() {
    super.initState();
    final id = widget.projectId;
    if (id == null) {
      _ready = true;
    } else {
      _load(id);
    }
  }

  Future<void> _load(String id) async {
    try {
      final project = await ref.read(apiProvider).project(id);
      _title.text = project.title;
      _tagline.text = project.tagline;
      _description.text = project.description;
      _tags.text = project.tags.join(', ');
      _stage = project.stage;
      _lookingFor.addAll(project.lookingFor);
      if (mounted) setState(() => _ready = true);
    } on ApiException catch (error) {
      if (mounted) await showError(context, error);
    }
  }

  @override
  void dispose() {
    _title.dispose();
    _tagline.dispose();
    _description.dispose();
    _tags.dispose();
    super.dispose();
  }

  Map<String, dynamic> _body() {
    return {
      'title': _title.text.trim(),
      'tagline': _tagline.text.trim(),
      'description': _description.text.trim(),
      'stage': _stage,
      'lookingFor': _lookingFor.toList(),
      'tags': _tags.text.split(',').map((tag) => tag.trim()).where((tag) => tag.isNotEmpty).toList(),
    };
  }

  Future<void> _save() async {
    if (_title.text.trim().isEmpty || _tagline.text.trim().isEmpty || _description.text.trim().isEmpty) {
      await showError(context, 'Title, tagline, and description are required.');
      return;
    }
    setState(() => _loading = true);
    try {
      final api = ref.read(apiProvider);
      final id = widget.projectId;
      final Project project;
      if (id == null) {
        project = await api.createProject(_body());
      } else {
        project = await api.updateProject(id, _body());
      }
      ref.invalidate(myProjectsProvider);
      ref.invalidate(feedProvider);
      if (mounted) context.go('/projects/${project.id}');
    } on ApiException catch (error) {
      if (mounted) await showError(context, error);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.projectId == null ? 'Post a project' : 'Edit project')),
      body: !_ready
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(20),
              children: [
                TextField(controller: _title, decoration: const InputDecoration(labelText: 'Title')),
                const SizedBox(height: 12),
                TextField(controller: _tagline, decoration: const InputDecoration(labelText: 'Tagline')),
                const SizedBox(height: 12),
                TextField(controller: _description, decoration: const InputDecoration(labelText: 'Description'), maxLines: 5),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: _stage,
                  decoration: const InputDecoration(labelText: 'Stage'),
                  items: stages.map((stage) => DropdownMenuItem(value: stage, child: Text(stage))).toList(),
                  onChanged: (value) => setState(() => _stage = value ?? _stage),
                ),
                const SizedBox(height: 12),
                TextField(controller: _tags, decoration: const InputDecoration(labelText: 'Tags, comma separated')),
                const SizedBox(height: 16),
                const Text('Looking for'),
                Wrap(
                  spacing: 8,
                  children: lookingOptions.map((option) {
                    return FilterChip(
                      label: Text(option),
                      selected: _lookingFor.contains(option),
                      onSelected: (selected) => setState(() {
                        if (selected) {
                          _lookingFor.add(option);
                        } else {
                          _lookingFor.remove(option);
                        }
                      }),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 20),
                FilledButton(onPressed: _loading ? null : _save, child: Text(_loading ? 'Saving…' : 'Save')),
              ],
            ),
    );
  }
}
