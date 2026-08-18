import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'app.dart';
import 'core/config/app_config.dart';
import 'core/di/core_providers.dart';
/// Shared bootstrap for all flavors: error handling + DI overrides. Sentry wiring is a one-liner here when SENTRY_DSN is set.
Future<void> bootstrap(AppFlavor flavor) async {
  WidgetsFlutterBinding.ensureInitialized();
  final config = AppConfig.fromEnvironment(flavor);
  FlutterError.onError = (d) { FlutterError.presentError(d); if (kReleaseMode) { /* Sentry.captureException(d.exception, stackTrace: d.stack) */ } };
  runZonedGuarded(() => runApp(ProviderScope(overrides: [appConfigProvider.overrideWithValue(config)], child: const SinaatyApp())), (e, s) { debugPrint('uncaught: $e'); });
}
