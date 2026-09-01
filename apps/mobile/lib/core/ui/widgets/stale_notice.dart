import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../l10n/app_localizations.dart';
import '../../result/result.dart';
import '../../theme/tokens.dart';

/// «هذه ليست بياناتك — هذا انقطاع».
///
/// كانت سبعة وثلاثون موضعاً تكتب `value?.valueOrNull ?? const []`: فإذا سقط الخادم أو انقطعت
/// الشبكة رُسمت الشاشة **فارغة**، فيقرأ صاحبها «ما عندك سيارات» و«ما عندك طلبات» — والتطبيق
/// يكذب عليه في أسوأ لحظة. الشريط يقول الحقيقة بسطرٍ واحد ويعطيه الفعل الوحيد المجدي.
///
/// لا يظهر إلا حين يفشل مصدرٌ فعلاً؛ وأثناء التحميل الأول يصمت (الفراغ حينها مؤقت لا كذب).
class StaleNotice extends StatelessWidget {
  final List<AsyncValue<Object?>> sources;
  final VoidCallback onRetry;
  const StaleNotice({super.key, required this.sources, required this.onRetry});

  /// الفشل عندنا وجهان: استثناءٌ يرفع AsyncValue إلى error، و**`Result.err` داخل قيمةٍ ناجحة**
  /// (وهو الوجه الغالب في مستودعاتنا). الفحص على الوجه الواحد كان سيُبقي الشريط صامتاً أبداً —
  /// أمسكه اختبارٌ يسلك طريق الشاشة قبل أن يُشحن.
  static bool _failed(AsyncValue<Object?> s) {
    if (s.hasError) return true;
    final v = s.value;
    return v is Result && !v.isOk;
  }

  @override
  Widget build(BuildContext context) {
    if (!sources.any(_failed)) return const SizedBox.shrink();
    final l = L10n.of(context); final s = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: SinaatySpace.md),
      child: Material(
        color: SinaatyColors.warnSoft,
        borderRadius: BorderRadius.circular(SinaatySpace.radius),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(SinaatySpace.md, SinaatySpace.sm, SinaatySpace.sm, SinaatySpace.sm),
          child: Row(children: [
            const Icon(Icons.wifi_off_rounded, size: 18, color: SinaatyColors.warn),
            const SizedBox(width: SinaatySpace.sm),
            Expanded(child: Text(l.staleData, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: s.onSurface))),
            TextButton(onPressed: onRetry, style: TextButton.styleFrom(minimumSize: const Size(0, 36), padding: const EdgeInsets.symmetric(horizontal: 12)),
                child: Text(l.retry)),
          ]),
        ),
      ),
    );
  }
}
