import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../di/core_providers.dart';
import '../l10n/app_localizations.dart';
import '../theme/tokens.dart';
import '../ui/ui.dart';
import 'voice_input.dart';

/// The one dictation surface used everywhere: a pulsing seal mic, the words appearing as they are
/// spoken, and two honest buttons — أعد or تم. Returns the final transcript, or null.
Future<String?> showVoiceSheet(BuildContext context, WidgetRef ref, {String? title}) async {
  // الإذن يُطلب هنا — عند أول ضغطة على الميكروفون — لا عند فتح التطبيق. كان `voiceModeProvider`
  // يُراقَب في بناء الهيكل، و`initialize()` تطلب إذن التسجيل، فيقابل المستخدمَ سؤالُ «اسمح
  // بتسجيل الصوت؟» فوق أول شاشة يراها قبل أن يلمس شيئاً (مشية أندرويد ٢٥ أغسطس ٢٠٢٦).
  final mode = await ref.read(voiceModeProvider.future);
  if (!context.mounted) return null;
  if (mode == VoiceMode.none) {
    ref.read(voiceDeadProvider.notifier).mark();   // يختفي الزر من كل مكان بعدها
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(L10n.of(context).voUnavailable)));
    return null;
  }
  final voice = ref.read(voiceInputProvider);
  final dev = ref.read(appConfigProvider).appEnv == 'dev';
  return showModalBottomSheet<String>(context: context, showDragHandle: true, isScrollControlled: true, isDismissible: false,
    builder: (ctx) => mode == VoiceMode.typedDev ? _TypedDevSheetBody(title: title) : _VoiceSheetBody(voice: voice, title: title, devFallback: dev));
}

/// The dev-only stand-in when the simulator cannot dictate: same contract, typed instead of spoken,
/// and it says so — clearly labeled so nobody mistakes a demo for the real engine.
class _TypedDevSheetBody extends StatelessWidget {
  final String? title; final String? badge;
  const _TypedDevSheetBody({this.title, this.badge});
  @override Widget build(BuildContext context) {
    final l = L10n.of(context); final c = TextEditingController();
    return SheetBody(child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text(title ?? l.voSpeak, style: Theme.of(context).textTheme.titleLarge, textAlign: TextAlign.center),
        const SizedBox(height: SinaatySpace.sm),
        Center(child: StatusBadge(badge ?? l.voDevTyped, tone: BadgeTone.warn, icon: Icons.keyboard_alt_outlined)),
        const SizedBox(height: SinaatySpace.md),
        TextField(controller: c, autofocus: true, minLines: 1, maxLines: 3, decoration: InputDecoration(hintText: l.voDevTypedHint)),
        const SizedBox(height: SinaatySpace.lg),
        PrimaryButton(label: l.voDone, icon: Icons.check, onPressed: () => Navigator.pop(context, c.text.trim().isEmpty ? null : c.text.trim())),
      ]),
    );
  }
}

class _VoiceSheetBody extends StatefulWidget {
  final VoiceInput voice; final String? title; final bool devFallback;
  const _VoiceSheetBody({required this.voice, this.title, this.devFallback = false});
  @override State<_VoiceSheetBody> createState() => _VoiceSheetBodyState();
}

class _VoiceSheetBodyState extends State<_VoiceSheetBody> with SingleTickerProviderStateMixin {
  late final AnimationController _pulse = AnimationController(vsync: this, duration: const Duration(milliseconds: 900));
  String _text = ''; bool _listening = false; bool _typed = false;

  @override void initState() { super.initState(); _listen(); }
  @override void dispose() { _pulse.dispose(); widget.voice.stop(); super.dispose(); }

  Future<void> _listen() async {
    final startedAt = DateTime.now();
    setState(() { _listening = true; });
    _pulse.repeat(reverse: true);                     // the pulse runs only while listening — animations must settle
    await for (final t in widget.voice.start()) {
      if (!mounted) return;
      setState(() => _text = t);
    }
    if (!mounted) return;
    _pulse.stop();
    // The third simulator failure: the engine claims availability, then the session dies instantly.
    // In dev an empty sub-1.5s session flips this very sheet into the typed stand-in — never a dead end.
    final died = _text.trim().isEmpty && DateTime.now().difference(startedAt) < const Duration(milliseconds: 1500);
    setState(() { _listening = false; if (widget.devFallback && died) _typed = true; });
  }

  Future<void> _again() async { await widget.voice.stop(); if (mounted) { setState(() => _text = ''); unawaited(_listen()); } }
  Future<void> _done() async { await widget.voice.stop(); if (mounted) Navigator.pop(context, _text.trim().isEmpty ? null : _text.trim()); }

  @override Widget build(BuildContext context) {
    final l = L10n.of(context); final t = Theme.of(context).textTheme; final scheme = Theme.of(context).colorScheme;
    if (_typed) return _TypedDevSheetBody(title: widget.title, badge: l.voDevBroken);
    return SheetBody(child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text(widget.title ?? l.voSpeak, style: t.titleLarge, textAlign: TextAlign.center),
        const SizedBox(height: SinaatySpace.lg),
        Center(child: AnimatedBuilder(animation: _pulse, builder: (_, _) => Container(
          width: 96 + (_listening ? _pulse.value * 14 : 0), height: 96 + (_listening ? _pulse.value * 14 : 0),
          decoration: BoxDecoration(shape: BoxShape.circle, color: SinaatyColors.seal,
            boxShadow: [BoxShadow(color: SinaatyColors.seal.withValues(alpha: _listening ? .25 + _pulse.value * .2 : .2), blurRadius: 34, spreadRadius: _listening ? 6 + _pulse.value * 8 : 2)]),
          child: Icon(_listening ? Icons.mic : Icons.mic_none, color: Colors.white, size: 40),
        ))),
        const SizedBox(height: SinaatySpace.lg),
        ConstrainedBox(constraints: const BoxConstraints(minHeight: 64),
          child: Text(_text.isEmpty ? (_listening ? l.voListening : l.voHeardNothing) : _text,
            textAlign: TextAlign.center,
            style: _text.isEmpty ? t.bodyMedium?.copyWith(color: scheme.onSurfaceVariant) : t.titleMedium?.copyWith(height: 1.6))),
        const SizedBox(height: SinaatySpace.lg),
        Row(children: [
          Expanded(child: OutlinedButton.icon(onPressed: _again, icon: const Icon(Icons.refresh, size: 18), label: Text(l.voAgain))),
          const SizedBox(width: SinaatySpace.sm),
          Expanded(flex: 2, child: PrimaryButton(label: l.voDone, icon: Icons.check, onPressed: _done)),
        ]),
        // Simulators may keep a live-but-deaf session (input device missing): in dev, a heard-nothing
        // session offers the typed stand-in too — the demo path is never a dead end.
        if (widget.devFallback && !_listening && _text.trim().isEmpty) ...[
          const SizedBox(height: SinaatySpace.sm),
          TextButton.icon(onPressed: () => setState(() => _typed = true), icon: const Icon(Icons.keyboard_alt_outlined, size: 18), label: Text(l.voTypeInstead)),
        ],
      ]),
    );
  }
}

/// A mic that sticks to any TextField in one line — and does not exist at all on a device
/// that cannot dictate (voice-input scope §2: no flag, availability is the gate).
class VoiceMicButton extends ConsumerWidget {
  final TextEditingController controller; final String? title;
  const VoiceMicButton({super.key, required this.controller, this.title});
  @override Widget build(BuildContext context, WidgetRef ref) {
    // بلا `voiceAvailableProvider` هنا: مراقبته تُشغّل الفحص فيُطلب الإذن مبكراً. الزر موجود حتى
    // تُثبت محاولةٌ أن الجهاز لا يُملي.
    if (ref.watch(voiceDeadProvider)) return const SizedBox.shrink();
    final l = L10n.of(context);
    return IconButton(tooltip: l.voSpeak, icon: const Icon(Icons.mic_none), onPressed: () async {
      final text = await showVoiceSheet(context, ref, title: title);
      if (text == null) return;
      controller.text = controller.text.trim().isEmpty ? text : '${controller.text.trim()} $text';
    });
  }
}
