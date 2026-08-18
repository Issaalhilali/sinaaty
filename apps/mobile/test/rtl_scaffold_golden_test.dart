import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sinaaty/core/l10n/app_localizations.dart';
import 'package:sinaaty/core/theme/app_theme.dart';
import 'package:sinaaty/core/ui/ui.dart';

/// Golden gate for Step 12: the standard scaffold renders RTL, Arabic-first, in light and dark.
Widget harness({required Widget child, required Brightness brightness}) => MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(), darkTheme: AppTheme.dark(), themeMode: brightness == Brightness.dark ? ThemeMode.dark : ThemeMode.light,
      locale: const Locale('ar'), supportedLocales: L10n.supportedLocales,
      localizationsDelegates: const [L10n.delegate, GlobalMaterialLocalizations.delegate, GlobalWidgetsLocalizations.delegate, GlobalCupertinoLocalizations.delegate],
      home: child,
    );

class _Sample extends StatelessWidget { const _Sample(); @override Widget build(BuildContext context) => AppScaffold(
      title: 'أمر إصلاح WO-2026-000123',
      moreItems: const [PopupMenuItem(value: 'x', child: Text('المزيد'))],
      body: ListView(padding: const EdgeInsets.all(16), children: [
        SectionCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Wrap(spacing: 8, runSpacing: 8, children: [StatusBadge('موقّع بنفاذ', tone: BadgeTone.seal, icon: Icons.verified), StatusBadge('مضمون بسند', tone: BadgeTone.brass), StatusBadge('بانتظار', tone: BadgeTone.warn)]),
          const SizedBox(height: 12), Text('ورشة النور للسمكرة', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 4), Text('كامري 2019 · أ ب ج 4821 · الإجمالي 1,368.50 ر.س', style: Theme.of(context).textTheme.bodyMedium),
        ])),
        const SizedBox(height: 16),
        const EmptyState(icon: Icons.directions_car_outlined, title: 'لا توجد سيارات بعد', body: 'أضف سيارتك برقم الهيكل أو اللوحة لتبدأ.', actionLabel: 'أضف سيارة'),
      ]),
      primaryAction: PrimaryButton(label: 'اعتماد عبر نفاذ', onPressed: () {}),
      bottom: NavigationBar(selectedIndex: 0, destinations: const [NavigationDestination(icon: Icon(Icons.directions_car_outlined), label: 'سياراتي'), NavigationDestination(icon: Icon(Icons.add_circle_outline), label: 'اطلب'), NavigationDestination(icon: Icon(Icons.account_balance_wallet_outlined), label: 'محفظتي'), NavigationDestination(icon: Icon(Icons.person_outline), label: 'حسابي')]),
    ); }

Future<void> loadArabicFont() async {
  final loader = FontLoader('PlexArabic');
  for (final f in ['Regular', 'Medium', 'SemiBold', 'Bold']) { loader.addFont(File('assets/fonts/IBMPlexSansArabic-$f.ttf').readAsBytes().then((b) => ByteData.view(b.buffer))); }
  await loader.load();
}

void main() {
  setUpAll(loadArabicFont);
  testWidgets('scaffold is RTL and Arabic', (tester) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    await tester.pumpWidget(harness(brightness: Brightness.light, child: const _Sample()));
    await tester.pumpAndSettle();
    expect(Directionality.of(tester.element(find.text('اعتماد عبر نفاذ'))), TextDirection.rtl);
    expect(find.text('موقّع بنفاذ'), findsOneWidget);
    expect(find.byType(NavigationDestination), findsNWidgets(4)); // never more than 4 tabs
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/rtl_scaffold_light.png'));
  });
  testWidgets('dark theme golden', (tester) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    await tester.pumpWidget(harness(brightness: Brightness.dark, child: const _Sample()));
    await tester.pumpAndSettle();
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/rtl_scaffold_dark.png'));
  });
}
