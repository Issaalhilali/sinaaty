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

/// هل رأى هذا الجهاز شاشات الترحيب؟ تُقرأ متزامنةً في حارس المسارات، فتُحمَّل مرةً عند الإقلاع
/// (بديل bootstrap) ويقلبها «ابدأ» فوراً — الكتابة إلى القرص تجري في الخلفية داخل الشاشة.
final welcomeSeenInitialProvider = Provider<bool>((_) => true);   // يستبدله bootstrap بقيمة القرص
class WelcomeSeen extends Notifier<bool> { @override bool build() => ref.read(welcomeSeenInitialProvider); void mark() => state = true; }
final welcomeSeenProvider = NotifierProvider<WelcomeSeen, bool>(WelcomeSeen.new);

/// ضيفٌ يستكشف قبل أن يسجّل — حالة جلسةٍ عابرة لا تُحفظ: من أغلق التطبيق عاد من بابه.
/// تفتح /explore وحدها في حارس المسارات؛ الدخول أو أي فعل حقيقي يطويها.
class GuestMode extends Notifier<bool> {
  @override bool build() => false;
  void enter() => state = true;
  void leave() => state = false;
}
final guestModeProvider = NotifierProvider<GuestMode, bool>(GuestMode.new);

/// «جهّز حسابك» صُرف عنه بيده — لا يُلحّ على من قال لاحقاً.
final setupDismissedInitialProvider = Provider<bool>((_) => false);
class SetupDismissed extends Notifier<bool> { @override bool build() => ref.read(setupDismissedInitialProvider); void mark() => state = true; }
final setupDismissedProvider = NotifierProvider<SetupDismissed, bool>(SetupDismissed.new);
