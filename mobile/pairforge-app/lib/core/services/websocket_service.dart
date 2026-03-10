import 'package:socket_io_client/socket_io_client.dart' as io;

class WebSocketService {
  final io.Socket _socket;

  const WebSocketService(this._socket);

  void connect() => _socket.connect();

  void disconnect() => _socket.disconnect();

  void emit(String event, dynamic data) => _socket.emit(event, data);

  void on(String event, dynamic Function(dynamic) handler) =>
      _socket.on(event, handler);

  void off(String event) => _socket.off(event);

  bool get isConnected => _socket.connected;
}
