import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../l10n/app_localizations.dart';
import 'code_scanner.dart';
import 'vin.dart';

/// زر «امسح» يلتصق بحقل رقم الهيكل: كاميرا على ملصق عمود الباب بدل ١٧ خانة بالإصبع.
///
/// وحين يقرأ باركوداً ليس رقم هيكل يقول ذلك بدل أن يملأ الحقل بما ليس هو — رقمُ هيكلٍ خاطئ
/// يعني سيارةً أخرى في السجل، وهو أسوأ من حقل فارغ.
class VinScanButton extends ConsumerWidget {
  final TextEditingController controller;
  const VinScanButton({super.key, required this.controller});

  @override Widget build(BuildContext context, WidgetRef ref) {
    // الافتراضي كاميرا بسياق الزر نفسه؛ والاختبارات تُبدّله بماسح صوري عبر المزوّد.
    final scanner = ref.watch(codeScannerProvider) ?? CameraCodeScanner(() => context);
    final l = L10n.of(context);
    return IconButton(
      tooltip: l.vinScan,
      icon: const Icon(Icons.qr_code_scanner_outlined),
      onPressed: () async {
        final raw = await scanner.scan();
        if (raw == null || !context.mounted) return;
        final vin = extractVin(raw);
        if (vin == null) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l.vinScanNotFound)));
          return;
        }
        controller.text = vin;
      },
    );
  }
}
