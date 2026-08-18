/// Build-time configuration via `--dart-define-from-file=env/dev.json` plus the flavor entrypoint.
enum AppFlavor { customer, partner, fleet }
class AppConfig {
  final AppFlavor flavor; final String apiBaseUrl; final String appEnv; final String sentryDsn;
  const AppConfig({required this.flavor, required this.apiBaseUrl, required this.appEnv, required this.sentryDsn});
  factory AppConfig.fromEnvironment(AppFlavor flavor) => AppConfig(
        flavor: flavor,
        apiBaseUrl: const String.fromEnvironment('API_BASE_URL', defaultValue: 'http://localhost:3000'),
        appEnv: const String.fromEnvironment('APP_ENV', defaultValue: 'dev'),
        sentryDsn: const String.fromEnvironment('SENTRY_DSN', defaultValue: ''),
      );
  bool get isDev => appEnv == 'dev';
  String get apiV1 => '$apiBaseUrl/v1';
}
