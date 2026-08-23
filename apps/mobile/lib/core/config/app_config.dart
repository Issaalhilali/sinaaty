import 'dev_host.dart';

/// Build-time configuration via `--dart-define-from-file=env/dev.json` plus the flavor entrypoint.
enum AppFlavor { customer, partner, fleet }
class AppConfig {
  final AppFlavor flavor; final String apiBaseUrl; final String appEnv; final String sentryDsn;
  const AppConfig({required this.flavor, required this.apiBaseUrl, required this.appEnv, required this.sentryDsn});
  factory AppConfig.fromEnvironment(AppFlavor flavor) => AppConfig(
        flavor: flavor,
        // A bare `flutter run` passes no dart-define, and «localhost» on a real phone is the phone
        // itself — every call then waits out the connect timeout and the app looks frozen while
        // being healthy. The generated dev host makes the bare command behave like ./run.sh; any
        // real build passes --dart-define, which always wins over this default.
        apiBaseUrl: const String.fromEnvironment('API_BASE_URL', defaultValue: kDevLanHost),
        appEnv: const String.fromEnvironment('APP_ENV', defaultValue: 'dev'),
        sentryDsn: const String.fromEnvironment('SENTRY_DSN', defaultValue: ''),
      );
  bool get isDev => appEnv == 'dev';
  String get apiV1 => '$apiBaseUrl/v1';
}
