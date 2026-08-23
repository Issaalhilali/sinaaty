import '../../../core/scan/vin_scan_button.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import 'providers.dart';
class AddVehicleScreen extends ConsumerStatefulWidget { const AddVehicleScreen({super.key}); @override ConsumerState<AddVehicleScreen> createState() => _AddVehicleScreenState(); }
class _AddVehicleScreenState extends ConsumerState<AddVehicleScreen> {
  final _vin = TextEditingController(); final _plate = TextEditingController(); bool _busy = false; String? _error;
  Future<void> _submit() async {
    final l = L10n.of(context); final vin = _vin.text.trim().toUpperCase(); final plate = _plate.text.trim();
    if (vin.isEmpty && plate.isEmpty) { setState(() => _error = l.addCarNeedOne); return; }
    setState(() { _busy = true; _error = null; });
    final r = await ref.read(vehiclesRepositoryProvider).add(vin: vin.isEmpty ? null : vin, plate: plate.isEmpty ? null : plate);
    if (!mounted) return; setState(() => _busy = false);
    r.when(ok: (_) { ref.invalidate(vehiclesProvider); context.pop(); }, err: (f) => setState(() => _error = f.message(Localizations.localeOf(context).languageCode)));
  }
  @override Widget build(BuildContext context) {
    final l = L10n.of(context); final t = Theme.of(context).textTheme;
    return AppScaffold(title: l.addCarTitle,
      body: ListView(padding: const EdgeInsets.all(SinaatySpace.lg), children: [
        Text(l.addCarSubtitle, style: t.bodyMedium?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant)), const SizedBox(height: SinaatySpace.xl),
        TextField(controller: _vin, textDirection: TextDirection.ltr, textCapitalization: TextCapitalization.characters, maxLength: 17, inputFormatters: [FilteringTextInputFormatter.allow(RegExp('[A-Za-z0-9]'))], decoration: InputDecoration(labelText: l.vinLabel, hintText: 'JTDKN3DU0A0123456', counterText: '', suffixIcon: VinScanButton(controller: _vin))),
        const SizedBox(height: SinaatySpace.lg),
        TextField(controller: _plate, textDirection: TextDirection.rtl, decoration: InputDecoration(labelText: l.plateLabel, hintText: 'أ ب ج 1234  ·  1234 أ ب ج')),
        if (_error != null) ...[const SizedBox(height: SinaatySpace.md), Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error))],
      ]),
      primaryAction: PrimaryButton(label: l.addCarSubmit, loading: _busy, onPressed: _submit));
  }
}
