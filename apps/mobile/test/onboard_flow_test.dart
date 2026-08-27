import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sinaaty/core/di/core_providers.dart';
import 'package:sinaaty/core/l10n/app_localizations.dart';
import 'package:sinaaty/core/location/here.dart';
import 'package:sinaaty/core/theme/app_theme.dart';
import 'package:sinaaty/features/workshop/presentation/onboard_screen.dart';
import 'package:sinaaty/features/workshop/presentation/providers.dart';
import 'workshop_flow_test.dart' show FakeBackend;

class FixedHere implements Here {
  @override Future<({double lat, double lng})?> now() async => (lat: 24.71, lng: 46.67);
  @override Future<({double lat, double lng})?> ifGranted() async => (lat: 24.71, lng: 46.67);
}

void main() {
  testWidgets('صاحب ورشة يسجّلها بنفسه: بيانات ← موقع ← وثيقتان ← مراجعة', (tester) async {
    tester.view.physicalSize = const Size(1170, 2532); tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    final repo = FakeBackend();

    await tester.pumpWidget(ProviderScope(key: UniqueKey(), overrides: [
      hereProvider.overrideWithValue(FixedHere()),
      workshopRepositoryProvider.overrideWithValue(repo),
    ], child: MaterialApp(
      theme: AppTheme.light(), locale: const Locale('ar'), supportedLocales: L10n.supportedLocales,
      localizationsDelegates: const [L10n.delegate, GlobalMaterialLocalizations.delegate, GlobalWidgetsLocalizations.delegate, GlobalCupertinoLocalizations.delegate],
      // صورةٌ جاهزة بدل الكاميرا: الاختبار يصف السلوك لا يستدعي عتاداً.
      home: OnboardScreen(pickImage: () async => Uint8List.fromList(List.filled(64, 7))),
    )));
    await tester.pumpAndSettle();

    // ١) البيانات — الزرّ ميّت حتى يُكتب اسم، فلا نقرةَ بلا أثر.
    expect(tester.widget<FilledButton>(find.widgetWithText(FilledButton, 'أنشئ الورشة')).onPressed, isNull);
    await tester.enterText(find.byType(TextField).first, 'ورشة الأمانة');
    await tester.pumpAndSettle();
    await tester.tap(find.text('تشليح'));                      // نوع النشاط يُنقر لا يُختار من قائمة
    await tester.pumpAndSettle();
    await tester.tap(find.text('أنشئ الورشة'));
    await tester.pumpAndSettle();
    expect(repo.registeredName, 'ورشة الأمانة');
    expect(repo.registeredType, 'scrapyard');

    // ٢) الموقع — يُقرأ من الجهاز، وتبقى المدينة مطلوبة لأن الاكتشاف يُصفّي بها.
    expect(find.text('موقعك الحالي'), findsOneWidget);
    await tester.enterText(find.byType(TextField).first, 'الرياض');
    await tester.pumpAndSettle();
    await tester.tap(find.text('التالي'));
    await tester.pumpAndSettle();

    // ٣) الوثيقتان — الإرسال ممنوع حتى تكتملا.
    expect(tester.widget<FilledButton>(find.widgetWithText(FilledButton, 'أرسل للمراجعة')).onPressed, isNull);
    await tester.tap(find.widgetWithText(TextButton, 'أرفق').first);
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(TextButton, 'أرفق').first);
    await tester.pumpAndSettle();
    expect(repo.kyb, containsAll(['commercial_registration', 'owner_id']));

    await tester.tap(find.text('أرسل للمراجعة'));
    await tester.pumpAndSettle();
    expect(repo.submitted, isTrue);
    // ولا يُترك معلّقاً: يعرف أين وقف ومتى يصله الردّ.
    expect(find.text('ورشتك قيد المراجعة'), findsOneWidget);
  });
}
