import 'package:flutter/foundation.dart';

import 'platform_host_stub.dart' if (dart.library.io) 'platform_host_io.dart';

class AppConfig {
  static String apiBaseUrl = 'http://${platformHost()}:3000/api';
  static String wsBaseUrl = 'http://${platformHost()}:3000';
  static String environment = const String.fromEnvironment('ENV', defaultValue: 'development');

  static Future<void> initialize() async {
    const api = String.fromEnvironment('API_BASE_URL');
    const ws = String.fromEnvironment('WS_BASE_URL');
    const env = String.fromEnvironment('ENV');
    if (api.isNotEmpty) apiBaseUrl = api;
    if (ws.isNotEmpty) wsBaseUrl = ws;
    if (env.isNotEmpty) environment = env;
  }
}

bool get isDevelopment => !kReleaseMode && AppConfig.environment == 'development';
