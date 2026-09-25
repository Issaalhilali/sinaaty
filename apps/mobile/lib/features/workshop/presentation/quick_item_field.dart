import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../../../core/voice/voice_sheet.dart';
import '../domain/quick_line.dart';
import '../domain/workshop.dart';

/// حقل واحد يضيف بنداً كاملاً: يكتب صاحب الورشة «تغيير زيت وفلتر بمئتين وستين» فيرى تحت الحقل ما
/// سيُنشأ — النوع والوصف والكمية والسعر — ثم يضيفه ويظل المؤشر مكانه ليكتب البند التالي.
///
/// **البند التالي فوراً**: الورشة تضيف خمسة بنود في الأمر الواحد، والفتح والإغلاق بينها هو ما يجعل
/// الإدخال عملاً شاقاً. هنا لا تُغلق لوحة المفاتيح بين بند وآخر.
/// **لا مفاجأة**: ما يُعرض هو ما يُضاف حرفياً. وحين ينقص السعر يقول ذلك بدل أن يخمّنه، ويفتح
/// «التفاصيل» لمن أراد الضمان وحالة القطعة.
class QuickItemField extends ConsumerStatefulWidget {
  final void Function(NewItem) onAdd;
  final VoidCallback onDetails;
  const QuickItemField({super.key, required this.onAdd, required this.onDetails});
  @override ConsumerState<QuickItemField> createState() => _QuickItemFieldState();
}

class _QuickItemFieldState extends ConsumerState<QuickItemField> {
  final _c = TextEditingController();
  final _focus = FocusNode();
  QuickLine? _preview;

  @override void initState() { super.initState(); _c.addListener(() => setState(() => _preview = parseQuickLine(_c.text))); }
  @override void dispose() { _c.dispose(); _focus.dispose(); super.dispose(); }

  void _add() {
    final p = _preview;
    if (p == null || !p.isComplete) return;
    widget.onAdd(NewItem(type: p.type, descriptionAr: p.descriptionAr, quantity: p.quantity, unitPrice: p.unitPrice!, partCondition: p.type == 'part' ? 'oem_new' : null));
    _c.clear();
    _focus.requestFocus();   // البند التالي بلا فتح شيء
  }

  @override Widget build(BuildContext context) {
    final l = L10n.of(context); final t = Theme.of(context).textTheme; final scheme = Theme.of(context).colorScheme;
    final p = _preview;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      TextField(
        controller: _c, focusNode: _focus, textInputAction: TextInputAction.done, onSubmitted: (_) => _add(),
        decoration: InputDecoration(
          labelText: l.wsQuickAdd, hintText: l.wsQuickAddHint,
          prefixIcon: const Icon(Icons.bolt_outlined),
          suffixIcon: Row(mainAxisSize: MainAxisSize.min, children: [
            VoiceMicButton(controller: _c, title: l.wsQuickAdd),
            IconButton(tooltip: l.wsAddItem, icon: const Icon(Icons.add_circle), color: p?.isComplete ?? false ? SinaatyColors.seal : scheme.onSurfaceVariant.withValues(alpha: .4), onPressed: p?.isComplete ?? false ? _add : null),
          ]),
        ),
      ),
      if (p != null) Padding(
        padding: const EdgeInsets.only(top: 6),
        child: p.isComplete
            ? Wrap(spacing: 6, runSpacing: 6, crossAxisAlignment: WrapCrossAlignment.center, children: [
                StatusBadge(_typeLabel(l, p.type), tone: BadgeTone.seal),
                Text(p.descriptionAr, style: t.bodyMedium),
                Text('${p.quantity} × ${p.unitPrice} ${l.sar}', style: t.bodySmall?.copyWith(color: scheme.onSurfaceVariant), textDirection: TextDirection.rtl),
              ])
            : Text(l.wsQuickAddNeedsPrice, style: t.bodySmall?.copyWith(color: SinaatyColors.brass)),
      ),
      Align(alignment: AlignmentDirectional.centerStart, child: TextButton.icon(onPressed: widget.onDetails, icon: const Icon(Icons.tune, size: 16), label: Text(l.wsItemDetails))),
    ]);
  }

  String _typeLabel(L10n l, String type) => switch (type) {
        'part' => l.wsPart,
        'paint' => l.wsPaint,
        'diagnostic' => l.wsDiagnostic,
        'towing' => l.wsTowing,
        _ => l.wsLabor,
      };
}
