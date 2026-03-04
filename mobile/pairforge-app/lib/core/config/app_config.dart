class AppConfig {
  static late String apiBaseUrl;
  static late String wsBaseUrl;
  static late String environment;

  static Future<void> initialize() async {
    // Load from env or flavor config
    apiBaseUrl = const String.fromEnvironment('API_BASE_URL', defaultValue: 'http://localhost:3000');
    wsBaseUrl = const String.fromEnvironment('WS_BASE_URL', defaultValue: 'ws://localhost:3001');
    environment = const String.fromEnvironment('ENV', defaultValue: 'development');
  }
}
