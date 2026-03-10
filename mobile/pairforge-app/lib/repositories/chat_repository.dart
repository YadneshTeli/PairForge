import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/services/websocket_service.dart';
import '../providers/socket_provider.dart';

class ChatRepository {
  final WebSocketService _ws;

  const ChatRepository({required WebSocketService ws}) : _ws = ws;

  void joinMatch(String matchId, String userId) {
    if (!_ws.isConnected) _ws.connect();
    _ws.emit('join_match', {'matchId': matchId, 'userId': userId});
  }

  void leaveMatch(String matchId) {
    _ws.emit('leave_match', {'matchId': matchId});
    _ws.off('message');
    _ws.off('connect');
    _ws.off('disconnect');
  }

  void sendMessage({
    required String matchId,
    required String senderId,
    required String content,
    String type = 'text',
  }) {
    _ws.emit('send_message', {
      'matchId': matchId,
      'senderId': senderId,
      'content': content,
      'type': type,
    });
  }

  void onMessage(dynamic Function(dynamic) handler) =>
      _ws.on('message', handler);

  void onConnect(dynamic Function(dynamic) handler) =>
      _ws.on('connect', handler);

  void onDisconnect(dynamic Function(dynamic) handler) =>
      _ws.on('disconnect', handler);
}

final chatRepositoryProvider = Provider<ChatRepository>(
  (ref) => ChatRepository(ws: ref.read(webSocketServiceProvider)),
);
