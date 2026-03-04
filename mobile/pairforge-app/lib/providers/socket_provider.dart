import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../core/config/app_config.dart';

final socketProvider = Provider<io.Socket>((ref) {
  final socket = io.io(
    AppConfig.wsBaseUrl,
    io.OptionBuilder()
        .setTransports(['websocket'])
        .disableAutoConnect()
        .setReconnectionAttempts(5)
        .setReconnectionDelay(2000)
        .build(),
  );

  ref.onDispose(() {
    socket.disconnect();
    socket.dispose();
  });

  return socket;
});

// Tracks live connection state
class SocketConnectedNotifier extends Notifier<bool> {
  @override
  bool build() => false;

  void setConnected(bool value) => state = value;
}

final socketConnectedProvider =
    NotifierProvider<SocketConnectedNotifier, bool>(SocketConnectedNotifier.new);
