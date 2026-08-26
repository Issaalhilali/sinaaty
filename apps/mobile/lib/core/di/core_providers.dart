import '../location/here.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import '../auth/token_store.dart';
import '../config/app_config.dart';

/// Core DI. `appConfigProvider` is overridden per flavor entrypoint.
final appConfigProvider = Provider<AppConfig>((_) => throw UnimplementedError('override in main_<flavor>.dart'));

class LocaleNotifier extends Notifier<String> { @override String build() => 'ar'; void set(String locale) => state = locale; }
final localeProvider = NotifierProvider<LocaleNotifier, String>(LocaleNotifier.new);

class SessionExpiredNotifier extends Notifier<int> { @override int build() => 0; void bump() => state = state + 1; }
final sessionExpiredProvider = NotifierProvider<SessionExpiredNotifier, int>(SessionExpiredNotifier.new);

final tokenStoreProvider = Provider<TokenStore>((_) => TokenStore());
final apiClientProvider = Provider<ApiClient>((ref) => ApiClient(config: ref.watch(appConfigProvider), tokens: ref.watch(tokenStoreProvider), locale: () => ref.read(localeProvider), onSessionExpired: () => ref.read(sessionExpiredProvider.notifier).bump()));
/// موقع الجهاز — يُستبدل في الاختبارات بموقع ثابت، فلا اختبارٌ يطلب GPS.
final hereProvider = Provider<Here>((_) => const Here());
