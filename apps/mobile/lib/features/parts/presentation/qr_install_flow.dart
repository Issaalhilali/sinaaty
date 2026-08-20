import 'package:flutter/material.dart';
import '../../../core/format/format.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../../workshop/presentation/providers.dart';
import 'providers.dart';
/// Scan QR → verify (genuine / alert) → pick the part item from an active work order → install → warranty issued.
Future<void> startQrInstall(BuildContext context, WidgetRef ref, {String? token}) async {
  final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode; final repo = ref.read(partsRepositoryProvider);
  final qr = token ?? await ref.read(qrScannerProvider).scan(); if (qr == null) return;
  final v = await repo.verify(qr); if (!context.mounted) return;
  await v.when(err: (f) async => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(f.message(locale)))), ok: (sv) async {
    final orders = ((await ref.read(orgOrdersProvider.future)).valueOrNull ?? []).where((w) => w.isActive && w.items.any((i) => i.type == 'part')).toList();
    if (!context.mounted) return;
    String? itemId; var labor = 180;
    final go = await showModalBottomSheet<bool>(context: context, showDragHandle: true, isScrollControlled: true, builder: (ctx) => StatefulBuilder(builder: (ctx, setS) => Padding(padding: EdgeInsets.fromLTRB(SinaatySpace.lg, 0, SinaatySpace.lg, MediaQuery.viewInsetsOf(ctx).bottom + SinaatySpace.xl), child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      SealCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Row(children: [Icon(sv.genuine ? Icons.verified : Icons.gpp_bad_outlined, color: Colors.white), const SizedBox(width: 8), Expanded(child: Text(sv.genuine ? l.ptVerifyGenuine : l.ptVerifyFake, style: Theme.of(ctx).textTheme.titleLarge?.copyWith(color: Colors.white))), if (sv.alert) SealPill(l.ptVerifyAlert, icon: Icons.warning_amber_rounded)]), if (sv.partNameAr != null) Text(Fmt.meta([sv.partNameAr, sv.partNumber, sv.issuerAr]), style: TextStyle(color: Colors.white.withValues(alpha: .85))), Text(locale == 'ar' ? sv.messageAr : sv.messageEn, style: TextStyle(color: Colors.white.withValues(alpha: .8), fontSize: 13))])),
      if (sv.genuine && sv.status != 'installed') ...[
        const SizedBox(height: SinaatySpace.lg), Text(l.ptChooseItem, style: Theme.of(ctx).textTheme.titleSmall), const SizedBox(height: 6),
        if (orders.isEmpty) Text(l.wsNoOrders, style: TextStyle(color: Theme.of(ctx).colorScheme.onSurfaceVariant)),
        RadioGroup<String>(groupValue: itemId, onChanged: (v) => setS(() => itemId = v), child: Column(children: [for (final w in orders) for (final i in w.items.where((i) => i.type == 'part')) RadioListTile<String>(value: i.id, title: Text(i.descriptionAr), subtitle: Text(Fmt.meta([w.titleAr, w.number])), contentPadding: EdgeInsets.zero, dense: true)])),
        const SizedBox(height: SinaatySpace.sm), Row(children: [Text(l.ptLaborWarranty, style: Theme.of(ctx).textTheme.titleSmall), const Spacer(), SegmentedButton<int>(segments: const [ButtonSegment(value: 90, label: Text('90')), ButtonSegment(value: 180, label: Text('180')), ButtonSegment(value: 365, label: Text('365'))], selected: {labor}, onSelectionChanged: (s) => setS(() => labor = s.first), showSelectedIcon: false)]),
        const SizedBox(height: SinaatySpace.lg), PrimaryButton(label: l.ptInstallOn, icon: Icons.build_circle_outlined, onPressed: itemId == null ? null : () => Navigator.pop(ctx, true)),
      ] else ...[const SizedBox(height: SinaatySpace.lg), PrimaryButton(label: l.approveDone, secondary: true, onPressed: () => Navigator.pop(ctx, false))],
    ]))));
    if (go != true || itemId == null || !context.mounted) return;
    final r = await repo.install(qrToken: qr, workOrderItemId: itemId!, laborWarrantyDays: labor); if (!context.mounted) return;
    r.when(ok: (w) { ref.invalidate(warrantiesProvider); ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('${l.ptInstalled} · ${w.number}'))); }, err: (f) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(f.message(locale)))));
  });
}
