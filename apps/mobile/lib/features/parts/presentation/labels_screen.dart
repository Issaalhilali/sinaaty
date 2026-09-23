import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../domain/parts.dart';
import 'providers.dart';

/// ملصقات دفعةٍ واحدة: رمز QR لكل قطعة مع رقمها التسلسلي — يُصوَّر أو يُطبع ويُلصق على القطعة.
/// يمسحه الفنّي عند التركيب فيصدر الضمان، ويمسحه المشتري فيعرف أن القطعة من هذا المحل لا من غيره.
class PartLabelsScreen extends ConsumerWidget {
  final String orgId; final String batch; final String? partName;
  const PartLabelsScreen({super.key, required this.orgId, required this.batch, this.partName});
  @override Widget build(BuildContext context, WidgetRef ref) {
    final l = L10n.of(context); final key = (orgId: orgId, batch: batch); final v = ref.watch(partLabelsProvider(key));
    return AppScaffold(title: l.spLabelsTitle, body: AsyncResultView<List<PartLabel>>(value: v, onRetry: () => ref.invalidate(partLabelsProvider(key)), builder: (rows) {
      if (rows.isEmpty) return EmptyState(icon: Icons.qr_code_2, title: l.spLabelsTitle, body: l.spLabelsEmpty);
      return ListView(padding: EdgeInsets.fromLTRB(SinaatySpace.lg, SinaatySpace.sm, SinaatySpace.lg, SinaatySpace.bottomClearance(context)), children: [
        SectionTitle(l.spLabelsCount(rows.length), trailing: Text(batch, style: Theme.of(context).textTheme.bodySmall)),
        GridView.count(crossAxisCount: 2, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(), mainAxisSpacing: SinaatySpace.md, crossAxisSpacing: SinaatySpace.md, childAspectRatio: .68, children: [for (final r in rows) _LabelTile(label: r, partName: partName)]),
      ]);
    }));
  }
}

class _LabelTile extends StatelessWidget {
  final PartLabel label; final String? partName;
  const _LabelTile({required this.label, this.partName});
  @override Widget build(BuildContext context) {
    final l = L10n.of(context); final t = Theme.of(context).textTheme; final c = Theme.of(context).colorScheme;
    // الرمز يحمل الـtoken وحده: هو ما يقرؤه ماسح التركيب في التطبيق وما يتحقّق منه الخادم علناً.
    return SectionCard(padding: const EdgeInsets.all(SinaatySpace.md), child: Column(children: [
      Container(padding: const EdgeInsets.all(6), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10)), child: QrImageView(data: label.qrToken, size: 118, backgroundColor: Colors.white, padding: EdgeInsets.zero)),
      const SizedBox(height: SinaatySpace.sm),
      if (partName != null && partName!.isNotEmpty) Text(partName!, style: t.titleSmall, maxLines: 1, overflow: TextOverflow.ellipsis, textAlign: TextAlign.center),
      Text(label.serialNumber, style: t.bodySmall?.copyWith(fontFeatures: const [FontFeature.tabularFigures()]), maxLines: 1, overflow: TextOverflow.ellipsis, textDirection: TextDirection.ltr),
      const SizedBox(height: 6),
      Text(l.spScanToVerify, style: t.labelSmall?.copyWith(color: c.onSurfaceVariant)),
    ]));
  }
}
