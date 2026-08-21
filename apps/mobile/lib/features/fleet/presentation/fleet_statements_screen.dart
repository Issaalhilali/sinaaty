import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/format/format.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/l10n/labels.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../../workshop/presentation/providers.dart' show currentOrgIdProvider;
import '../domain/fleet.dart';
import 'providers.dart';

/// The fleet's monthly statements (Step 26): one accounting-ready summary per month.
/// Generation is idempotent on the API — the button is safe to press twice.
class FleetStatementsScreen extends ConsumerStatefulWidget {
  const FleetStatementsScreen({super.key});
  @override ConsumerState<FleetStatementsScreen> createState() => _FleetStatementsScreenState();
}

class _FleetStatementsScreenState extends ConsumerState<FleetStatementsScreen> {
  bool _busy = false;

  Future<void> _generate() async {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode;
    final org = ref.read(currentOrgIdProvider); if (org == null) return;
    final now = DateTime.now(); final month = '${now.year}-${now.month.toString().padLeft(2, '0')}';
    setState(() => _busy = true);
    final r = await ref.read(fleetRepositoryProvider).generateStatement(org, month);
    if (!mounted) return;
    setState(() => _busy = false);
    r.when(
      ok: (s) { ref.invalidate(fleetStatementsProvider); ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l.flStatementGenerated))); context.push('/fleet/statements/${s.id}'); },
      err: (f) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(f.message(locale)))),
    );
  }

  @override Widget build(BuildContext context) {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode;
    final v = ref.watch(fleetStatementsProvider);
    return AppScaffold(
      title: l.flStatements, subtitle: l.flStatementsBody,
      primaryAction: PrimaryButton(label: l.flGenerateStatement, icon: Icons.receipt_long_outlined, loading: _busy, onPressed: _busy ? null : _generate),
      body: AsyncResultView<List<FleetStatement>>(value: v, onRetry: () => ref.invalidate(fleetStatementsProvider), builder: (list) => list.isEmpty
          ? EmptyState(icon: Icons.receipt_long_outlined, title: l.flStatementsEmpty, body: l.flStatementsEmptyBody)
          : RefreshIndicator(onRefresh: () async => ref.invalidate(fleetStatementsProvider), child: ListView(padding: const EdgeInsets.fromLTRB(SinaatySpace.lg, SinaatySpace.md, SinaatySpace.lg, 96), children: [
              SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm), child: Column(children: [
                for (final s in list) AppListRow(
                  icon: Icons.calendar_month_outlined,
                  title: Fmt.month(s.periodStart, locale: locale),
                  subtitle: l.flInvoicesCount(s.invoiceCount),
                  trailing: Text(Fmt.money(s.total, locale: locale), style: const TextStyle(fontWeight: FontWeight.w600)),
                  onTap: () => context.push('/fleet/statements/${s.id}'),
                ),
              ])),
            ]))),
    );
  }
}

/// One month, line by line: every invoice with its vehicle and state — and the CSV a copy away.
class FleetStatementScreen extends ConsumerWidget {
  final String id;
  const FleetStatementScreen({super.key, required this.id});

  Future<void> _copyCsv(BuildContext context, WidgetRef ref) async {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode;
    final r = await ref.read(fleetRepositoryProvider).statementCsv(id);
    if (!context.mounted) return;
    await r.when(
      ok: (csv) async { await Clipboard.setData(ClipboardData(text: csv)); if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l.flCsvCopied))); },
      err: (f) async => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(f.message(locale)))),
    );
  }

  @override Widget build(BuildContext context, WidgetRef ref) {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode; final t = Theme.of(context).textTheme;
    final v = ref.watch(fleetStatementProvider(id));
    final s = v.value?.valueOrNull;
    return AppScaffold(
      title: s == null ? l.flStatements : Fmt.month(s.periodStart, locale: locale),
      moreItems: [PopupMenuItem(value: 'csv', child: Text(l.flCopyCsv))],
      onMore: (val) { if (val == 'csv') _copyCsv(context, ref); },
      body: AsyncResultView<FleetStatement>(value: v, onRetry: () => ref.invalidate(fleetStatementProvider(id)), builder: (s) => ListView(padding: const EdgeInsets.fromLTRB(SinaatySpace.lg, SinaatySpace.md, SinaatySpace.lg, 96), children: [
        SealCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(child: Text(Fmt.month(s.periodStart, locale: locale), style: t.titleLarge?.copyWith(color: Colors.white))),
            SealPill(l.flInvoicesCount(s.invoiceCount), icon: Icons.receipt_long_outlined),
          ]),
          const SizedBox(height: SinaatySpace.md),
          MoneyText(Fmt.money(s.total, locale: locale), hero: true, style: t.headlineMedium?.copyWith(color: Colors.white)),
        ])),
        const SizedBox(height: SinaatySpace.lg),
        SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm), child: Column(children: [
          for (final line in s.lines) AppListRow(
            icon: Icons.directions_car_outlined,
            title: line.assetCode ?? line.plate ?? line.number,
            subtitle: Fmt.meta([line.number, Fmt.date(line.issueDate, locale: locale)]),
            trailing: Column(crossAxisAlignment: CrossAxisAlignment.end, mainAxisSize: MainAxisSize.min, children: [
              Text(Fmt.money(line.total, locale: locale), style: const TextStyle(fontWeight: FontWeight.w600)),
              StatusBadge(Labels.invoiceStatus(l, line.status), tone: line.status == 'paid' ? BadgeTone.seal : BadgeTone.brass),
            ]),
          ),
        ])),
      ])),
    );
  }
}
