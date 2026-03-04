import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'socket_provider.dart';
import 'auth_provider.dart';

// ─── Message Model ────────────────────────────────────────────────────────────

class ChatMessage {
  final String id;
  final String matchId;
  final String senderId;
  final String content;
  final String type; // text | code | file
  final DateTime createdAt;

  const ChatMessage({
    required this.id,
    required this.matchId,
    required this.senderId,
    required this.content,
    this.type = 'text',
    required this.createdAt,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) => ChatMessage(
        id: json['id'] as String,
        matchId: json['matchId'] as String,
        senderId: json['senderId'] as String,
        content: json['content'] as String,
        type: json['type'] as String? ?? 'text',
        createdAt: DateTime.parse(json['createdAt'] as String),
      );
}

// ─── Chat State ───────────────────────────────────────────────────────────────

class ChatState {
  final List<ChatMessage> messages;
  final bool isConnected;
  final bool isSending;
  final String? error;

  const ChatState({
    this.messages = const [],
    this.isConnected = false,
    this.isSending = false,
    this.error,
  });

  ChatState copyWith({
    List<ChatMessage>? messages,
    bool? isConnected,
    bool? isSending,
    String? error,
  }) {
    return ChatState(
      messages: messages ?? this.messages,
      isConnected: isConnected ?? this.isConnected,
      isSending: isSending ?? this.isSending,
      error: error,
    );
  }
}

// ─── Chat Notifier ────────────────────────────────────────────────────────────

class ChatNotifier extends Notifier<ChatState> {
  late final io.Socket _socket;
  late final String _userId;
  String? _currentMatchId;

  @override
  ChatState build() {
    _socket = ref.read(socketProvider);
    _userId = ref.read(authStateProvider).userId ?? '';
    ref.onDispose(() => leaveMatch());
    return const ChatState();
  }

  void joinMatch(String matchId) {
    _currentMatchId = matchId;
    if (!_socket.connected) _socket.connect();

    _socket.emit('join_match', {'matchId': matchId, 'userId': _userId});

    _socket.on('message', (data) {
      final msg = ChatMessage.fromJson(data as Map<String, dynamic>);
      state = state.copyWith(messages: [...state.messages, msg]);
    });

    _socket.on('connect', (_) => state = state.copyWith(isConnected: true));
    _socket.on('disconnect', (_) => state = state.copyWith(isConnected: false));

    state = state.copyWith(isConnected: _socket.connected);
  }

  void sendMessage(String content, {String type = 'text'}) {
    if (_currentMatchId == null) return;
    state = state.copyWith(isSending: true);
    _socket.emit('send_message', {
      'matchId': _currentMatchId,
      'senderId': _userId,
      'content': content,
      'type': type,
    });
    state = state.copyWith(isSending: false);
  }

  void leaveMatch() {
    if (_currentMatchId != null) {
      _socket.emit('leave_match', {'matchId': _currentMatchId});
    }
    _socket.off('message');
    _currentMatchId = null;
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

final chatProvider =
    NotifierProvider<ChatNotifier, ChatState>(ChatNotifier.new);
