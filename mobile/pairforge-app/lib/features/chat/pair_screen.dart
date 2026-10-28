import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../../core/config/app_config.dart';
import '../../providers/auth_provider.dart';

class PairScreen extends ConsumerStatefulWidget {
  const PairScreen({super.key, required this.matchId});

  final String matchId;

  @override
  ConsumerState<PairScreen> createState() => _PairScreenState();
}

class _PairScreenState extends ConsumerState<PairScreen> {
  final _document = TextEditingController();
  io.Socket? _socket;
  int _revision = 0;
  bool _applying = false;

  @override
  void initState() {
    super.initState();
    final token = ref.read(authStateProvider).token;
    if (token == null) return;
    final socket = io.io(
      AppConfig.wsBaseUrl,
      io.OptionBuilder().setTransports(['websocket']).setAuth({'token': token}).disableAutoConnect().build(),
    );
    socket.on('pairState', _apply);
    socket.on('pairEdit', _apply);
    socket.onConnect((_) => socket.emit('pairJoin', {'matchId': widget.matchId}));
    socket.connect();
    _socket = socket;
  }

  void _apply(dynamic data) {
    if (data is! Map) return;
    _applying = true;
    _revision = (data['revision'] as num?)?.toInt() ?? _revision;
    _document.text = data['document']?.toString() ?? '';
    _applying = false;
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _socket?.dispose();
    _document.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Pair session')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Edits sync with the other person. Video calls are on the web client.'),
            const SizedBox(height: 12),
            Expanded(
              child: TextField(
                controller: _document,
                maxLines: null,
                expands: true,
                decoration: const InputDecoration(alignLabelWithHint: true, labelText: 'Shared document'),
                onChanged: (value) {
                  if (_applying) return;
                  _socket?.emit('pairEdit', {
                    'matchId': widget.matchId,
                    'document': value,
                    'revision': _revision,
                  });
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
