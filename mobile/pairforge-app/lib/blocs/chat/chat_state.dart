import '../../models/message_model.dart';

sealed class ChatState {
  const ChatState();
}

class ChatIdle extends ChatState {
  const ChatIdle();
}

class ChatConnecting extends ChatState {
  const ChatConnecting();
}

class ChatConnected extends ChatState {
  final List<MessageModel> messages;
  final bool isSending;

  const ChatConnected({
    this.messages = const [],
    this.isSending = false,
  });

  ChatConnected copyWith({
    List<MessageModel>? messages,
    bool? isSending,
  }) =>
      ChatConnected(
        messages: messages ?? this.messages,
        isSending: isSending ?? this.isSending,
      );
}

class ChatError extends ChatState {
  final String message;
  const ChatError(this.message);
}
