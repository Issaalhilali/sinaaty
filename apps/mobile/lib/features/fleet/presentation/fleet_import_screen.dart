import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../../vehicles/presentation/providers.dart';
import '../domain/fleet.dart';
import '../domain/fleet_import.dart';
import 'providers.dart';

/// استيراد قائمة مركبات: الصق سطراً لكل مركبة (لوحة أو رقم هيكل) — الخادم جاهز منذ الخطوة ٢٦ ولم يكن
/// له باب في التطبيق، فكان مدير أسطولٍ من خمسين سيارة يضيفها واحدةً واحدة.
class FleetImportScreen extends ConsumerStatefulWidget {
  final String orgId;
  const FleetImportScreen({super.key, required this.orgId});
  @override ConsumerState<FleetImportScreen> createState() => _State();
}

class _State extends ConsumerState<FleetImportScreen> {
  final _text = TextEditingController(); bool _busy = false; String? _error; List<FleetImportRow>? _results;
  @override void dispose() { _text.dispose(); super.dispose(); }
  List<({String? vin, String? plate})> get _rows => parseImportLines(_text.text);

  Future<void> _import() async {
    final rows = _rows; if (rows.isEmpty) return;
    setState(() { _busy = true; _error = null; });
    final r = await ref.read(fleetRepositoryProvider).importVehicles(widget.orgId, rows);
    if (!mounted) return;
    setState(() { _busy = false; });
    r.when(ok: (rs) { setState(() => _results = rs); ref.invalidate(vehiclesProvider); }, err: (f) => setState(() => _error = f.message(Localizations.localeOf(context).languageCode)));
  }

  @override Widget build(BuildContext context) {
    final l = L10n.of(context); final t = Theme.of(context).textTheme; final c = Theme.of(context).colorScheme; final rs = _results;
    return AppScaffold(
      title: l.flImportTitle,
      primaryAction: rs == null ? PrimaryButton(label: l.flImportAction(_rows.length), loading: _busy, onPressed: _rows.isEmpty ? null : _import) : PrimaryButton(label: l.voDone, onPressed: () => Navigator.of(context).maybePop()),
      body: ListView(padding: EdgeInsets.fromLTRB(SinaatySpace.lg, SinaatySpace.sm, SinaatySpace.lg, SinaatySpace.bottomClearance(context)), children: [
        if (rs == null) ...[
          Text(l.flImportWhy, style: t.bodyMedium?.copyWith(color: c.onSurfaceVariant)),
          const SizedBox(height: SinaatySpace.md),
          TextField(controller: _text, minLines: 6, maxLines: 14, keyboardType: TextInputType.multiline, textDirection: TextDirection.ltr, onChanged: (_) => setState(() {}), decoration: InputDecoration(labelText: l.flImportField, hintText: 'أ ب ج 1234\n4T1B11HK5KU123456', alignLabelWithHint: true)),
          if (_error != null) Padding(padding: const EdgeInsets.only(top: SinaatySpace.sm), child: InlineError(message: _error!, retryLabel: l.retry, onRetry: _import)),
        ] else ...[
          // الملخّص أولاً — ثم كل صفٍّ بمصيره، والفاشل يقول لماذا.
          SectionCard(child: Row(children: [
            Expanded(child: _Stat(label: l.flImportCreated, value: rs.where((r) => r.status == 'created').length)),
            Expanded(child: _Stat(label: l.flImportExists, value: rs.where((r) => r.status == 'exists').length)),
            Expanded(child: _Stat(label: l.flImportFailed, value: rs.where((r) => r.status == 'failed').length, bad: true)),
          ])),
          const SizedBox(height: SinaatySpace.lg),
          SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm, vertical: SinaatySpace.xs), child: Column(children: [
            for (final r in rs) AppListRow(icon: r.ok ? Icons.check_circle_outline : Icons.error_outline, title: r.vin ?? r.plate ?? '#${r.row}', subtitle: r.status == 'failed' ? (r.errorAr ?? l.flImportFailed) : r.status == 'exists' ? l.flImportExists : l.flImportCreated),
          ])),
        ],
      ]),
    );
  }
}

class _Stat extends StatelessWidget {
  final String label; final int value; final bool bad;
  const _Stat({required this.label, required this.value, this.bad = false});
  @override Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme; final c = Theme.of(context).colorScheme;
    return Column(children: [Text('$value', style: t.headlineSmall?.copyWith(color: bad && value > 0 ? c.error : null, fontWeight: FontWeight.w800)), Text(label, style: t.bodySmall?.copyWith(color: c.onSurfaceVariant))]);
  }
}
