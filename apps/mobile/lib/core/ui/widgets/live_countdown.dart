import 'dart:async';
import 'package:flutter/material.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/tokens.dart';

/// مؤقّتٌ **ينبض فعلاً**.
///
/// كانت المهلة تُرسم مرةً واحدة عند فتح الشاشة («يبقى ٤٥ د») وتبقى جامدةً مهما طال المكوث —
/// فيقرأ صاحب السيارة رقماً كاذباً، وتظنّ الورشة أن أمامها متّسعاً وقد انتهى. والسوق الذي
/// لا يتحرك عدّاده يبدو ساكناً، وهو حيٌّ في الحقيقة.
///
/// يعدّ بالثانية في الدقائق الأخيرة (حين تهمّ الثانية) وبالدقيقة قبلها (حين لا تهمّ) —
/// فلا نُشغل الإطار بما لا يُقرأ. وحين تنتهي المهلة يقول ذلك صراحةً بدل أن يعرض صفراً.
class LiveCountdown extends StatefulWidget {
  final DateTime until;
  /// نصٌّ يُعرض بعد انتهاء المهلة — «انتهت المهلة» افتراضاً.
  final String? endedLabel;
  final TextStyle? style;
  /// نبرةٌ حمراء في الدقائق الأخيرة: الاستعجال يُرى قبل أن يُقرأ.
  final bool urgentTint;
  const LiveCountdown({super.key, required this.until, this.endedLabel, this.style, this.urgentTint = true});

  @override State<LiveCountdown> createState() => _LiveCountdownState();
}

class _LiveCountdownState extends State<LiveCountdown> {
  Timer? _t;
  @override void initState() { super.initState(); _schedule(); }
  @override void didUpdateWidget(covariant LiveCountdown old) { super.didUpdateWidget(old); if (old.until != widget.until) _schedule(); }
  @override void dispose() { _t?.cancel(); super.dispose(); }

  void _schedule() {
    _t?.cancel();
    final left = widget.until.difference(DateTime.now());
    if (left.isNegative) return;                       // انتهت: لا مؤقّت يعمل بلا داعٍ
    final step = left.inMinutes < 5 ? const Duration(seconds: 1) : const Duration(seconds: 20);
    _t = Timer.periodic(step, (_) { if (mounted) setState(() { if (widget.until.difference(DateTime.now()).inMinutes == 4) _schedule(); }); });
  }

  @override Widget build(BuildContext context) {
    final l = L10n.of(context);
    final left = widget.until.difference(DateTime.now());
    final base = widget.style ?? Theme.of(context).textTheme.titleSmall;
    if (left.isNegative) {
      return Text(widget.endedLabel ?? l.cdEnded, style: base?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant));
    }
    final urgent = widget.urgentTint && left.inMinutes < 5;
    final text = left.inHours >= 1
        ? l.cdHours(left.inHours, left.inMinutes % 60)
        : left.inMinutes >= 5
            ? l.cdMinutes(left.inMinutes)
            : l.cdMinSec('${left.inMinutes}:${(left.inSeconds % 60).toString().padLeft(2, '0')}');
    return Text(text,
        style: base?.copyWith(color: urgent ? SinaatyColors.warn : base.color, fontFeatures: const [FontFeature.tabularFigures()]));
  }
}
