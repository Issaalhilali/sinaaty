import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/format/format.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/l10n/labels.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/voice/voice_sheet.dart';
import '../../../core/ui/ui.dart';
import '../../auth/domain/normalize_phone.dart';
import '../domain/workshop.dart';
import 'quick_item_field.dart';
import 'providers.dart';
/// New repair order in one screen: who (phone), which car (VIN or plate), what (items with prices), how to pay → estimate updates live.
class NewOrderScreen extends ConsumerStatefulWidget { const NewOrderScreen({super.key}); @override ConsumerState<NewOrderScreen> createState() => _NewOrderScreenState(); }
class _NewOrderScreenState extends ConsumerState<NewOrderScreen> {
  final _phone = TextEditingController(); final _vin = TextEditingController(); final _plate = TextEditingController(); final _title = TextEditingController();
  String _terms = 'on_delivery'; final _items = <NewItem>[]; bool _busy = false; String? _error;
  double get _subtotal => _items.fold(0, (a, i) => a + (double.tryParse(i.unitPrice) ?? 0) * (double.tryParse(i.quantity) ?? 1));
  Future<void> _addItem() async {
    final l = L10n.of(context); final desc = TextEditingController(); final price = TextEditingController(); final qty = TextEditingController(text: '1'); final warranty = TextEditingController(text: '0'); var type = 'labor';
    final item = await showModalBottomSheet<NewItem>(context: context, isScrollControlled: true, showDragHandle: true, builder: (ctx) => StatefulBuilder(builder: (ctx, setS) => Padding(padding: EdgeInsets.fromLTRB(SinaatySpace.lg, 0, SinaatySpace.lg, MediaQuery.viewInsetsOf(ctx).bottom + SinaatySpace.xl), child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Text(l.wsAddItem, style: Theme.of(ctx).textTheme.titleLarge), const SizedBox(height: SinaatySpace.md),
      SegmentedButton<String>(segments: [ButtonSegment(value: 'labor', label: Text(l.wsLabor)), ButtonSegment(value: 'part', label: Text(l.wsPart))], selected: {type}, onSelectionChanged: (s) => setS(() => type = s.first), showSelectedIcon: false), const SizedBox(height: SinaatySpace.md),
      TextField(controller: desc, decoration: InputDecoration(labelText: l.wsItemDesc, suffixIcon: VoiceMicButton(controller: desc, title: l.wsItemDesc)), autofocus: true), const SizedBox(height: SinaatySpace.md),
      Row(children: [Expanded(child: TextField(controller: price, keyboardType: const TextInputType.numberWithOptions(decimal: true), textDirection: TextDirection.ltr, decoration: InputDecoration(labelText: l.wsItemPrice, suffixText: 'ر.س'))), const SizedBox(width: SinaatySpace.md), SizedBox(width: 90, child: TextField(controller: qty, keyboardType: TextInputType.number, textDirection: TextDirection.ltr, decoration: InputDecoration(labelText: l.wsItemQty)))]),
      if (type == 'part') ...[const SizedBox(height: SinaatySpace.md), TextField(controller: warranty, keyboardType: TextInputType.number, textDirection: TextDirection.ltr, decoration: InputDecoration(labelText: l.wsWarranty))],
      const SizedBox(height: SinaatySpace.lg), PrimaryButton(label: l.wsAddItem, onPressed: () { if (desc.text.trim().length < 2 || double.tryParse(price.text) == null) return; Navigator.pop(ctx, NewItem(type: type, descriptionAr: desc.text.trim(), unitPrice: price.text.trim(), quantity: qty.text.trim().isEmpty ? '1' : qty.text.trim(), warrantyDays: int.tryParse(warranty.text) ?? 0, partCondition: type == 'part' ? 'oem_new' : null)); }),
    ]))));
    if (item != null) setState(() => _items.add(item));
  }
  Future<void> _create() async {
    final l = L10n.of(context); final org = ref.read(currentOrgIdProvider); final phone = normalizeSaudiPhone(_phone.text);
    if (org == null || phone == null || _title.text.trim().isEmpty || _items.isEmpty || (_vin.text.trim().isEmpty && _plate.text.trim().isEmpty)) { setState(() => _error = l.errorInvalidPhone); return; }
    setState(() { _busy = true; _error = null; });
    final r = await ref.read(workshopRepositoryProvider).create(NewWorkOrder(orgId: org, vin: _vin.text.trim().isEmpty ? null : _vin.text.trim().toUpperCase(), plate: _plate.text.trim().isEmpty ? null : _plate.text.trim(), customerPhone: phone, titleAr: _title.text.trim(), paymentTerms: _terms, items: _items));
    if (!mounted) return; setState(() => _busy = false);
    r.when(ok: (wo) { ref.invalidate(orgOrdersProvider); context.pushReplacement('/ws/orders/${wo.id}'); }, err: (f) => setState(() => _error = f.message(Localizations.localeOf(context).languageCode)));
  }
  @override Widget build(BuildContext context) {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode; final t = Theme.of(context).textTheme; final org = ref.watch(currentOrgIdProvider);
    return AppScaffold(title: l.wsNewOrder, primaryAction: PrimaryButton(label: '${l.wsCreate} · ${Fmt.money((_subtotal * 1.15).toStringAsFixed(2), locale: locale)}', loading: _busy, onPressed: _items.isEmpty || org == null ? null : _create),
      body: ListView(padding: const EdgeInsets.fromLTRB(SinaatySpace.lg, SinaatySpace.sm, SinaatySpace.lg, SinaatySpace.xl), children: [
        SectionTitle(l.wsCustomer),
        TextField(controller: _phone, keyboardType: TextInputType.phone, textDirection: TextDirection.ltr, decoration: InputDecoration(labelText: l.wsCustomerPhone, hintText: '05xxxxxxxx', prefixIcon: const Icon(Icons.phone_outlined))),
        const SizedBox(height: SinaatySpace.md),
        Row(children: [Expanded(child: TextField(controller: _plate, decoration: InputDecoration(labelText: l.plateLabel, hintText: 'أ ب ج 1234'))), const SizedBox(width: SinaatySpace.md), Expanded(child: TextField(controller: _vin, textDirection: TextDirection.ltr, textCapitalization: TextCapitalization.characters, maxLength: 17, inputFormatters: [FilteringTextInputFormatter.allow(RegExp('[A-Za-z0-9]'))], decoration: InputDecoration(labelText: l.vinLabel, counterText: '')))]),
        const SizedBox(height: SinaatySpace.md),
        TextField(controller: _title, decoration: InputDecoration(labelText: l.wsTitle, hintText: l.wsTitleHint)),
        const SizedBox(height: SinaatySpace.lg), SectionTitle(l.wsItems),
        // سطر واحد بدل ورقة من خمسة حقول — والورقة تبقى خلف «تفاصيل» لمن احتاجها (الضمان، حالة القطعة).
        SectionCard(child: Column(children: [
          QuickItemField(onAdd: (it) => setState(() => _items.add(it)), onDetails: _addItem),
          if (_items.isNotEmpty) const Padding(padding: EdgeInsets.symmetric(vertical: 6), child: Divider()),
        ])),
        if (_items.isNotEmpty) const SizedBox(height: SinaatySpace.md),
        if (_items.isNotEmpty) SectionCard(child: Column(children: [
          for (final (i, it) in _items.indexed) Padding(padding: const EdgeInsets.symmetric(vertical: 4), child: Row(children: [Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(it.descriptionAr, style: t.titleSmall), Text('${it.type == 'labor' ? l.wsLabor : l.wsPart} · ${it.quantity} × ${Fmt.money(it.unitPrice, locale: locale)}${it.warrantyDays > 0 ? ' · ${l.warrantyDays(it.warrantyDays)}' : ''}', style: t.bodySmall?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant))])), Text(Fmt.money(((double.tryParse(it.unitPrice) ?? 0) * (double.tryParse(it.quantity) ?? 1)).toStringAsFixed(2), locale: locale)), IconButton(icon: const Icon(Icons.close, size: 18), onPressed: () => setState(() => _items.removeAt(i)))])),
          const Padding(padding: EdgeInsets.symmetric(vertical: 6), child: Divider()), KeyValueRow(l.subtotal, Fmt.money(_subtotal.toStringAsFixed(2), locale: locale)), KeyValueRow(l.vat, Fmt.money((_subtotal * .15).toStringAsFixed(2), locale: locale)), Padding(padding: const EdgeInsets.only(top: 6), child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text(l.wsEstimate, style: t.titleMedium), MoneyText(Fmt.money((_subtotal * 1.15).toStringAsFixed(2), locale: locale))])),
        ])),
        const SizedBox(height: SinaatySpace.lg), SectionTitle(l.wsPaymentTerms),
        Wrap(spacing: 8, runSpacing: 8, children: [for (final tm in ['on_delivery', 'prepaid', 'deferred']) ChoiceChip(label: Text(Labels.terms(l, tm)), selected: _terms == tm, onSelected: (_) => setState(() => _terms = tm), showCheckmark: false)]),
        if (_terms == 'deferred') Padding(padding: const EdgeInsets.only(top: 8), child: Text(l.noteHint, style: t.bodySmall?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant))),
        if (_error != null) Padding(padding: const EdgeInsets.only(top: SinaatySpace.md), child: Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error))),
      ]));
  }
}
