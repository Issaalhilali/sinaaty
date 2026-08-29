import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/di/core_providers.dart';
import '../../../core/format/format.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../domain/workshop.dart';
import 'providers.dart';

/// «خدماتي» — كتالوج الورشة المحفوظ: «غيار زيت 280» يُكتب مرةً ويُدرج في كل أمرٍ بنقرة.
class ServicesScreen extends ConsumerStatefulWidget {
  const ServicesScreen({super.key});
  @override ConsumerState<ServicesScreen> createState() => _ServicesScreenState();
}

final serviceItemsProvider = FutureProvider.autoDispose<List<OrgServiceItem>>((ref) async {
  final org = ref.watch(currentOrgIdProvider);
  if (org == null) return const [];
  return (await ref.watch(workshopRepositoryProvider).serviceItems(org)).valueOrNull ?? const [];
});

class _ServicesScreenState extends ConsumerState<ServicesScreen> {
  bool _busy = false;

  Future<void> _add() async {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode;
    final org = ref.read(currentOrgIdProvider); if (org == null) return;
    final name = TextEditingController(); final price = TextEditingController(); final days = TextEditingController(text: '0');
    var type = 'labor';
    final ok = await showModalBottomSheet<bool>(context: context, showDragHandle: true, isScrollControlled: true,
      builder: (c) => StatefulBuilder(builder: (c, setS) => Padding(
        padding: EdgeInsets.fromLTRB(SinaatySpace.lg, 0, SinaatySpace.lg, MediaQuery.viewInsetsOf(c).bottom + SinaatySpace.xl),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text(l.svcAdd, style: Theme.of(c).textTheme.titleLarge),
          const SizedBox(height: SinaatySpace.lg),
          TextField(controller: name, autofocus: true, decoration: InputDecoration(labelText: l.svcName, hintText: l.svcNameHint)),
          const SizedBox(height: SinaatySpace.md),
          Row(children: [
            Expanded(child: TextField(controller: price, keyboardType: const TextInputType.numberWithOptions(decimal: true), textDirection: TextDirection.ltr,
                inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.]'))], decoration: InputDecoration(labelText: l.svcPrice))),
            const SizedBox(width: SinaatySpace.sm),
            Expanded(child: TextField(controller: days, keyboardType: TextInputType.number, textDirection: TextDirection.ltr,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly], decoration: InputDecoration(labelText: l.svcWarrantyDays))),
          ]),
          const SizedBox(height: SinaatySpace.md),
          SegmentedButton<String>(
            segments: [ButtonSegment(value: 'labor', label: Text(l.itemLabor)), ButtonSegment(value: 'part', label: Text(l.itemPart)), ButtonSegment(value: 'diagnostic', label: Text(l.itemDiagnostic))],
            selected: {type}, showSelectedIcon: false, onSelectionChanged: (s) => setS(() => type = s.first)),
          const SizedBox(height: SinaatySpace.lg),
          PrimaryButton(label: l.svcAddConfirm, icon: Icons.add, onPressed: () {
            if (name.text.trim().length < 2 || (double.tryParse(price.text) ?? 0) <= 0) return;
            Navigator.pop(c, true);
          }),
        ]))));
    if (ok != true || !mounted) return;
    setState(() => _busy = true);
    final r = await ref.read(workshopRepositoryProvider).addServiceItem(org,
        nameAr: name.text.trim(), unitPrice: double.parse(price.text).toStringAsFixed(2), itemType: type, warrantyDays: int.tryParse(days.text) ?? 0);
    if (!mounted) return;
    setState(() => _busy = false);
    r.when(ok: (_) => ref.invalidate(serviceItemsProvider), err: (f) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(f.message(locale)))));
  }

  Future<void> _remove(OrgServiceItem it) async {
    final locale = Localizations.localeOf(context).languageCode;
    final org = ref.read(currentOrgIdProvider); if (org == null) return;
    final r = await ref.read(workshopRepositoryProvider).removeServiceItem(org, it.id);
    if (!mounted) return;
    r.when(ok: (_) => ref.invalidate(serviceItemsProvider), err: (f) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(f.message(locale)))));
  }

  @override Widget build(BuildContext context) {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode;
    final items = ref.watch(serviceItemsProvider);
    return AppScaffold(
      title: l.wsServices,
      primaryAction: PrimaryButton(label: l.svcAdd, icon: Icons.add, loading: _busy, onPressed: _busy ? null : _add),
      body: items.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, _) => EmptyState(glyph: BrandGlyph.gear, title: l.errorGeneric, body: '', actionLabel: l.retry, onAction: () => ref.invalidate(serviceItemsProvider)),
        data: (list) => list.isEmpty
            ? EmptyState(glyph: BrandGlyph.gear, title: l.svcEmpty, body: l.svcEmptyBody)
            : RefreshIndicator(onRefresh: () async => ref.invalidate(serviceItemsProvider), child: ListView(padding: EdgeInsets.fromLTRB(SinaatySpace.lg, SinaatySpace.md, SinaatySpace.lg, SinaatySpace.bottomClearance(context)), children: [
                SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm), child: Column(children: [
                  for (final it in list)
                    AppListRow(
                      brandIcon: BrandGlyph.gear,
                      title: it.nameAr,
                      subtitle: Fmt.meta([Fmt.money(it.unitPrice, locale: locale), if (it.warrantyDays > 0) l.warrantyDays(it.warrantyDays)]),
                      trailing: IconButton(icon: const Icon(Icons.close, size: 18), onPressed: () => _remove(it)),
                    ),
                ])),
              ])),
      ),
    );
  }
}
