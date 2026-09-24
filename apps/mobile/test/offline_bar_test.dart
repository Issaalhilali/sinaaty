import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sinaaty/core/api/network_state.dart';
import 'package:sinaaty/core/l10n/app_localizations.dart';
import 'package:sinaaty/core/theme/app_theme.dart';
import 'package:sinaaty/core/ui/ui.dart';

/// مؤشّر «غير متصل» واحد لكل النكهات: يظهر حين لا يُرى الخادم ويختفي مع أول ردّ — بلا حزمة اتصال،
/// من الطلبات نفسها (`NetworkState` يضبطه `ApiClient`).
void main() {
  Widget app() => MaterialApp(theme: AppTheme.light(), locale: const Locale('ar'), supportedLocales: const [Locale('ar'), Locale('en')],
      localizationsDelegates: const [L10n.delegate, GlobalMaterialLocalizations.delegate, GlobalWidgetsLocalizations.delegate, GlobalCupertinoLocalizations.delegate],
      home: const AppScaffold(title: 'x', body: SizedBox()));
  testWidgets('the offline bar follows NetworkState: hidden online, shown offline, gone again online', (tester) async {
    NetworkState.online.value = true; addTearDown(() => NetworkState.online.value = true);
    await tester.pumpWidget(app()); await tester.pump();
    expect(find.textContaining('غير متصل'), findsNothing);
    NetworkState.online.value = false; await tester.pump();
    expect(find.text('غير متصل — نعيد المحاولة تلقائياً حين تعود الشبكة.'), findsOneWidget);
    NetworkState.online.value = true; await tester.pump();
    expect(find.textContaining('غير متصل'), findsNothing);
  });
}
