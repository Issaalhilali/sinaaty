import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../../../core/voice/voice_sheet.dart';
import '../../parts/presentation/part_request_sheet.dart';
import '../../service_market/presentation/fix_car_sheet.dart';
import '../../vehicles/presentation/providers.dart';
import '../domain/assist.dart';
import 'providers.dart';

/// **«قل وش فيها»** — الباب الواحد الذي يفتح كل شيء.
///
/// قرار المالك: أكثر من يستخدم صناعية ليس متمكناً من التقنية، فلا نطلب منه أن يعرف الفرق بين
/// «طلب إصلاح» و«طلب قطعة» و«سطحة». يكتب جملته أو يقولها، ونحن نفهم ونرسل.
///
/// والحركة هنا تخدم المعنى لا تزيّنه: نبضةٌ واحدة أثناء الفهم (شيءٌ يجري الآن)، ثم وصول
/// البطاقة من أسفل (جوابٌ **حلّ** لا شاشةٌ بُدِّلت). لا حركة في غير هاتين اللحظتين.
class AskScreen extends ConsumerStatefulWidget {
  const AskScreen({super.key});
  @override ConsumerState<AskScreen> createState() => _AskScreenState();
}

class _AskScreenState extends ConsumerState<AskScreen> {
  final _text = TextEditingController();
  bool _busy = false;
  Triage? _result;
  String? _error;

  @override void dispose() { _text.dispose(); super.dispose(); }

  Future<void> _analyze() async {
    final said = _text.text.trim();
    if (said.length < 2) return;
    setState(() { _busy = true; _error = null; _result = null; });
    final r = await ref.read(assistRepositoryProvider).analyze(said);
    if (!mounted) return;
    r.when(
      ok: (t) => setState(() { _result = t; _busy = false; }),
      err: (f) => setState(() { _error = f.message(Localizations.localeOf(context).languageCode); _busy = false; }));
  }

  Future<void> _dictate() async {
    final said = await showVoiceSheet(context, ref, title: L10n.of(context).askTitle);
    if (said == null || said.trim().isEmpty || !mounted) return;
    _text.text = said.trim();
    await _analyze();
  }

  /// الإرسال يمرّ بالمسار القائم نفسه — المساعد يختصر الطريق ولا يبني طريقاً موازياً.
  Future<void> _send(Triage t) async {
    final cars = ref.read(vehiclesProvider).value?.valueOrNull ?? const [];
    switch (t.kind) {
      case 'tow': await context.push('/tow/new'); break;
      case 'part': if (mounted) await openPartRequestSheet(context, ref, cars, preset: t.partNameAr); break;
      default: if (mounted) await openFixCarSheet(context, ref, cars, preset: t.titleAr);
    }
  }

  @override Widget build(BuildContext context) {
    final l = L10n.of(context); final t = Theme.of(context); final cs = t.colorScheme;
    return AppScaffold(
      title: l.askTitle,
      body: ListView(padding: EdgeInsets.fromLTRB(SinaatySpace.lg, SinaatySpace.md, SinaatySpace.lg, SinaatySpace.bottomClearance(context)), children: [
        Text(l.askBody, style: t.textTheme.bodyMedium?.copyWith(color: cs.onSurfaceVariant, height: 1.7)),
        const SizedBox(height: SinaatySpace.lg),

        SectionCard(child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          TextField(
            controller: _text, minLines: 3, maxLines: 6, autofocus: true,
            textInputAction: TextInputAction.newline,
            decoration: InputDecoration(hintText: l.askHint, border: InputBorder.none,
                enabledBorder: InputBorder.none, focusedBorder: InputBorder.none, filled: false,
                contentPadding: EdgeInsets.zero),
            onChanged: (_) { if (_result != null) setState(() => _result = null); },
          ),
          const Divider(height: 20),
          Row(children: [
            IconButton.filledTonal(onPressed: _busy ? null : _dictate, icon: const Icon(Icons.mic_none), tooltip: l.assistantTooltip),
            const Spacer(),
            // النبضة: علامةٌ على أن شيئاً يجري — لا دوّارة عامة بلا معنى
            if (_busy) const _Pulse(),
          ]),
        ])),

        if (_error != null) ...[const SizedBox(height: SinaatySpace.md), InlineError(message: _error!, retryLabel: l.retry, onRetry: _analyze)],

        // الجواب يصل من أسفل: حركةٌ واحدة تقول «وصل الردّ» بدل تبديل شاشة
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 320),
          switchInCurve: Curves.easeOutCubic,
          transitionBuilder: (child, anim) => FadeTransition(opacity: anim,
              child: SlideTransition(position: Tween(begin: const Offset(0, .08), end: Offset.zero).animate(anim), child: child)),
          child: _result == null
              ? const SizedBox(key: ValueKey('none'), height: 0)
              : Padding(key: ValueKey(_result!.sayAr), padding: const EdgeInsets.only(top: SinaatySpace.lg),
                  child: _Answer(t: _result!, onSend: () => _send(_result!), onEdit: () => setState(() => _result = null))),
        ),
      ]),
      primaryAction: _result == null
          ? PrimaryButton(label: l.askAnalyze, icon: Icons.auto_awesome, loading: _busy, onPressed: _busy ? null : _analyze)
          : null,
    );
  }
}

/// نبضةٌ هادئة أثناء القراءة — ثلاث نقاطٍ بإيقاعٍ واحد، بلا دوران ولا وميض.
class _Pulse extends StatefulWidget {
  const _Pulse();
  @override State<_Pulse> createState() => _PulseState();
}

class _PulseState extends State<_Pulse> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1100))..repeat();
  @override void dispose() { _c.dispose(); super.dispose(); }
  @override Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    // من يطفئ الحركة في نظامه لا نُرغمه عليها
    if (MediaQuery.disableAnimationsOf(context)) {
      return Text(L10n.of(context).askThinking, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant));
    }
    return Row(mainAxisSize: MainAxisSize.min, children: [
      Text(L10n.of(context).askThinking, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
      const SizedBox(width: 8),
      for (var i = 0; i < 3; i++)
        AnimatedBuilder(animation: _c, builder: (_, _) {
          final phase = (_c.value * 3 - i).clamp(0.0, 1.0);
          final v = (phase < .5 ? phase * 2 : (1 - phase) * 2).clamp(0.0, 1.0);
          return Padding(padding: const EdgeInsets.symmetric(horizontal: 2),
            child: Container(width: 6, height: 6, decoration: BoxDecoration(shape: BoxShape.circle,
                color: cs.primary.withValues(alpha: .35 + .55 * v))));
        }),
    ]);
  }
}

/// ما فهمناه، بجملةٍ واحدة وفعلٍ واحد — ومخرجٌ لمن لم نفهمه.
class _Answer extends StatelessWidget {
  final Triage t; final VoidCallback onSend; final VoidCallback onEdit;
  const _Answer({required this.t, required this.onSend, required this.onEdit});

  @override Widget build(BuildContext context) {
    final l = L10n.of(context); final th = Theme.of(context);
    final (glyph, action) = switch (t.kind) {
      'tow' => (BrandGlyph.towTruck, l.askSendTow),
      'part' => (BrandGlyph.gear, l.askSendPart),
      _ => (BrandGlyph.carRepair, l.askSendRepair),
    };
    return SealCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Container(width: 44, height: 44, alignment: Alignment.center,
            decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withValues(alpha: .14)),
            child: BrandIcon(glyph, size: 24, color: Colors.white, accent: SinaatyColors.brass)),
        const SizedBox(width: SinaatySpace.md),
        if (t.urgent) SealPill(l.askUrgent, icon: Icons.bolt),
      ]),
      const SizedBox(height: SinaatySpace.md),
      Text(t.sayAr, style: th.textTheme.titleLarge?.copyWith(color: Colors.white, height: 1.5)),
      if (t.partNameAr != null) ...[
        const SizedBox(height: 6),
        Text(t.partNameAr!, style: th.textTheme.bodyMedium?.copyWith(color: Colors.white.withValues(alpha: .75))),
      ],
      const SizedBox(height: SinaatySpace.lg),
      SealButton(label: action, onPressed: onSend),
      const SizedBox(height: 4),
      Center(child: TextButton(onPressed: onEdit,
          style: TextButton.styleFrom(foregroundColor: Colors.white.withValues(alpha: .75)),
          child: Text(l.askEdit))),
    ]));
  }
}
