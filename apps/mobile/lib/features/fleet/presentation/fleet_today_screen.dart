import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/format/format.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../domain/fleet.dart';
import 'providers.dart';

/// Tab «اليوم» for the fleet manager. One question drives the screen: **what needs my decision?**
/// The budget card answers "where do we stand", the inbox below is the work — approve or reject each
/// repair per the fleet's own policy. Signing stays a separate personal act (Nafath/OTP), exactly as the
/// backend enforces it.
class FleetTodayScreen extends ConsumerStatefulWidget {
  const FleetTodayScreen({super.key});
  @override ConsumerState<FleetTodayScreen> createState() => _FleetTodayScreenState();
}

class _FleetTodayScreenState extends ConsumerState<FleetTodayScreen> {
  bool _busy = false;

  void _refresh() { ref.invalidate(fleetOverviewProvider); ref.invalidate(fleetPendingProvider); }

  Future<void> _decide(FleetPending p, String decision) async {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode;
    final note = TextEditingController();
    final ok = await showModalBottomSheet<bool>(context: context, showDragHandle: true, isScrollControlled: true, builder: (ctx) => Padding(
      padding: EdgeInsets.fromLTRB(SinaatySpace.lg, 0, SinaatySpace.lg, MediaQuery.viewInsetsOf(ctx).bottom + SinaatySpace.xl),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text(decision == 'approved' ? l.flApprove : l.flReject, style: Theme.of(ctx).textTheme.titleLarge),
        const SizedBox(height: 4),
        Text('${p.number} · ${Fmt.money(p.total, locale: locale)}${p.workshopNameAr != null ? ' · ${p.workshopNameAr}' : ''}', style: TextStyle(color: Theme.of(ctx).colorScheme.onSurfaceVariant)),
        const SizedBox(height: SinaatySpace.md),
        TextField(controller: note, decoration: InputDecoration(labelText: l.flDecisionNote)),
        const SizedBox(height: SinaatySpace.sm),
        Text(l.flDecisionHint, style: Theme.of(ctx).textTheme.bodySmall?.copyWith(color: Theme.of(ctx).colorScheme.onSurfaceVariant)),
        const SizedBox(height: SinaatySpace.lg),
        PrimaryButton(label: decision == 'approved' ? l.flApprove : l.flReject, icon: decision == 'approved' ? Icons.check : Icons.close, onPressed: () => Navigator.pop(ctx, true)),
      ]),
    ));
    if (ok != true || !mounted) return;
    setState(() => _busy = true);
    final res = await ref.read(fleetRepositoryProvider).decide(p.workOrderId, decision: decision, noteAr: note.text.trim().isEmpty ? null : note.text.trim());
    if (!mounted) return;
    setState(() => _busy = false);
    res.when(
      ok: (_) { _refresh(); ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(decision == 'approved' ? l.flDecided : l.flRejectedDone))); },
      err: (f) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(f.message(locale)))),
    );
  }

  String _policyLabel(L10n l, FleetPending p) => switch (p.outcome) {
        'auto' => l.flAutoOk,
        'two_approvers' => l.flNeedsTwo,
        'workshop_not_allowed' => l.flBlockedWorkshop,
        'over_budget' => l.flOverBudget,
        _ => l.flNeedsOne,
      };

  @override
  Widget build(BuildContext context) {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode; final t = Theme.of(context).textTheme; final scheme = Theme.of(context).colorScheme;
    final overview = ref.watch(fleetOverviewProvider);
    final pending = ref.watch(fleetPendingProvider);
    final o = overview.value?.valueOrNull;
    final rows = pending.value?.valueOrNull ?? const <FleetPending>[];

    return RefreshIndicator(
      onRefresh: () async => _refresh(),
      child: ListView(padding: const EdgeInsets.fromLTRB(SinaatySpace.lg, SinaatySpace.sm, SinaatySpace.lg, 110), children: [
        SealCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(child: Text(l.flToday, style: t.titleLarge?.copyWith(color: Colors.white))),
            if ((o?.awaitingApproval ?? 0) > 0) SealPill('${l.flAwaiting}: ${o!.awaitingApproval}', icon: Icons.pending_actions),
          ]),
          const SizedBox(height: SinaatySpace.md),
          Text(l.flMonthSpend, style: t.bodySmall?.copyWith(color: Colors.white.withValues(alpha: .8))),
          MoneyText(Fmt.money(o?.monthSpend ?? '0', locale: locale), hero: true, style: t.headlineMedium?.copyWith(color: Colors.white)),
          if (o?.budgetRemaining != null) ...[
            const SizedBox(height: SinaatySpace.sm),
            Text(l.flBudgetLeft(Fmt.money(o!.budgetRemaining!, locale: locale)), style: t.bodySmall?.copyWith(color: Colors.white.withValues(alpha: .85))),
          ],
          const SizedBox(height: SinaatySpace.md),
          Wrap(spacing: 8, runSpacing: 6, children: [
            SealPill('${o?.vehicles ?? 0} ${l.flVehicles}', icon: Icons.directions_car_outlined),
            SealPill('${o?.openWorkOrders ?? 0} ${l.flOpenRepairs}', icon: Icons.build_outlined),
          ]),
        ])),
        const SizedBox(height: SinaatySpace.sm),
        Text(
          o?.policyNameAr != null ? l.flPolicyLine(o!.policyNameAr!, Fmt.money(o.autoApproveBelow ?? '0', locale: locale)) : l.flNoPolicy,
          style: t.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
        ),
        const SizedBox(height: SinaatySpace.lg),
        SectionTitle(l.flInboxTitle),
        if (pending.isLoading) const InlineLoading()
        else if (rows.isEmpty) EmptyState(icon: Icons.task_alt, title: l.flInboxEmpty, body: l.flInboxEmptyBody)
        else ...[
          for (final p in rows) Padding(padding: const EdgeInsets.only(bottom: SinaatySpace.md), child: _PendingCard(
            p: p, busy: _busy, policyLabel: _policyLabel(l, p),
            onApprove: () => _decide(p, 'approved'), onReject: () => _decide(p, 'rejected'),
            onSign: () => context.push('/work-orders/${p.workOrderId}/approve'),
          )),
        ],
      ]),
    );
  }
}

class _PendingCard extends StatelessWidget {
  final FleetPending p;
  final bool busy;
  final String policyLabel;
  final VoidCallback onApprove;
  final VoidCallback onReject;
  final VoidCallback onSign;
  const _PendingCard({required this.p, required this.busy, required this.policyLabel, required this.onApprove, required this.onReject, required this.onSign});

  @override
  Widget build(BuildContext context) {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode;
    final t = Theme.of(context).textTheme; final scheme = Theme.of(context).colorScheme;
    final tone = p.blocked ? BadgeTone.bad : p.readyToSign ? BadgeTone.seal : BadgeTone.brass;
    return SectionCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(p.workshopNameAr ?? p.number, style: t.titleSmall),
          Text([p.number, if (p.assetCode != null) p.assetCode! else if (p.plate != null) p.plate!, Fmt.date(p.requestedAt, locale: locale)].join(' · '), style: t.bodySmall?.copyWith(color: scheme.onSurfaceVariant)),
        ])),
        MoneyText(Fmt.money(p.total, locale: locale)),
      ]),
      const SizedBox(height: SinaatySpace.sm),
      Wrap(spacing: 6, runSpacing: 4, children: [
        StatusBadge(policyLabel, tone: tone),
        for (final a in p.approvals)
          StatusBadge(a.decision == 'approved' ? l.flApprovedBy(a.byNameAr ?? '—') : l.flRejectedBy(a.byNameAr ?? '—'), tone: a.decision == 'approved' ? BadgeTone.seal : BadgeTone.bad),
      ]),
      if (p.blocked) ...[
        const SizedBox(height: SinaatySpace.sm),
        Text(p.policyReasonAr, style: t.bodySmall?.copyWith(color: scheme.error)),
      ],
      const SizedBox(height: SinaatySpace.md),
      if (p.readyToSign)
        SizedBox(width: double.infinity, child: PrimaryButton(label: l.flReadyToSign, icon: Icons.draw_outlined, onPressed: onSign))
      else if (!p.blocked && !p.rejected) ...[
        // One primary action per card (charter §5.0 #1): approving is the job; rejecting is the exception.
        SizedBox(width: double.infinity, child: PrimaryButton(label: l.flApprove, icon: Icons.check, loading: busy, onPressed: busy ? null : onApprove)),
        Center(child: TextButton(onPressed: busy ? null : onReject, child: Text(l.flReject, style: TextStyle(color: scheme.error)))),
      ],
    ]));
  }
}
