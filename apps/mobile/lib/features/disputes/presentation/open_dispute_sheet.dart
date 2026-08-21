import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/l10n/labels.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../domain/dispute.dart';
import 'providers.dart';

/// One sheet opens a dispute from a work order or a part order: what kind of problem, what happened,
/// optional photos. Opening freezes the held amount — the sheet says so before the button.
Future<void> openDisputeSheet(BuildContext context, WidgetRef ref, {String? workOrderId, String? partOrderId, Future<Uint8List?> Function()? pickImage}) async {
  final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode;
  final desc = TextEditingController(); var category = 'quality'; final photos = <Uint8List>[];

  Future<Uint8List?> capture() async {
    if (pickImage != null) return pickImage();
    final x = await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 80, maxWidth: 1600);
    return x?.readAsBytes();
  }

  final ok = await showModalBottomSheet<bool>(context: context, showDragHandle: true, isScrollControlled: true, builder: (ctx) => StatefulBuilder(builder: (ctx, setS) => Padding(
    padding: EdgeInsets.fromLTRB(SinaatySpace.lg, 0, SinaatySpace.lg, MediaQuery.viewInsetsOf(ctx).bottom + SinaatySpace.xl),
    child: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Text(l.dsOpen, style: Theme.of(ctx).textTheme.titleLarge),
      const SizedBox(height: 4),
      Text(l.dsMoneyHeld, style: Theme.of(ctx).textTheme.bodySmall?.copyWith(color: Theme.of(ctx).colorScheme.onSurfaceVariant)),
      const SizedBox(height: SinaatySpace.md),
      Text(l.dsCategory, style: Theme.of(ctx).textTheme.titleSmall),
      const SizedBox(height: 6),
      Wrap(spacing: 8, runSpacing: 6, children: [for (final c in disputeCategories) ChoiceChip(label: Text(Labels.disputeCategory(l, c)), selected: category == c, showCheckmark: false, onSelected: (_) => setS(() => category = c))]),
      const SizedBox(height: SinaatySpace.md),
      TextField(controller: desc, minLines: 2, maxLines: 4, decoration: InputDecoration(labelText: l.dsDescribe, hintText: l.dsDescribeHint)),
      const SizedBox(height: SinaatySpace.sm),
      Row(children: [
        TextButton.icon(onPressed: () async { final b = await capture(); if (b != null) setS(() => photos.add(b)); }, icon: const Icon(Icons.add_a_photo_outlined, size: 18), label: Text(l.dsAttach)),
        const Spacer(),
        for (final p in photos.take(4)) Padding(padding: const EdgeInsetsDirectional.only(start: 6), child: ClipRRect(borderRadius: BorderRadius.circular(8), child: Image.memory(p, width: 36, height: 36, fit: BoxFit.cover))),
      ]),
      const SizedBox(height: SinaatySpace.lg),
      PrimaryButton(label: l.dsOpenCta, icon: Icons.balance_outlined, onPressed: () { if (desc.text.trim().length < 10) return; Navigator.pop(ctx, true); }),
    ])),
  )));
  if (ok != true || !context.mounted) return;

  final repo = ref.read(disputesRepositoryProvider);
  final mediaIds = <String>[];
  for (final p in photos) { final r = await repo.uploadEvidence(p, mimeType: 'image/jpeg'); final id = r.valueOrNull; if (id != null) mediaIds.add(id); }
  final r = await repo.open(workOrderId: workOrderId, partOrderId: partOrderId, category: category, descriptionAr: desc.text.trim(), mediaIds: mediaIds);
  if (!context.mounted) return;
  r.when(
    ok: (d) { ref.invalidate(myDisputesProvider); ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l.dsOpened))); context.push('/disputes/${d.id}'); },
    err: (f) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(f.message(locale)))),
  );
}
