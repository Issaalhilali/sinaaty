import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sinaaty/core/l10n/app_localizations.dart';
import 'package:sinaaty/core/result/result.dart';
import 'package:sinaaty/core/scan/doc_text.dart';
import 'package:sinaaty/core/theme/app_theme.dart';
import 'package:sinaaty/features/vehicles/domain/istimara.dart';
import 'package:sinaaty/features/vehicles/domain/vehicle.dart';
import 'package:sinaaty/features/vehicles/domain/vehicles_repository.dart';
import 'package:sinaaty/features/vehicles/presentation/add_vehicle_screen.dart';
import 'package:sinaaty/features/vehicles/presentation/providers.dart';

import 'fleet_flow_test.dart' show loadArabicFont;

/// الاستمارة تُقرأ على الجهاز، والقارئ الضوئي يخطئ. فالقاعدة هنا: ما لم يُقرأ بثقة يُترك فارغاً —
/// استمارةٌ تُقرأ خطأً تُنشئ سجلاً على سيارة أخرى، وهو أسوأ من حقل فارغ.
void main() {
  setUpAll(loadArabicFont);
  test('استمارة كاملة: الهيكل واللوحة والسنة والماركة', () {
    final r = parseIstimara('''
KINGDOM OF SAUDI ARABIA
VEHICLE REGISTRATION
Plate No: ABJ 4821
Chassis No: JTDKN3DU0A0123456
Model Year: 2019
Make: TOYOTA   Model: CAMRY
''');
    expect(r.vin, 'JTDKN3DU0A0123456');
    expect(r.plate, 'ABJ 4821');
    expect(r.year, 2019);
    expect(r.makeEn, 'تويوتا');
    expect(r.found, 4);
  });

  test('اللوحة بالترتيب المعكوس (أرقام ثم حروف) كما تُطبع أحياناً', () {
    final r = parseIstimara('4821 ABJ\nCHASSIS JTDKN3DU0A0123456');
    expect(r.plate, 'ABJ 4821');
  });

  test('اللوحة لا تُلتقط من داخل رقم الهيكل', () {
    // رقم الهيكل نفسه فيه حروف وأرقام متجاورة تشبه اللوحة.
    final r = parseIstimara('JTDKN3DU0A0123456');
    expect(r.vin, 'JTDKN3DU0A0123456');
    expect(r.plate, isNull, reason: 'لا لوحة في الصورة ⟵ لا تُخترع لوحة');
  });

  test('السنة لا تُؤخذ من أرقام رقم الهيكل', () {
    final r = parseIstimara('VIN JTDKN3DU0A2019456');
    expect(r.year, isNull, reason: '2019 داخل الهيكل ليست سنة صنع مقروءة');
  });

  test('صورة رديئة لا تُعطي شيئاً ⟵ لا يُملأ حقل بثقة كاذبة', () {
    final r = parseIstimara('....\n???\n');
    expect(r.isEmpty, isTrue);
    expect(r.found, 0);
  });

  test('قراءة جزئية مقبولة: ما وُجد يُملأ وما لا يُترك', () {
    final r = parseIstimara('Plate No ABJ 4821\nModel Year 2019');
    expect(r.vin, isNull);
    expect(r.plate, 'ABJ 4821');
    expect(r.year, 2019);
    expect(r.found, 2);
  });

  testWidgets('صورة الاستمارة تملأ الحقول، وتقول ماذا قرأت، ولا تعتمد بصمت', (tester) async {
    tester.view.physicalSize = const Size(1170, 2532); tester.view.devicePixelRatio = 3; addTearDown(tester.view.reset);
    await tester.pumpWidget(ProviderScope(key: UniqueKey(), overrides: [
      docTextReaderProvider.overrideWithValue(FakeReader('Plate No ABJ 4821\nChassis JTDKN3DU0A0123456\nModel Year 2019\nTOYOTA')),
      vehiclesRepositoryProvider.overrideWithValue(FakeVehiclesRepo()),
    ], child: MaterialApp(theme: AppTheme.light(), locale: const Locale('ar'), supportedLocales: L10n.supportedLocales,
      localizationsDelegates: const [L10n.delegate, GlobalMaterialLocalizations.delegate, GlobalWidgetsLocalizations.delegate, GlobalCupertinoLocalizations.delegate],
      home: AddVehicleScreen(pickPhoto: () async => '/tmp/istimara.jpg'))));
    await tester.pumpAndSettle();

    await tester.tap(find.text('التقط الصورة')); await tester.pumpAndSettle();
    expect(find.text('قرأتُ 4 من الاستمارة'), findsOneWidget);
    expect(find.textContaining('تويوتا'), findsOneWidget);
    expect(find.textContaining('راجع الحقول'), findsOneWidget, reason: 'لا اعتماد بصمت');
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/add_vehicle_read_light.png'));
    // الحقل أسفل الشاشة في قائمة كسولة — تُسحب القائمة قبل قراءته.
    await tester.drag(find.byType(ListView), const Offset(0, -400));
    await tester.pumpAndSettle();
    expect(find.text('JTDKN3DU0A0123456'), findsWidgets, reason: 'رقم الهيكل مُلئ من الاستمارة');
  });

  testWidgets('صورة لا تُقرأ: تُقال الحقيقة ولا تُترك الشاشة صامتة', (tester) async {
    tester.view.physicalSize = const Size(1170, 2532); tester.view.devicePixelRatio = 3; addTearDown(tester.view.reset);
    await tester.pumpWidget(ProviderScope(key: UniqueKey(), overrides: [
      docTextReaderProvider.overrideWithValue(FakeReader(null)),
      vehiclesRepositoryProvider.overrideWithValue(FakeVehiclesRepo()),
    ], child: MaterialApp(theme: AppTheme.light(), locale: const Locale('ar'), supportedLocales: L10n.supportedLocales,
      localizationsDelegates: const [L10n.delegate, GlobalMaterialLocalizations.delegate, GlobalWidgetsLocalizations.delegate, GlobalCupertinoLocalizations.delegate],
      home: AddVehicleScreen(pickPhoto: () async => '/tmp/x.jpg'))));
    await tester.pumpAndSettle();
    await tester.tap(find.text('التقط الصورة')); await tester.pumpAndSettle();
    expect(find.textContaining('لم أقرأ شيئاً'), findsOneWidget);
  });
}

class FakeReader implements DocTextReader {
  final String? text; FakeReader(this.text);
  @override Future<String?> read(String imagePath) async => text;
}

class FakeVehiclesRepo implements VehiclesRepository {
  @override Future<Result<List<Vehicle>>> list() async => const Result.ok([]);
  @override Future<Result<Vehicle>> add({String? vin, String? plate}) async => const Result.err(UnknownFailure());
  @override Future<Result<VehiclePassport>> passport(String id) async => const Result.err(UnknownFailure());
  @override Future<Result<String>> shareLink(String id) async => const Result.err(UnknownFailure());
}
