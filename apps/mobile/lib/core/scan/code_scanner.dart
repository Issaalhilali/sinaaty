import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../l10n/app_localizations.dart';

/// ماسح رموز عام في النواة — تستعمله أي ميزة بلا أن تستورد ميزة أخرى (قاعدة العزل بين الميزات).
///
/// يعيد الحمولة الخام كما قرأها، ومن يستدعيه يفسّرها: رقم هيكل، رمز قطعة، أو غيرهما. محقون كي
/// تعمل الاختبارات والمحاكيات بماسح صوري.
/// (ماسح رموز القطع في `features/parts` سبقه؛ يُوحَّد معه حين تُمسّ تلك الشاشة.)
abstract interface class CodeScanner {
  Future<String?> scan();
}

class CameraCodeScanner implements CodeScanner {
  final BuildContext Function() context;
  CameraCodeScanner(this.context);
  @override Future<String?> scan() => Navigator.of(context()).push<String>(
        MaterialPageRoute(fullscreenDialog: true, builder: (_) => const _ScanPage()),
      );
}

/// يُتجاوز في الاختبارات؛ ويُهيَّأ في الشاشة التي تملك سياق الملاحة.
final codeScannerProvider = Provider<CodeScanner?>((ref) => null);

class _ScanPage extends StatefulWidget {
  const _ScanPage();
  @override State<_ScanPage> createState() => _ScanPageState();
}

class _ScanPageState extends State<_ScanPage> {
  bool _done = false;
  @override Widget build(BuildContext context) => Scaffold(
        backgroundColor: Colors.black,
        appBar: AppBar(backgroundColor: Colors.black, foregroundColor: Colors.white),
        body: Stack(children: [
          MobileScanner(
            // بلا هذا، فشلُ الكاميرا (إذن مرفوض، عدسة مشغولة) شاشةٌ سوداء صامتة — يقف صاحبها
            // أمامها يظن التطبيق معطوباً. تقول ما حدث وتعطيه طريقاً للخروج والكتابة يدوياً.
            errorBuilder: (context, error) => Center(child: Padding(
              padding: const EdgeInsets.all(28),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                const Icon(Icons.no_photography_outlined, color: Colors.white70, size: 40),
                const SizedBox(height: 12),
                Text(L10n.of(context).scanCameraFailed, textAlign: TextAlign.center, style: const TextStyle(color: Colors.white, fontSize: 15)),
                const SizedBox(height: 16),
                FilledButton(onPressed: () => Navigator.of(context).pop(), child: Text(L10n.of(context).scanTypeInstead)),
              ]),
            )),
            onDetect: (c) {
            if (_done) return;
            final v = c.barcodes.firstOrNull?.rawValue;
            if (v == null) return;
            _done = true;
            Navigator.of(context).pop(v);
          }),
          // إطار عريض لا مربع: ملصق رقم الهيكل شريط طويل على عمود الباب، لا رمز مربع.
          Center(child: Container(width: 300, height: 120, decoration: BoxDecoration(border: Border.all(color: const Color(0xFF3FBF95), width: 2), borderRadius: BorderRadius.circular(12), boxShadow: const [BoxShadow(color: Color(0x663FBF95), blurRadius: 30)]))),
        ]),
      );
}
