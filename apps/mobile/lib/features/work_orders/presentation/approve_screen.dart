import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/format/format.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/l10n/labels.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../../auth/presentation/providers.dart';
import '../domain/work_order.dart';
import 'providers.dart';
/// The legal moment: show exactly the signed snapshot, one sentence of explanation, one button.
/// Nafath (verified users): init → show number → poll complete. Otherwise SMS code (OTP).
class ApproveScreen extends ConsumerStatefulWidget { final String id; const ApproveScreen({super.key, required this.id}); @override ConsumerState<ApproveScreen> createState() => _ApproveScreenState(); }
class _ApproveScreenState extends ConsumerState<ApproveScreen> {
  bool _busy = false; String? _error; ApproveInit? _init; final _code = TextEditingController(); Timer? _poll; bool _done = false;
  @override void dispose() { _poll?.cancel(); _code.dispose(); super.dispose(); }
  String get _locale => Localizations.localeOf(context).languageCode;
  Future<void> _start(String method, int version) async {
    setState(() { _busy = true; _error = null; });
    final r = await ref.read(workOrdersRepositoryProvider).approveInit(widget.id, method: method, version: version); if (!mounted) return;
    r.when(ok: (i) { setState(() { _init = i; _busy = false; if (i.debugCode != null) _code.text = i.debugCode!; }); if (i.method == 'nafath') _pollNafath(i, version); }, err: (f) => setState(() { _busy = false; _error = f.message(_locale); }));
  }
  void _pollNafath(ApproveInit i, int version) { _poll?.cancel(); _poll = Timer.periodic(const Duration(seconds: 2), (_) async { final r = await ref.read(workOrdersRepositoryProvider).approveComplete(widget.id, method: 'nafath', version: version, transactionId: i.transactionId); if (!mounted) return; r.when(ok: (_) => _finish(), err: (f) { if (f.code != 'NAFATH_PENDING') { _poll?.cancel(); setState(() => _error = f.message(_locale)); } }); }); }
  Future<void> _completeOtp(int version) async {
    final l = L10n.of(context); if (!RegExp(r'^\d{6}$').hasMatch(_code.text)) { setState(() => _error = l.invalidCode); return; }
    setState(() { _busy = true; _error = null; });
    final r = await ref.read(workOrdersRepositoryProvider).approveComplete(widget.id, method: 'otp', version: version, code: _code.text); if (!mounted) return;
    r.when(ok: (_) => _finish(), err: (f) => setState(() { _busy = false; _error = f.message(_locale); }));
  }
  void _finish() { _poll?.cancel(); ref.invalidate(workOrderProvider(widget.id)); ref.invalidate(workOrderTimelineProvider(widget.id)); ref.invalidate(workOrdersProvider); setState(() { _done = true; _busy = false; }); }
  @override Widget build(BuildContext context) {
    final l = L10n.of(context); final wo = ref.watch(workOrderProvider(widget.id)); final order = wo.value?.valueOrNull; final nafath = ref.watch(authControllerProvider).me?.nafathVerified ?? false;
    final version = order == null ? null : ref.watch(workOrderVersionProvider((id: widget.id, version: order.currentVersion)));
    if (_done) return AppScaffold(title: l.approveTitle, body: EmptyState(icon: Icons.check_circle_outline, title: l.approved, body: l.approveHint, actionLabel: l.approveDone, onAction: () => context.pop()));
    Widget? primary;
    if (order != null && order.awaitingApproval && version?.value?.valueOrNull != null) {
      final v = order.currentVersion;
      if (_init == null) { primary = PrimaryButton(label: nafath ? l.approveWithNafath : l.approveWithOtp, icon: Icons.verified_user_outlined, loading: _busy, onPressed: () => _start(nafath ? 'nafath' : 'otp', v)); }
      else if (_init!.method == 'otp') { primary = PrimaryButton(label: l.confirmApproval, loading: _busy, onPressed: () => _completeOtp(v)); }
    }
    return AppScaffold(title: l.approveTitle, primaryAction: primary,
      body: AsyncResultView<WorkOrder>(value: wo, onRetry: () => ref.invalidate(workOrderProvider(widget.id)), builder: (o) {
        if (!o.awaitingApproval) return EmptyState(icon: Icons.info_outline, title: Labels.woStatus(l, o.status), body: '', actionLabel: l.approveDone, onAction: () => context.pop());
        return AsyncResultView<WoVersion>(value: version!, onRetry: () => ref.invalidate(workOrderVersionProvider((id: widget.id, version: o.currentVersion))), builder: (v) => ListView(padding: const EdgeInsets.fromLTRB(SinaatySpace.lg, SinaatySpace.md, SinaatySpace.lg, 120), children: [
          SectionCard(glow: true, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Row(children: [Expanded(child: Text(o.titleAr ?? o.number, style: Theme.of(context).textTheme.headlineSmall)), StatusBadge(l.versionN(v.version), tone: BadgeTone.seal)]), Text(o.number, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant)), const SizedBox(height: SinaatySpace.md), MoneyText(Fmt.money(v.total, locale: _locale), hero: true), const SizedBox(height: SinaatySpace.sm), Text(v.orgNameAr, style: Theme.of(context).textTheme.titleSmall), if (v.vehicleLine.isNotEmpty) Text(v.vehicleLine, style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)), if (v.reasonAr != null) Padding(padding: const EdgeInsets.only(top: 6), child: StatusBadge(l.changeReason(v.reasonAr!), tone: BadgeTone.brass))])),
          const SizedBox(height: SinaatySpace.md),
          SectionCard(child: Column(children: [
            for (final i in v.items) Padding(padding: const EdgeInsets.symmetric(vertical: 7), child: Row(children: [Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(i.descriptionAr, style: Theme.of(context).textTheme.titleSmall), Text('${i.quantity} × ${Fmt.money(i.unitPrice, locale: _locale)}${i.warrantyDays > 0 ? ' · ${l.warrantyDays(i.warrantyDays)}' : ''}', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant))])), Text(Fmt.money(i.lineTotal, locale: _locale), style: const TextStyle(fontWeight: FontWeight.w600))])),
            const Padding(padding: EdgeInsets.symmetric(vertical: 6), child: Divider()), KeyValueRow(l.subtotal, Fmt.money(v.subtotal, locale: _locale)), KeyValueRow(l.vat, Fmt.money(v.vat, locale: _locale)), Padding(padding: const EdgeInsets.only(top: 6), child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text(l.total, style: Theme.of(context).textTheme.titleMedium), MoneyText(Fmt.money(v.total, locale: _locale))])),
          ])),
          const SizedBox(height: SinaatySpace.md),
          SectionCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Row(children: [Icon(Icons.lock_outline, size: 18, color: Theme.of(context).colorScheme.primary), const SizedBox(width: 6), Text(l.approveTitle, style: Theme.of(context).textTheme.titleSmall)]), const SizedBox(height: SinaatySpace.sm), Wrap(spacing: 8, children: [StatusBadge(Labels.terms(l, v.paymentTerms), tone: BadgeTone.seal), if (v.paymentTerms == 'deferred') StatusBadge(l.securedByNote, tone: BadgeTone.brass, icon: Icons.verified_outlined)]), if ((double.tryParse(v.depositRequired) ?? 0) > 0) Padding(padding: const EdgeInsets.only(top: 6), child: Text('${Fmt.money(v.depositRequired, locale: _locale)} — ${l.amountHeld}', style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant))), const SizedBox(height: 6), Text(l.approveHint, style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant))])),
          if (_init?.method == 'nafath') ...[const SizedBox(height: SinaatySpace.md), SectionCard(child: Column(children: [Text(l.nafathPickNumber), const SizedBox(height: SinaatySpace.sm), Text(_init!.random ?? '', style: Theme.of(context).textTheme.displaySmall?.copyWith(fontWeight: FontWeight.w700, color: Theme.of(context).colorScheme.primary)), const SizedBox(height: SinaatySpace.sm), Row(mainAxisAlignment: MainAxisAlignment.center, children: [const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2)), const SizedBox(width: 8), Text(l.nafathWaiting)])]))],
          if (_init?.method == 'otp') ...[const SizedBox(height: SinaatySpace.md), TextField(controller: _code, keyboardType: TextInputType.number, maxLength: 6, textAlign: TextAlign.center, textDirection: TextDirection.ltr, style: const TextStyle(fontSize: 26, letterSpacing: 8), decoration: InputDecoration(labelText: l.codeLabel, counterText: ''))],
          if (_error != null) Padding(padding: const EdgeInsets.only(top: SinaatySpace.md), child: Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error))),
          if (_init == null) Center(child: TextButton(onPressed: _busy ? null : () => _decline(o.currentVersion), child: Text(l.declineOrder))),
        ]));
      }));
  }
  Future<void> _decline(int version) async {
    final l = L10n.of(context); final c = TextEditingController();
    final reason = await showModalBottomSheet<String>(context: context, isScrollControlled: true, showDragHandle: true, builder: (ctx) => Padding(padding: EdgeInsets.fromLTRB(SinaatySpace.lg, 0, SinaatySpace.lg, MediaQuery.viewInsetsOf(ctx).bottom + SinaatySpace.xl), child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [Text(l.declineOrder, style: Theme.of(ctx).textTheme.titleLarge), const SizedBox(height: SinaatySpace.md), TextField(controller: c, decoration: InputDecoration(labelText: l.declineReason), maxLines: 2), const SizedBox(height: SinaatySpace.lg), PrimaryButton(label: l.declineOrder, secondary: true, onPressed: () => Navigator.pop(ctx, c.text.trim().isEmpty ? l.declineOrder : c.text.trim()))])));
    if (reason == null || !mounted) return;
    final r = await ref.read(workOrdersRepositoryProvider).cancel(widget.id, reason); if (!mounted) return;
    r.when(ok: (_) { ref.invalidate(workOrderProvider(widget.id)); ref.invalidate(workOrdersProvider); context.pop(); }, err: (f) => setState(() => _error = f.message(_locale)));
  }
}
