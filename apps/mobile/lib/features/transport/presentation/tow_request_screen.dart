import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/format/format.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../../vehicles/domain/vehicle.dart';
import '../../vehicles/presentation/providers.dart';
import '../domain/transport.dart';
import 'providers.dart';

/// «اطلب سطحة» — one screen, one button. Two questions only: أين سيارتك؟ وإلى أين؟
/// The price is shown before the request is sent, never after.
class TowRequestScreen extends ConsumerStatefulWidget {
  final String? vehicleId;
  final String? workOrderId;
  const TowRequestScreen({super.key, this.vehicleId, this.workOrderId});
  @override ConsumerState<TowRequestScreen> createState() => _TowRequestScreenState();
}

class _TowRequestScreenState extends ConsumerState<TowRequestScreen> {
  final _pickupLink = TextEditingController();
  final _dropoffLink = TextEditingController();
  final _pickupAddress = TextEditingController();
  final _dropoffAddress = TextEditingController();
  final _notes = TextEditingController();
  String _type = 'flatbed_tow';
  String? _vehicleId;
  GeoPoint? _pickup;
  GeoPoint? _dropoff;
  TowQuote? _quote;
  bool _quoting = false;
  bool _busy = false;

  @override void initState() { super.initState(); _vehicleId = widget.vehicleId; }
  @override void dispose() { _pickupLink.dispose(); _dropoffLink.dispose(); _pickupAddress.dispose(); _dropoffAddress.dispose(); _notes.dispose(); super.dispose(); }

  void _parse({required bool isPickup}) {
    final p = parseLocationLink((isPickup ? _pickupLink : _dropoffLink).text);
    setState(() { if (isPickup) { _pickup = p; } else { _dropoff = p; } _quote = null; });
    if (_pickup != null && _dropoff != null) unawaitedQuote();
  }

  void unawaitedQuote() {
    setState(() => _quoting = true);
    ref.read(transportRepositoryProvider).quote(type: _type, pickup: _pickup!, dropoff: _dropoff!).then((r) {
      if (!mounted) return;
      setState(() { _quoting = false; _quote = r.valueOrNull; });
    });
  }

  Future<void> _submit() async {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode;
    setState(() => _busy = true);
    final res = await ref.read(transportRepositoryProvider).createJob(
      type: _type, pickup: _pickup!, dropoff: _dropoff!, vehicleId: _vehicleId, workOrderId: widget.workOrderId,
      pickupAddress: _pickupAddress.text.trim().isEmpty ? null : _pickupAddress.text.trim(),
      dropoffAddress: _dropoffAddress.text.trim().isEmpty ? null : _dropoffAddress.text.trim(),
      notesAr: _notes.text.trim().isEmpty ? null : _notes.text.trim(),
    );
    if (!mounted) return;
    setState(() => _busy = false);
    res.when(
      ok: (job) { ref.invalidate(myTowJobsProvider); ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l.towRequested))); context.pushReplacement('/tow/${job.id}'); },
      err: (f) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(f.message(locale)))),
    );
  }

  @override Widget build(BuildContext context) {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode; final t = Theme.of(context).textTheme; final s = Theme.of(context).colorScheme;
    final vehicles = ref.watch(vehiclesProvider).value?.valueOrNull ?? const <Vehicle>[];
    // One car means no choice to make — preselect it rather than asking (charter §5.0 #4).
    if (_vehicleId == null && vehicles.length == 1) _vehicleId = vehicles.first.id;
    final ready = _pickup != null && _dropoff != null;

    Widget place({required bool isPickup}) {
      final link = isPickup ? _pickupLink : _dropoffLink;
      final address = isPickup ? _pickupAddress : _dropoffAddress;
      final point = isPickup ? _pickup : _dropoff;
      final typed = link.text.trim().isNotEmpty;
      return SectionCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        TextField(controller: address, decoration: InputDecoration(labelText: isPickup ? l.towPickupAddress : l.towDropoffAddress, hintText: isPickup ? l.towPickupHint : l.towDropoffHint)),
        const SizedBox(height: SinaatySpace.md),
        TextField(controller: link, textDirection: TextDirection.ltr, onChanged: (_) => _parse(isPickup: isPickup), decoration: InputDecoration(labelText: l.towLocationLink, hintText: '24.7136, 46.6753', prefixIcon: const Icon(Icons.place_outlined))),
        const SizedBox(height: 6),
        if (point != null) Row(children: [const Icon(Icons.check_circle, size: 16, color: SinaatyColors.seal), const SizedBox(width: 6), Text(point.toString(), style: t.bodySmall?.copyWith(color: SinaatyColors.seal), textDirection: TextDirection.ltr)])
        else Text(typed ? l.towLinkUnreadable : l.towLinkHelp, style: t.bodySmall?.copyWith(color: typed ? s.error : s.onSurfaceVariant)),
      ]));
    }

    return AppScaffold(
      title: l.towTitle,
      primaryAction: PrimaryButton(label: l.towRequestAction, icon: Icons.local_shipping_outlined, loading: _busy, onPressed: ready && !_busy ? _submit : null),
      body: ListView(padding: const EdgeInsets.fromLTRB(SinaatySpace.lg, SinaatySpace.md, SinaatySpace.lg, 96), children: [
        SealCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [Expanded(child: Text(l.towTitle, style: t.titleLarge?.copyWith(color: Colors.white))), SealPill(l.towNoHiddenFees, icon: Icons.verified_outlined)]),
          const SizedBox(height: SinaatySpace.md),
          if (_quoting) Text(l.towCalculating, style: t.bodyMedium?.copyWith(color: Colors.white.withValues(alpha: .85)))
          else if (_quote != null) ...[
            MoneyText(Fmt.money(_quote!.displayTotal, locale: locale), hero: true, style: t.headlineMedium?.copyWith(color: Colors.white)),
            if (_quote!.total != null) Text(l.towVatIncluded, style: t.bodySmall?.copyWith(color: Colors.white.withValues(alpha: .8))),
            const SizedBox(height: 4),
            Text(l.towQuoteLine(_quote!.distanceKm, _quote!.etaMinutes), style: t.bodySmall?.copyWith(color: Colors.white.withValues(alpha: .85))),
          ] else Text(l.towQuoteHint, style: t.bodyMedium?.copyWith(color: Colors.white.withValues(alpha: .85))),
        ])),
        const SizedBox(height: SinaatySpace.xl),
        SectionTitle(l.towVehicle),
        SectionCard(child: DropdownButtonFormField<String>(
          initialValue: _vehicleId, isExpanded: true,
          decoration: InputDecoration(labelText: l.towVehicle, border: InputBorder.none),
          items: [DropdownMenuItem(value: null, child: Text(l.towNoVehicle)), for (final v in vehicles) DropdownMenuItem(value: v.id, child: Text(v.title, overflow: TextOverflow.ellipsis))],
          onChanged: (v) => setState(() => _vehicleId = v),
        )),
        const SizedBox(height: SinaatySpace.lg),
        SectionTitle(l.towFrom), place(isPickup: true),
        const SizedBox(height: SinaatySpace.lg),
        SectionTitle(l.towTo), place(isPickup: false),
        const SizedBox(height: SinaatySpace.lg),
        SectionTitle(l.towTruckType),
        SectionCard(child: Column(children: [
          Wrap(spacing: 8, children: [for (final ty in ['flatbed_tow', 'wheel_lift_tow', 'heavy_tow']) ChoiceChip(label: Text(_typeLabel(l, ty)), selected: _type == ty, showCheckmark: false, onSelected: (_) { setState(() { _type = ty; _quote = null; }); if (_pickup != null && _dropoff != null) unawaitedQuote(); })]),
          const SizedBox(height: SinaatySpace.md),
          TextField(controller: _notes, decoration: InputDecoration(labelText: l.towNotes, hintText: l.towNotesHint)),
        ])),
      ]),
    );
  }
}

String _typeLabel(L10n l, String type) => switch (type) {
  'flatbed_tow' => l.towTypeFlatbed,
  'wheel_lift_tow' => l.towTypeWheelLift,
  'heavy_tow' => l.towTypeHeavy,
  _ => type,
};
