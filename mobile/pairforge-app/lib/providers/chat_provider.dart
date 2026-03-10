// Chat state management lives in blocs/chat/
//
// State classes : lib/blocs/chat/chat_state.dart
//   ChatState (sealed), ChatIdle, ChatConnecting, ChatConnected, ChatError
//
// Notifier + provider : lib/blocs/chat/chat_bloc.dart
//   ChatNotifier, chatNotifierProvider
export '../blocs/chat/chat_state.dart';
export '../blocs/chat/chat_bloc.dart' show ChatNotifier, chatNotifierProvider;

