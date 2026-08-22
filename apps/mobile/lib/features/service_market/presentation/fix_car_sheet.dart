import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/voice/voice_sheet.dart';
import '../../../core/ui/ui.dart';
import '../../transport/domain/transport.dart' show parseLocationLink;
import '../../vehicles/domain/vehicle.dart';
import 'providers.dart';

/// «أصلح سيارتي» (scope §1.أ, on the part-request sheet's template): pick the car, describe the
/// problem (photos say more than words), control the search radius — the owner's third door —
/// and say when. The customer's location comes from a pasted maps link, like the tow request.
Future<void> openFixCarSheet(BuildContext context, WidgetRef ref, List<Vehicle> vehicles, {Future<Uint8List?> Function()? pickImage}) async {
  final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode;
  final desc = TextEditingController(); final where = TextEditingController();
  String? vehicleId = vehicles.length == 1 ? vehicles.first.id : null;
  var radius = 25; var when = 'today'; final photos = <Uint8List>[];

  Future<Uint8List?> capture() async {
    if (pickImage != null) return pickImage();
    final x = await ImagePicker().pickImage(source: ImageSource.camera, imageQuality: 80, maxWidth: 1600);
    return x?.readAsBytes();
  }

  final ok = await showModalBottomSheet<bool>(context: context, showDragHandle: true, isScrollControlled: true, builder: (ctx) => StatefulBuilder(builder: (ctx, setS) => Padding(
    padding: EdgeInsets.fromLTRB(SinaatySpace.lg, 0, SinaatySpace.lg, MediaQuery.viewInsetsOf(ctx).bottom + SinaatySpace.xl),
    child: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Text(l.srFix, style: Theme.of(ctx).textTheme.titleLarge),
      const SizedBox(height: 4),
      Text(l.srFixBody, style: Theme.of(ctx).textTheme.bodySmall?.copyWith(color: Theme.of(ctx).colorScheme.onSurfaceVariant)),
      if (vehicles.isNotEmpty) ...[
        const SizedBox(height: SinaatySpace.md),
        DropdownButtonFormField<String>(initialValue: vehicleId, isExpanded: true, decoration: InputDecoration(labelText: l.reqPartVehicle),
          items: [for (final v in vehicles) DropdownMenuItem(value: v.id, child: Text(v.title, overflow: TextOverflow.ellipsis))],
          onChanged: (v) => setS(() => vehicleId = v)),
      ],
      const SizedBox(height: SinaatySpace.md),
      TextField(controller: desc, minLines: 2, maxLines: 4, autofocus: vehicles.length <= 1, decoration: InputDecoration(labelText: l.srDescribe, hintText: l.srDescribeHint, suffixIcon: VoiceMicButton(controller: desc, title: l.srDescribe))),
      const SizedBox(height: SinaatySpace.sm),
      Row(children: [
        TextButton.icon(onPressed: () async { final b = await capture(); if (b != null) setS(() => photos.add(b)); }, icon: const Icon(Icons.add_a_photo_outlined, size: 18), label: Text(l.dsAttach)),
        const Spacer(),
        for (final p in photos.take(4)) Padding(padding: const EdgeInsetsDirectional.only(start: 6), child: ClipRRect(borderRadius: BorderRadius.circular(8), child: Image.memory(p, width: 36, height: 36, fit: BoxFit.cover, errorBuilder: (_, _, _) => Container(width: 36, height: 36, color: Theme.of(ctx).colorScheme.surfaceContainerHighest)))),
      ]),
      const SizedBox(height: SinaatySpace.sm),
      TextField(controller: where, textDirection: TextDirection.ltr, decoration: InputDecoration(labelText: l.srWhere, hintText: l.srWhereHint, prefixIcon: const Icon(Icons.place_outlined))),
      const SizedBox(height: SinaatySpace.md),
      Row(children: [
        Text(l.srRadius, style: Theme.of(ctx).textTheme.titleSmall), const Spacer(),
        SegmentedButton<int>(segments: [for (final r in const [10, 25, 50]) ButtonSegment(value: r, label: Text(l.srKm(r)))], selected: {radius}, showSelectedIcon: false, onSelectionChanged: (s) => setS(() => radius = s.first)),
      ]),
      const SizedBox(height: SinaatySpace.md),
      Row(children: [
        Expanded(child: Text(l.srWhen, style: Theme.of(ctx).textTheme.titleSmall)),
        SegmentedButton<String>(segments: [ButtonSegment(value: 'now', label: Text(l.srNow)), ButtonSegment(value: 'today', label: Text(l.srToday)), ButtonSegment(value: 'this_week', label: Text(l.srThisWeek))], selected: {when}, showSelectedIcon: false, onSelectionChanged: (s) => setS(() => when = s.first)),
      ]),
      const SizedBox(height: SinaatySpace.lg),
      PrimaryButton(label: l.srSend, icon: Icons.build_outlined, onPressed: () {
        if (desc.text.trim().length < 5 || parseLocationLink(where.text) == null) return;
        Navigator.pop(ctx, true);
      }),
    ])),
  )));
  if (ok != true || !context.mounted) return;

  final repo = ref.read(serviceMarketRepositoryProvider);
  final mediaIds = <String>[];
  for (final p in photos) { final r = await repo.uploadPhoto(p, mimeType: 'image/jpeg'); final id = r.valueOrNull; if (id != null) mediaIds.add(id); }
  final point = parseLocationLink(where.text)!;
  final text = desc.text.trim(); final title = text.split('\n').first;
  final r = await repo.create(
    vehicleId: vehicleId,
    titleAr: title.length > 80 ? title.substring(0, 80) : title,
    descriptionAr: text == title ? null : text,
    lat: point.lat, lng: point.lng, radiusKm: radius, preferredTime: when, mediaIds: mediaIds,
  );
  if (!context.mounted) return;
  r.when(
    ok: (req) { ref.invalidate(myServiceRequestsProvider); ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l.srSent))); context.push('/service-requests/${req.id}'); },
    err: (f) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(f.message(locale)))),
  );
}
