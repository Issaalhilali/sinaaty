import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/format/format.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/l10n/labels.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../domain/dispute.dart';
import 'providers.dart';

/// The one dispute screen for both parties: where it stands, that the money is held, and the
/// conversation. No decision buttons — the platform decides, and the screen says so in one sentence.
class DisputeScreen extends ConsumerStatefulWidget {
  final String id; final Future<Uint8List?> Function()? pickImage;
  const DisputeScreen({super.key, required this.id, this.pickImage});
  @override ConsumerState<DisputeScreen> createState() => _DisputeScreenState();
}

class _DisputeScreenState extends ConsumerState<DisputeScreen> {
  final _msg = TextEditingController(); bool _busy = false;
  @override void dispose() { _msg.dispose(); super.dispose(); }
  void _refresh() { ref.invalidate(disputeProvider(widget.id)); ref.invalidate(myDisputesProvider); }

  Future<Uint8List?> _capture() async {
    if (widget.pickImage != null) return widget.pickImage!();
    final x = await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 80, maxWidth: 1600);
    return x?.readAsBytes();
  }

  Future<void> _send({bool withPhoto = false}) async {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode;
    final repo = ref.read(disputesRepositoryProvider);
    var mediaIds = const <String>[];
    if (withPhoto) {
      final bytes = await _capture(); if (bytes == null || !mounted) return;
      setState(() => _busy = true);
      final up = await repo.uploadEvidence(bytes, mimeType: 'image/jpeg');
      if (!mounted) return;
      final id = up.valueOrNull;
      if (id == null) { setState(() => _busy = false); ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(up.failureOrNull!.message(locale)))); return; }
      mediaIds = [id];
    }
    final body = _msg.text.trim().isEmpty ? (withPhoto ? l.dsEvidence : '') : _msg.text.trim();
    if (body.isEmpty) { setState(() => _busy = false); return; }
    setState(() => _busy = true);
    final r = await repo.message(widget.id, bodyAr: body, mediaIds: mediaIds);
    if (!mounted) return;
    setState(() => _busy = false);
    r.when(ok: (_) { _msg.clear(); _refresh(); }, err: (f) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(f.message(locale)))));
  }

  @override Widget build(BuildContext context) {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode;
    final t = Theme.of(context).textTheme; final scheme = Theme.of(context).colorScheme;
    final v = ref.watch(disputeProvider(widget.id));
    final d = v.value?.valueOrNull;
    return AppScaffold(
      title: d == null ? l.dsTitle : '${l.dsTitle} ${Fmt.ltr(d.number)}',
      primaryAction: d != null && d.live ? Row(children: [
        Expanded(child: TextField(controller: _msg, decoration: InputDecoration(hintText: l.dsMessageHint), onSubmitted: (_) => _send())),
        IconButton(tooltip: l.dsAttach, onPressed: _busy ? null : () => _send(withPhoto: true), icon: const Icon(Icons.add_a_photo_outlined)),
        IconButton.filled(onPressed: _busy ? null : _send, icon: _busy ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.send)),
      ]) : null,
      body: AsyncResultView<Dispute>(value: v, onRetry: _refresh, builder: (d) => RefreshIndicator(onRefresh: () async => _refresh(), child: ListView(padding: const EdgeInsets.fromLTRB(SinaatySpace.lg, SinaatySpace.md, SinaatySpace.lg, 110), children: [
        SealCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(Labels.disputeCategory(l, d.category), style: t.titleLarge?.copyWith(color: Colors.white)),
              Text(Fmt.meta([d.number, Fmt.date(d.createdAt, locale: locale)]), style: t.bodySmall?.copyWith(color: Colors.white.withValues(alpha: .75))),
            ])),
            SealPill(Labels.disputeStatus(l, d.status)),
          ]),
          if (d.escrow != null) ...[
            const SizedBox(height: SinaatySpace.md),
            Text(l.dsMoneyHeld, style: t.bodySmall?.copyWith(color: Colors.white.withValues(alpha: .8))),
            MoneyText(Fmt.money(d.escrow!.amount, locale: locale), hero: true, style: t.headlineMedium?.copyWith(color: Colors.white)),
          ],
          const SizedBox(height: SinaatySpace.sm),
          Text(l.dsPlatformDecides, style: t.bodySmall?.copyWith(color: Colors.white.withValues(alpha: .85))),
        ])),
        if (d.resolution != null) ...[
          const SizedBox(height: SinaatySpace.lg),
          SectionCard(glow: true, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(l.dsResolved, style: t.titleSmall),
            if (d.resolutionNoteAr != null) ...[const SizedBox(height: 4), Text(d.resolutionNoteAr!, style: t.bodyMedium)],
          ])),
        ],
        const SizedBox(height: SinaatySpace.lg),
        SectionTitle(l.dsConversation),
        SectionCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          _Bubble(author: null, body: d.descriptionAr, at: d.createdAt, locale: locale, first: true),
          for (final m in d.messages) _Bubble(author: m.authorNameAr, body: m.bodyAr, at: m.createdAt, locale: locale),
        ])),
        if (d.media.isNotEmpty) ...[
          const SizedBox(height: SinaatySpace.lg),
          SectionTitle(l.dsEvidence),
          MediaStrip(mediaIds: [for (final m in d.media) m.mediaId]),
        ],
      ]))),
    );
  }
}

class _Bubble extends StatelessWidget {
  final String? author; final String body; final DateTime at; final String locale; final bool first;
  const _Bubble({required this.author, required this.body, required this.at, required this.locale, this.first = false});
  @override Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme; final s = Theme.of(context).colorScheme;
    return Padding(padding: EdgeInsets.only(top: first ? 0 : SinaatySpace.md), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(Fmt.meta([if (author != null && author!.isNotEmpty) author, Fmt.dateTime(at, locale: locale)]), style: t.bodySmall?.copyWith(color: s.onSurfaceVariant)),
      const SizedBox(height: 2),
      Text(body, style: t.bodyMedium),
    ]));
  }
}
