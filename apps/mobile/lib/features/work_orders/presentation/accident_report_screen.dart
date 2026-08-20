import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/format/format.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/result/result.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../../workshop/presentation/providers.dart' show currentOrgIdProvider;
import '../domain/accident_report.dart';
import 'providers.dart';

/// The insurance file behind a repair (منجز/تقدير), for the service advisor.
///
/// Three states, one primary action each: no file → look up and link; linked and priced → the figures the
/// customer will ask about, the assessor's lines to work from, and — once the car is done — registering
/// the repair back with the provider; still under assessment → say so, no figures invented.
class AccidentReportScreen extends ConsumerStatefulWidget {
  final String workOrderId;
  const AccidentReportScreen({super.key, required this.workOrderId});
  @override ConsumerState<AccidentReportScreen> createState() => _AccidentReportScreenState();
}

class _AccidentReportScreenState extends ConsumerState<AccidentReportScreen> {
  final _ref = TextEditingController();
  AccidentReport? _preview;
  Failure? _lookupError;
  bool _busy = false;

  @override void dispose() { _ref.dispose(); super.dispose(); }
  void _refresh() => ref.invalidate(accidentForWoProvider(widget.workOrderId));

  Future<void> _lookup() async {
    final text = _ref.text.trim();
    if (text.length < 4) return;
    setState(() { _busy = true; _lookupError = null; });
    final r = await ref.read(accidentsRepositoryProvider).lookup(ref: text);
    if (!mounted) return;
    setState(() { _busy = false; r.when(ok: (p) => _preview = p, err: (f) { _preview = null; _lookupError = f; }); });
  }

  Future<void> _link() async {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode;
    final org = ref.read(currentOrgIdProvider);
    if (_preview == null) return;
    // Never fail silently: if the membership has not loaded yet, say so instead of a dead button.
    if (org == null) { ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l.errorGeneric))); return; }
    setState(() => _busy = true);
    final r = await ref.read(accidentsRepositoryProvider).link(ref: _preview!.ref, workOrderId: widget.workOrderId, orgId: org);
    if (!mounted) return;
    setState(() => _busy = false);
    r.when(
      ok: (_) { setState(() => _preview = null); _refresh(); ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l.accLinked))); },
      err: (f) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(f.message(locale)))),
    );
  }

  Future<void> _submitRepair(AccidentReport report) async {
    final locale = Localizations.localeOf(context).languageCode;
    setState(() => _busy = true);
    final r = await ref.read(accidentsRepositoryProvider).submitRepair(report.id!);
    if (!mounted) return;
    setState(() => _busy = false);
    r.when(ok: (_) { _refresh(); ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(L10n.of(context).accSubmitted))); },
      err: (f) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(f.message(locale)))));
  }

  @override
  Widget build(BuildContext context) {
    final l = L10n.of(context);
    // Watched here so the auth chain (me → org membership) is loaded before the link button is tapped.
    ref.watch(currentOrgIdProvider);
    final v = ref.watch(accidentForWoProvider(widget.workOrderId));
    final linked = v.value?.valueOrNull;
    final notLinked = v.value?.failureOrNull != null;   // NOT_FOUND: no file yet — the lookup form is the screen

    Widget? primary;
    if (linked != null && linked.actionable && !linked.submitted) {
      primary = PrimaryButton(label: l.accSubmitRepair, icon: Icons.task_alt, loading: _busy, onPressed: _busy ? null : () => _submitRepair(linked));
    } else if (linked == null && _preview != null) {
      primary = PrimaryButton(label: l.accLink, icon: Icons.link, loading: _busy, onPressed: _busy ? null : _link);
    }

    return AppScaffold(
      title: l.accTitle,
      subtitle: l.accSub,
      primaryAction: primary,
      body: v.isLoading
          ? const InlineLoading()
          : linked != null
              ? _LinkedView(report: linked, onRefresh: _refresh)
              : ListView(padding: const EdgeInsets.fromLTRB(SinaatySpace.lg, SinaatySpace.md, SinaatySpace.lg, 96), children: [
                  if (notLinked && _preview == null) ...[
                    EmptyState(icon: Icons.shield_outlined, title: l.accNotLinked, body: l.accNotLinkedBody),
                    const SizedBox(height: SinaatySpace.lg),
                  ],
                  SectionTitle(l.accLookupLabel),
                  SectionCard(child: Row(children: [
                    Expanded(child: TextField(
                      controller: _ref, textDirection: TextDirection.ltr, textCapitalization: TextCapitalization.characters,
                      inputFormatters: [FilteringTextInputFormatter.allow(RegExp('[A-Za-z0-9-]'))],
                      decoration: InputDecoration(hintText: l.accLookupHint), onSubmitted: (_) => _lookup(),
                    )),
                    const SizedBox(width: SinaatySpace.sm),
                    SizedBox(height: 56, width: 96, child: FilledButton(style: FilledButton.styleFrom(padding: EdgeInsets.zero), onPressed: _busy ? null : _lookup, child: Text(l.accLookup))),
                  ])),
                  if (_lookupError != null) ...[
                    const SizedBox(height: SinaatySpace.md),
                    InlineError(message: _lookupError!.message(Localizations.localeOf(context).languageCode), retryLabel: l.retry, onRetry: _lookup),
                  ],
                  if (_preview != null) ...[
                    const SizedBox(height: SinaatySpace.lg),
                    _ReportCard(report: _preview!),
                  ],
                ]),
    );
  }
}

class _LinkedView extends StatelessWidget {
  final AccidentReport report;
  final VoidCallback onRefresh;
  const _LinkedView({required this.report, required this.onRefresh});
  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () async => onRefresh(),
      child: ListView(padding: const EdgeInsets.fromLTRB(SinaatySpace.lg, SinaatySpace.md, SinaatySpace.lg, 96), children: [
        _ReportCard(report: report),
      ]),
    );
  }
}

/// The file itself — identical whether it is a preview or already linked, so the advisor sees exactly
/// what linking will attach.
class _ReportCard extends StatelessWidget {
  final AccidentReport report;
  const _ReportCard({required this.report});

  /// The customer's slice of (insurer-approved + customer share) — proportion only, never money math.
  double? get _customerShare {
    final c = double.tryParse(report.customerEstimatedTotal ?? ''); final a = double.tryParse(report.approvedAmount ?? '');
    if (c == null || a == null || c + a <= 0) return null;
    return c / (c + a);
  }

  @override
  Widget build(BuildContext context) {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode;
    final t = Theme.of(context).textTheme; final scheme = Theme.of(context).colorScheme;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      SealCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(report.insurerNameAr ?? l.accTitle, style: t.titleLarge?.copyWith(color: Colors.white)),
            Text(Fmt.meta([report.ref, report.claimNo]), style: t.bodySmall?.copyWith(color: Colors.white.withValues(alpha: .75))),
          ])),
          if (report.submitted) SealPill(l.accSubmitted, icon: Icons.task_alt),
        ]),
        const SizedBox(height: SinaatySpace.md),
        if (report.actionable && report.customerEstimatedTotal != null) ...[
          Text(l.accCustomerPays, style: t.bodySmall?.copyWith(color: Colors.white.withValues(alpha: .8))),
          MoneyText(Fmt.money(report.customerEstimatedTotal!, locale: locale), hero: true, style: t.headlineMedium?.copyWith(color: Colors.white)),
          // The whole story in one glance: the solid slice is the customer's, the rest the insurer carries.
          if (_customerShare != null) ...[
            const SizedBox(height: SinaatySpace.md),
            SealMeter(value: _customerShare!),
            const SizedBox(height: SinaatySpace.sm),
            Text(l.accCoverage(Fmt.money(report.approvedAmount!, locale: locale)), style: t.bodySmall?.copyWith(color: Colors.white.withValues(alpha: .85))),
          ],
        ] else
          Text(l.accNotPriced, style: t.bodyMedium?.copyWith(color: Colors.white.withValues(alpha: .9))),
      ])),
      const SizedBox(height: SinaatySpace.lg),
      if (report.actionable) ...[
        SectionCard(child: Column(children: [
          if (report.approvedAmount != null) KeyValueRow(l.accApproved, Fmt.money(report.approvedAmount!, locale: locale), emphasized: true),
          if (report.deductibleAmount != null) KeyValueRow(l.accDeductible, Fmt.money(report.deductibleAmount!, locale: locale)),
          if (report.faultPercent != null && report.faultPercent != '0.00') KeyValueRow(l.accFault, '${report.faultPercent}%'),
        ])),
        const SizedBox(height: SinaatySpace.lg),
      ],
      if (report.suggestedItems.isNotEmpty) ...[
        SectionTitle(l.accSuggested),
        Text(l.accSuggestedHint, style: t.bodySmall?.copyWith(color: scheme.onSurfaceVariant)),
        const SizedBox(height: SinaatySpace.sm),
        SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm, vertical: SinaatySpace.xs), child: Column(children: [
          for (final s in report.suggestedItems)
            AppListRow(icon: s.type == 'part' ? Icons.settings_input_component_outlined : s.type == 'paint' ? Icons.format_paint_outlined : Icons.build_outlined, title: s.descriptionAr, trailing: Text(Fmt.ltr('× ${s.quantity}'), style: t.bodySmall)),
        ])),
      ],
      if (report.submitted && report.repairSubmissionRef != null) ...[
        const SizedBox(height: SinaatySpace.md),
        Text(l.accSubmittedRef(report.repairSubmissionRef!), style: t.bodySmall?.copyWith(color: scheme.onSurfaceVariant), textDirection: TextDirection.ltr),
      ],
    ]);
  }
}
