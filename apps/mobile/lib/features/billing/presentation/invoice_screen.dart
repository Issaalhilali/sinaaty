import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/format/format.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/l10n/labels.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../../work_orders/presentation/providers.dart';
import '../domain/billing.dart';
import 'providers.dart';
/// Invoice + pay. The pay sheet offers mada / Apple Pay; with the mock PSP it completes in-app (dev hook), live PSP opens the redirect.
class InvoiceScreen extends ConsumerStatefulWidget { final String id; const InvoiceScreen({super.key, required this.id}); @override ConsumerState<InvoiceScreen> createState() => _InvoiceScreenState(); }
class _InvoiceScreenState extends ConsumerState<InvoiceScreen> {
  bool _busy = false; bool _paidNow = false;
  Future<void> _pay(Invoice inv) async {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode;
    final method = await showModalBottomSheet<String>(context: context, showDragHandle: true, builder: (c) => Padding(padding: const EdgeInsets.fromLTRB(SinaatySpace.lg, 0, SinaatySpace.lg, SinaatySpace.xl), child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Text(l.paySheetTitle, style: Theme.of(c).textTheme.titleLarge), const SizedBox(height: 4), Text(l.payHint, style: TextStyle(color: Theme.of(c).colorScheme.onSurfaceVariant)), const SizedBox(height: SinaatySpace.lg),
      PrimaryButton(label: '${l.payWithMada} · ${Fmt.money(inv.remaining, locale: locale)}', icon: Icons.credit_card, onPressed: () => Navigator.pop(c, 'mada')), const SizedBox(height: SinaatySpace.sm),
      PrimaryButton(label: l.payWithApplePay, icon: Icons.apple, secondary: true, onPressed: () => Navigator.pop(c, 'apple_pay')),
    ])));
    if (method == null || !mounted) return; setState(() => _busy = true);
    final repo = ref.read(billingRepositoryProvider);
    final r = await repo.createPayment(inv.id, method); if (!mounted) return;
    final task = r.when(ok: (p) async { final m = await repo.mockPay(p.paymentId); if (!mounted) return; m.when(ok: (_) { setState(() => _paidNow = true); ref.invalidate(invoiceProvider(widget.id)); ref.invalidate(invoicesProvider); if (inv.workOrderId != null) { ref.invalidate(workOrderProvider(inv.workOrderId!)); ref.invalidate(workOrderTimelineProvider(inv.workOrderId!)); } ref.invalidate(notesProvider); }, err: (f) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(f.message(locale))))); }, err: (f) async => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(f.message(locale)))));
    await task; if (mounted) setState(() => _busy = false);
  }
  @override Widget build(BuildContext context) {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode; final v = ref.watch(invoiceProvider(widget.id)); final inv = v.value?.valueOrNull;
    return AppScaffold(title: inv == null ? l.invoice : l.invoiceNumber(inv.number),
      primaryAction: inv != null && inv.payable ? PrimaryButton(label: l.payAmount(Fmt.money(inv.remaining, locale: locale)), icon: Icons.lock_outline, loading: _busy, onPressed: () => _pay(inv)) : null,
      body: AsyncResultView<Invoice>(value: v, onRetry: () => ref.invalidate(invoiceProvider(widget.id)), builder: (i) => ListView(padding: const EdgeInsets.fromLTRB(SinaatySpace.lg, SinaatySpace.md, SinaatySpace.lg, 96), children: [
        if (_paidNow || i.isPaid) SectionCard(child: Row(children: [Icon(Icons.check_circle, color: Theme.of(context).colorScheme.primary), const SizedBox(width: SinaatySpace.sm), Expanded(child: Text(i.isPaid || _paidNow ? l.paymentDone : '', style: Theme.of(context).textTheme.titleMedium)), if (i.paymentTerms != 'deferred') StatusBadge(l.amountHeld, tone: BadgeTone.seal)])),
        if (_paidNow || i.isPaid) const SizedBox(height: SinaatySpace.md),
        SectionCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Row(children: [Expanded(child: Text(i.sellerNameAr.isEmpty ? l.invoice : i.sellerNameAr, style: Theme.of(context).textTheme.titleLarge)), StatusBadge(Labels.invoiceStatus(l, i.status), tone: i.isPaid ? BadgeTone.seal : i.payable ? BadgeTone.brass : BadgeTone.plain)]), Text([i.number, if (i.issueDate != null) Fmt.date(i.issueDate!, locale: locale), Labels.terms(l, i.paymentTerms)].join(' · '), style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant))])),
        const SizedBox(height: SinaatySpace.md),
        SectionCard(child: Column(children: [
          for (final ln in i.lines) Padding(padding: const EdgeInsets.symmetric(vertical: 6), child: Row(children: [Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(ln.descriptionAr), Text('${ln.quantity} × ${Fmt.money(ln.unitPrice, locale: locale)}', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant))])), Text(Fmt.money(ln.lineTotal, locale: locale))])),
          const Divider(), KeyValueRow(l.subtotal, Fmt.money(i.subtotal, locale: locale)), KeyValueRow(l.vat, Fmt.money(i.vatTotal, locale: locale)), KeyValueRow(l.total, Fmt.money(i.total, locale: locale), emphasized: true),
          if ((double.tryParse(i.paidTotal) ?? 0) > 0 && !i.isPaid) KeyValueRow(l.outstanding, Fmt.money(i.remaining, locale: locale)),
        ])),
        if (i.qrBase64 != null) ...[const SizedBox(height: SinaatySpace.md), SectionCard(child: Row(children: [Container(width: 64, height: 64, decoration: BoxDecoration(color: Theme.of(context).colorScheme.surfaceContainerHighest, borderRadius: BorderRadius.circular(8)), child: const Icon(Icons.qr_code_2)), const SizedBox(width: SinaatySpace.md), Expanded(child: Text('ZATCA QR · ${base64Decode(i.qrBase64!).length} B', style: Theme.of(context).textTheme.bodySmall))]))],
      ])));
  }
}
