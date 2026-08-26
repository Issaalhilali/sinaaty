import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'app.dart';
import 'core/config/app_config.dart';
import 'core/di/core_providers.dart';
/// Shared bootstrap for all flavors: error handling + DI overrides. Sentry wiring is a one-liner here when SENTRY_DSN is set.
/// Everything — including ensureInitialized — runs INSIDE the guarded zone: binding and runApp must
/// share one zone or debug builds die at launch with a zone-mismatch error.
Future<void> bootstrap(AppFlavor flavor) async {
  await runZonedGuarded(() async {
    WidgetsFlutterBinding.ensureInitialized();
    final config = AppConfig.fromEnvironment(flavor);
    // Firebase للإشعارات وحدها. الفشل هنا لا يمنع التطبيق من العمل: بناءٌ بلا ملفات إعداد
    // (اختبار، أو نكهة لم تُسجَّل بعد) يجب أن يفتح ويعمل — يفقد التنبيه فقط.
    try { await Firebase.initializeApp(); } catch (e) { debugPrint('Firebase غير مهيّأ — الإشعارات معطّلة: $e'); }
    FlutterError.onError = (d) { FlutterError.presentError(d); if (kReleaseMode) { /* Sentry.captureException(d.exception, stackTrace: d.stack) */ } };
    runApp(ProviderScope(overrides: [appConfigProvider.overrideWithValue(config)], child: const SinaatyApp()));
  }, (e, s) { debugPrint('uncaught: $e'); });
}
