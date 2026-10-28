import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../../core/config/app_config.dart';
import '../../data/api.dart';
import '../../models/models.dart';
import '../../providers/auth_provider.dart';
import '../../providers/dio_provider.dart';
import '../../ui/widgets.dart';

class ChatScreen extends ConsumerStatefulWidget {
  const ChatScreen({super.key, required this.matchId});

  final String matchId;

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final _input = TextEditingController();
  final _messages = <ChatMessage>[];
  io.Socket? _socket;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _open();
  }

  Future<void> _open() async {
    try {
      final history = await ref.read(apiProvider).messages(widget.matchId);
      final token = ref.read(authStateProvider).token;
      if (!mounted) return;
      setState(() {
        _messages.addAll(history);
        _loading = false;
      });
      if (token == null) return;
      final socket = io.io(
        AppConfig.wsBaseUrl,
        io.OptionBuilder().setTransports(['websocket']).setAuth({'token': token}).disableAutoConnect().build(),
      );
      socket.on('messageEvent', (data) {
        final message = ChatMessage.fromJson(data);
        if (message.matchId != widget.matchId || _messages.any((item) => item.id == message.id)) return;
        setState(() => _messages.add(message));
        if (message.senderId != ref.read(authStateProvider).profileId) {
          socket.emit('readMessage', {'messageId': message.id});
        }
      });
      socket.onConnect((_) => socket.emit('join', {'matchId': widget.matchId}));
      socket.connect();
      _socket = socket;
      final me = ref.read(authStateProvider).profileId;
      for (final message in history) {
        if (message.senderId != me && message.readAt == null) {
          socket.emit('readMessage', {'messageId': message.id});
        }
      }
    } on ApiException catch (error) {
      if (mounted) setState(() { _error = error.message; _loading = false; });
    }
  }

  @override
  void dispose() {
    _socket?.emit('leaveRoom', {'matchId': widget.matchId});
    _socket?.dispose();
    _input.dispose();
    super.dispose();
  }

  void _send() {
    final text = _input.text.trim();
    if (text.isEmpty) return;
    _socket?.emit('sendMessage', {'matchId': widget.matchId, 'content': text});
    _input.clear();
  }

  @override
  Widget build(BuildContext context) {
    final me = ref.watch(authStateProvider).profileId;
    return Scaffold(
      appBar: AppBar(title: const Text('Chat')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? ErrorView(message: _error!, onRetry: () { setState(() { _loading = true; _error = null; }); _open(); })
              : Column(
                  children: [
                    Expanded(
                      child: _messages.isEmpty
                          ? const EmptyView(title: 'No messages yet', message: 'This chat just opened. Say hello.')
                          : ListView.builder(
                              padding: const EdgeInsets.all(16),
                              itemCount: _messages.length,
                              itemBuilder: (context, index) {
                                final message = _messages[index];
                                final mine = message.senderId == me;
                                return Align(
                                  alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
                                  child: Container(
                                    margin: const EdgeInsets.only(bottom: 8),
                                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                    constraints: const BoxConstraints(maxWidth: 280),
                                    decoration: BoxDecoration(
                                      color: mine ? Theme.of(context).colorScheme.primaryContainer : Theme.of(context).colorScheme.surfaceContainerHighest,
                                      borderRadius: BorderRadius.circular(16),
                                    ),
                                    child: Text(message.content),
                                  ),
                                );
                              },
                            ),
                    ),
                    SafeArea(
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Row(
                          children: [
                            Expanded(child: TextField(controller: _input, decoration: const InputDecoration(hintText: 'Message'), onSubmitted: (_) => _send())),
                            const SizedBox(width: 8),
                            IconButton.filled(onPressed: _send, icon: const Icon(Icons.send)),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
    );
  }
}
