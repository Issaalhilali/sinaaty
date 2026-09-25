import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/di/core_providers.dart';
import 'core/l10n/app_localizations.dart';
import 'core/routing/app_router.dart';
import 'core/theme/app_theme.dart';
import 'core/ui/widgets/wide_shell.dart';
/// Root widget: Arabic default + RTL, light/dark themes, router with auth guard.
class SinaatyApp extends ConsumerWidget {
  const SinaatyApp({super.key});
  @override Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider);
    return MaterialApp.router(
      title: 'صناعية', debugShowCheckedModeBanner: false,
      // هوية واحدة لا وضعان: صناعية فاتحة بأخضر الختم مهما كان إعداد الجهاز (توجيه المالك 2026-08-29).
      // الوضع الداكن كان يقلب الهوية سواداً عاماً بلا شخصية — أُقفل كما أُقفلت شاشات الدخول قبله.
      theme: AppTheme.light(), darkTheme: AppTheme.light(), themeMode: ThemeMode.light,
      locale: Locale(locale), supportedLocales: L10n.supportedLocales, localizationsDelegates: const [L10n.delegate, GlobalMaterialLocalizations.delegate, GlobalWidgetsLocalizations.delegate, GlobalCupertinoLocalizations.delegate],
      routerConfig: ref.watch(routerProvider),
      // الوِب يُفتح من حاسوب: بلا WideShell تُدفع الورقة خارج الشاشة فلا يُرى إلا خلفية خضراء.
      // والنص يناسب كل شاشة (شكوى المالك): تكبير النظام له سقف كي لا ينفجر التخطيط،
      // والشاشات الضيقة (<370dp) تنزل درجة خفيفة بدل أن تلتف الجمل وتزدحم.
      builder: (context, child) {
        final mq = MediaQuery.of(context);
        final narrow = mq.size.shortestSide < 370 ? .94 : 1.0;
        final capped = mq.textScaler.scale(14).clamp(14 * .85, 14 * 1.2) / 14;
        return MediaQuery(
          data: mq.copyWith(textScaler: TextScaler.linear(capped * narrow)),
          child: WideShell(child: child ?? const SizedBox.shrink()),
        );
      },
    );
  }
}
