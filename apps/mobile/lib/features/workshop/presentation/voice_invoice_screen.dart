import 'package:crypto/crypto.dart' as crypto;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../../../core/voice/voice_input.dart';
import '../../work_orders/presentation/providers.dart';
import '../domain/workshop.dart';
import 'providers.dart';

/// Voice → items (Step 27's missing screen): the advisor speaks, the words appear live, the raw
/// recording uploads as the legal trail, and the extraction comes back as a DRAFT — every line
/// reviewed and priced by the human before it can touch the order. Upload failure loses nothing:
/// the dictated text stays and retry is one tap (voice-input scope, acceptance §3).
class VoiceInvoiceScreen extends ConsumerStatefulWidget {
  final String workOrderId;
  const VoiceInvoiceScreen({super.key, required this.workOrderId});
  @override ConsumerState<VoiceInvoiceScreen> createState() => _VoiceInvoiceScreenState();
}

enum _Phase { dictating, sending, uploadFailed, review }

class _VoiceInvoiceScreenState extends ConsumerState<VoiceInvoiceScreen> with SingleTickerProviderStateMixin {
  late final AnimationController _pulse = AnimationController(vsync: this, duration: const Duration(milliseconds: 900));
  late final VoiceInput _voice = ref.read(voiceInputProvider);
  _Phase _phase = _Phase.dictating;
  String _text = ''; bool _listening = false;
  Uint8List? _audio;
  VoiceNote? _note;
  List<TextEditingController> _prices = const [];

  @override void initState() { super.initState(); _capture(); }
  @override void dispose() { _pulse.dispose(); _voice.stop(); for (final c in _prices) { c.dispose(); } super.dispose(); }

  Future<void> _capture() async {
    final voice = _voice; final rec = ref.read(voiceRecorderProvider);
    await rec.begin();
    setState(() { _listening = true; _phase = _Phase.dictating; });
    _pulse.repeat(reverse: true);                     // pulse only while listening — animations must settle
    await for (final t in voice.start()) { if (!mounted) return; setState(() => _text = t); }
    if (mounted) { _pulse.stop(); setState(() => _listening = false); }
  }

  Future<void> _submit() async {
    final repo = ref.read(workshopRepositoryProvider);
    await _voice.stop();
    setState(() => _phase = _Phase.sending);
    _audio ??= await ref.read(voiceRecorderProvider).finish();
    if (_audio == null) { if (mounted) setState(() => _phase = _Phase.uploadFailed); return; }
    // Upload FIRST — POST /voice-notes refuses without an audio media_id (scope §1).
    final pre = await repo.presign(mimeType: 'audio/mp4', sizeBytes: _audio!.length, sha256: crypto.sha256.convert(_audio!).toString(), purpose: 'voice_note');
    if (!mounted) return;
    final mediaId = await pre.when(ok: (p) async { final up = await repo.upload(p, _audio!, 'audio/mp4'); return up.isOk ? p.mediaId : null; }, err: (_) async => null);
    if (!mounted) return;
    if (mediaId == null) { setState(() => _phase = _Phase.uploadFailed); return; }
    final r = await repo.createVoiceNote(widget.workOrderId, mediaId: mediaId, hintAr: _text.trim().isEmpty ? null : _text.trim());
    if (!mounted) return;
    r.when(ok: (n) => setState(() { _note = n; _prices = [for (final i in n.items) TextEditingController(text: i.unitPrice ?? '')]; _phase = _Phase.review; }),
      err: (_) => setState(() => _phase = _Phase.uploadFailed));
  }

  Future<void> _apply() async {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode;
    final n = _note!; final items = <NewItem>[];
    for (final (i, p) in n.items.indexed) {
      final price = double.tryParse(_prices[i].text) ?? 0;
      if (price <= 0) continue;
      items.add(NewItem(type: p.type, descriptionAr: p.descriptionAr, quantity: p.quantity, unitPrice: price.toStringAsFixed(2)));
    }
    if (items.isEmpty) return;
    final r = await ref.read(workshopRepositoryProvider).applyVoiceNote(n.id, items);
    if (!mounted) return;
    r.when(ok: (_) {
      ref.invalidate(workOrderProvider(widget.workOrderId)); ref.invalidate(workOrderTimelineProvider(widget.workOrderId));
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l.voApplied)));
      context.pop();
    }, err: (f) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(f.message(locale)))));
  }

  @override Widget build(BuildContext context) {
    final l = L10n.of(context); final t = Theme.of(context).textTheme; final scheme = Theme.of(context).colorScheme;
    final pricedCount = _note == null ? 0 : [for (final c in _prices) double.tryParse(c.text) ?? 0].where((p) => p > 0).length;
    return AppScaffold(
      title: l.voDictateItems,
      primaryAction: switch (_phase) {
        _Phase.dictating => PrimaryButton(label: l.voDone, icon: Icons.check, onPressed: _text.trim().isEmpty ? null : _submit),
        _Phase.uploadFailed => PrimaryButton(label: l.voRetryUpload, icon: Icons.refresh, onPressed: _submit),
        _Phase.review => PrimaryButton(label: l.voApply, icon: Icons.playlist_add, onPressed: pricedCount == 0 ? null : _apply),
        _Phase.sending => null,
      },
      body: switch (_phase) {
        _Phase.sending => const InlineLoading(),
        _Phase.dictating || _Phase.uploadFailed => ListView(padding: const EdgeInsets.fromLTRB(SinaatySpace.lg, SinaatySpace.xl, SinaatySpace.lg, 110), children: [
          Center(child: AnimatedBuilder(animation: _pulse, builder: (_, _) => Container(
            width: 96 + (_listening ? _pulse.value * 14 : 0), height: 96 + (_listening ? _pulse.value * 14 : 0),
            decoration: BoxDecoration(shape: BoxShape.circle, color: SinaatyColors.seal,
              boxShadow: [BoxShadow(color: SinaatyColors.seal.withValues(alpha: _listening ? .25 + _pulse.value * .2 : .2), blurRadius: 34, spreadRadius: _listening ? 6 + _pulse.value * 8 : 2)]),
            child: Icon(_listening ? Icons.mic : Icons.mic_none, color: Colors.white, size: 40)))),
          const SizedBox(height: SinaatySpace.xl),
          if (_phase == _Phase.uploadFailed) ...[
            SectionCard(child: Row(children: [Icon(Icons.cloud_off_outlined, size: 20, color: scheme.error), const SizedBox(width: SinaatySpace.sm), Expanded(child: Text(l.voUploadFailed, style: t.bodySmall?.copyWith(height: 1.5)))])),
            const SizedBox(height: SinaatySpace.md),
          ],
          Text(_text.isEmpty ? (_listening ? l.voListening : l.voHeardNothing) : _text,
            textAlign: TextAlign.center,
            style: _text.isEmpty ? t.bodyMedium?.copyWith(color: scheme.onSurfaceVariant) : t.titleMedium?.copyWith(height: 1.7)),
          if (!_listening && _phase == _Phase.dictating) Center(child: TextButton.icon(onPressed: _capture, icon: const Icon(Icons.refresh, size: 18), label: Text(l.voAgain))),
        ]),
        _Phase.review => ListView(padding: const EdgeInsets.fromLTRB(SinaatySpace.lg, SinaatySpace.md, SinaatySpace.lg, 110), children: [
          SectionTitle(l.voReviewTitle),
          if (_note!.transcriptAr != null) Text(l.voHeard(_note!.transcriptAr!), style: t.bodySmall?.copyWith(color: scheme.onSurfaceVariant, height: 1.5)),
          const SizedBox(height: SinaatySpace.sm),
          Text(l.accAddItemsHint, style: t.bodySmall?.copyWith(color: scheme.onSurfaceVariant)),
          const SizedBox(height: SinaatySpace.md),
          for (final (i, p) in _note!.items.indexed) Padding(padding: const EdgeInsets.only(bottom: SinaatySpace.md), child: SectionCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(child: Text(p.descriptionAr, style: t.titleSmall)),
              const SizedBox(width: SinaatySpace.sm),
              SizedBox(width: 110, child: TextField(controller: _prices[i], keyboardType: const TextInputType.numberWithOptions(decimal: true), textDirection: TextDirection.ltr, inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.]'))], onChanged: (_) => setState(() {}), decoration: const InputDecoration(hintText: '0.00', isDense: true))),
            ]),
            if (p.heardAr != null && p.heardAr!.isNotEmpty) ...[const SizedBox(height: 4), Text(l.voHeard(p.heardAr!), style: t.bodySmall?.copyWith(color: scheme.onSurfaceVariant))],
            if (p.needsPrice && (double.tryParse(_prices[i].text) ?? 0) <= 0) Padding(padding: const EdgeInsets.only(top: 6), child: StatusBadge(l.voNeedsPrice, tone: BadgeTone.warn)),
          ]))),
        ]),
      },
    );
  }
}
