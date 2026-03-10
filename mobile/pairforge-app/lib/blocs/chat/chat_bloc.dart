import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'chat_state.dart';
import '../../models/message_model.dart';
import '../../repositories/chat_repository.dart';
import '../../providers/auth_provider.dart';

class ChatNotifier extends Notifier<ChatState> {
  late final ChatRepository _repo;
  late final String _userId;
  String? _currentMatchId;

  @override
  ChatState build() {
    _repo = ref.read(chatRepositoryProvider);
    _userId = ref.read(authStateProvider).userId ?? '';
    ref.onDispose(leaveMatch);
    return const ChatIdle();
  }

  void joinMatch(String matchId) {
    state = const ChatConnecting();
    _currentMatchId = matchId;

    _repo.onConnect((_) {
      if (state is ChatConnecting) state = const ChatConnected();
    });

    _repo.onDisconnect((_) => state = const ChatIdle());

    _repo.onMessage((data) {
      final msg = MessageModel.fromJson(data as Map<String, dynamic>);
      final current = state;
      if (current is ChatConnected) {
        state = current.copyWith(messages: [...current.messages, msg]);
      }
    });

    _repo.joinMatch(matchId, _userId);

    if (state is ChatConnecting) state = const ChatConnected();
  }

  void sendMessage(String content, {String type = 'text'}) {
    if (_currentMatchId == null) return;
    final current = state;
    if (current is! ChatConnected) return;
    state = current.copyWith(isSending: true);
    _repo.sendMessage(
      matchId: _currentMatchId!,
      senderId: _userId,
      content: content,
      type: type,
    );
    state = current.copyWith(isSending: false);
  }

  void leaveMatch() {
    if (_currentMatchId != null) {
      _repo.leaveMatch(_currentMatchId!);
      _currentMatchId = null;
    }
    state = const ChatIdle();
  }
}

final chatNotifierProvider =
    NotifierProvider<ChatNotifier, ChatState>(ChatNotifier.new);
