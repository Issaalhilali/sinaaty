import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/format/format.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/l10n/labels.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../domain/billing.dart';
import 'providers.dart';
/// Promissory note (سند لأمر) + its clearance (مخالصة) once paid. Primary action while open: pay the invoice.
class NoteScreen extends ConsumerWidget {
  final String id; const NoteScreen({super.key, required this.id});
  @override Widget build(BuildContext context, WidgetRef ref) {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode; final v = ref.watch(noteProvider(id)); final n = v.value?.valueOrNull;
    return AppScaffold(title: n == null ? l.note : l.noteNumber(n.number),
      primaryAction: n != null && n.isOpen && n.invoiceId != null ? PrimaryButton(label: l.payAmount(Fmt.money(n.outstanding, locale: locale)), onPressed: () => context.push('/invoices/${n.invoiceId}')) : null,
      body: AsyncResultView<PromissoryNote>(value: v, onRetry: () => ref.invalidate(noteProvider(id)), builder: (note) => ListView(padding: const EdgeInsets.fromLTRB(SinaatySpace.lg, SinaatySpace.md, SinaatySpace.lg, 96), children: [
        SectionCard(glow: true, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [Expanded(child: MoneyText(Fmt.money(note.isOpen ? note.outstanding : note.amount, locale: locale), hero: true)), StatusBadge(note.overdue ? l.overdue : Labels.noteStatus(l, note.status), tone: note.overdue ? BadgeTone.bad : note.isOpen ? BadgeTone.brass : BadgeTone.seal, icon: Icons.verified_outlined)]),
          Text([if (note.isOpen) l.outstanding, if (note.dueDate != null) l.dueOn(Fmt.date(note.dueDate!, locale: locale)), if (note.nafezReference != null) 'نافذ ${note.nafezReference}'].join(' · '), style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)),
          const SizedBox(height: SinaatySpace.sm), Text(l.noteHint, style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)),
        ])),
        if (note.settlement != null) ...[const SizedBox(height: SinaatySpace.md), SectionCard(child: Row(children: [Icon(Icons.task_alt, color: Theme.of(context).colorScheme.primary), const SizedBox(width: SinaatySpace.sm), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(l.noteClosedHint, style: Theme.of(context).textTheme.titleMedium), Text('${l.clearanceIssued(note.settlement!.number)} · ${Fmt.date(note.settlement!.issuedAt, locale: locale)}', style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant))]))]))],
        const SizedBox(height: SinaatySpace.xl), SectionTitle(l.timeline),
        SectionCard(child: StatusTimeline(steps: [for (final e in note.events) TimelineStep(title: Labels.noteStatus(l, e.toStatus), subtitle: [Fmt.dateTime(e.at, locale: locale), if (e.amountDelta != null) Fmt.money(e.amountDelta!, locale: locale), if (e.noteAr != null) e.noteAr!].join(' · '), done: true, current: e == note.events.last)])),
        if (note.workOrderId != null) ...[const SizedBox(height: SinaatySpace.md), SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm), child: AppListRow(icon: Icons.build_outlined, title: l.workOrder, onTap: () => context.push('/work-orders/${note.workOrderId}')))],
      ])));
  }
}
