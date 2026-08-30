import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/di/core_providers.dart';
import '../../../core/l10n/labels.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../../../core/voice/voice_sheet.dart';
import '../../vehicles/domain/vehicle.dart';
import 'providers.dart';

/// «قطعة غيار» — نفس الورقة تُفتح من تبويب «اطلب» ومن خدمات الصفحة الرئيسية، فلا نسختان تتباعدان.
Future<void> openPartRequestSheet(BuildContext context, WidgetRef ref, List<Vehicle> vehicles) async {
  final l = L10n.of(context);
  final locale = Localizations.localeOf(context).languageCode;
  final name = TextEditingController();
  final conds = {'oem_new', 'aftermarket_new', 'used_scrapyard'};
  String? vehicleId = vehicles.length == 1 ? vehicles.first.id : null;
  var minutes = 60;

  final ok = await showModalBottomSheet<bool>(
    context: context, showDragHandle: true, isScrollControlled: true,
    builder: (ctx) => StatefulBuilder(builder: (ctx, setS) => SheetBody(child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text(l.reqPart, style: Theme.of(ctx).textTheme.titleLarge),
        const SizedBox(height: 4), Text(l.reqPartBody, style: TextStyle(color: Theme.of(ctx).colorScheme.onSurfaceVariant)),
        const SizedBox(height: SinaatySpace.md),
        TextField(controller: name, autofocus: true, decoration: InputDecoration(labelText: l.ptPartName, hintText: l.ptPartNameHint, suffixIcon: VoiceMicButton(controller: name, title: l.ptPartName))),
        if (vehicles.isNotEmpty) ...[
          const SizedBox(height: SinaatySpace.md),
          DropdownButtonFormField<String>(
            initialValue: vehicleId, isExpanded: true, decoration: InputDecoration(labelText: l.reqPartVehicle),
            items: [DropdownMenuItem(value: null, child: Text(l.reqPartAnyVehicle)), for (final v in vehicles) DropdownMenuItem(value: v.id, child: Text(v.title, overflow: TextOverflow.ellipsis))],
            onChanged: (v) => setS(() => vehicleId = v),
          ),
        ],
        const SizedBox(height: SinaatySpace.md),
        Text(l.ptAcceptedConditions, style: Theme.of(ctx).textTheme.titleSmall),
        const SizedBox(height: 6),
        Wrap(spacing: 8, children: [for (final c in ['oem_new', 'aftermarket_new', 'used_scrapyard', 'refurbished']) FilterChip(label: Text(Labels.condition(l, c)), selected: conds.contains(c), showCheckmark: false, onSelected: (sel) => setS(() => sel ? conds.add(c) : conds.remove(c)))]),
        const SizedBox(height: SinaatySpace.md),
        Row(children: [
          Expanded(child: Text(l.ptBiddingMinutes, style: Theme.of(ctx).textTheme.titleSmall)),
          SegmentedButton<int>(segments: const [ButtonSegment(value: 30, label: Text('30')), ButtonSegment(value: 60, label: Text('60')), ButtonSegment(value: 240, label: Text('240'))], selected: {minutes}, showSelectedIcon: false, onSelectionChanged: (sel) => setS(() => minutes = sel.first)),
        ]),
        const SizedBox(height: SinaatySpace.lg),
        PrimaryButton(label: l.reqPartSend, icon: Icons.gavel_outlined, onPressed: () { if (name.text.trim().length < 2 || conds.isEmpty) return; Navigator.pop(ctx, true); }),
      ]),
    )),
  );
  if (ok != true || !context.mounted) return;
  final vin = vehicles.where((v) => v.id == vehicleId).firstOrNull?.vin;
  // موقع الجهاز يرافق الطلب حين يكون ممنوحاً — فيصل المزاد تشاليح حيّه لا تشاليح مدينة أخرى.
  final here = await ref.read(hereProvider).ifGranted(); if (!context.mounted) return;
  final res = await ref.read(partsRepositoryProvider).createRequest(vin: vin, partNameAr: name.text.trim(), acceptedConditions: conds.toList(), biddingMinutes: minutes, lat: here?.lat, lng: here?.lng);
  if (!context.mounted) return;
  res.when(
    ok: (r) { ref.invalidate(myPartRequestsProvider); context.push('/parts/requests/${r.id}'); },
    err: (f) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(f.message(locale)))),
  );
}
