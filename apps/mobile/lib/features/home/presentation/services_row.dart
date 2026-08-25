import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/flags/feature_flags.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../../parts/presentation/part_request_sheet.dart';
import '../../service_market/presentation/fix_car_sheet.dart';
import '../../vehicles/domain/vehicle.dart';
import '../../vehicles/presentation/providers.dart';

/// ما تقدّمه المنصة، على الصفحة الأولى.
///
/// كانت الشاشة تعرض **حال** سيارات العميل ولا تقول ما يستطيع طلبه: من يفتح التطبيق أول مرة يرى
/// «لا توجد سيارات بعد» وزراً واحداً، فلا يعرف أن هنا إصلاحاً بعروض، وقطعةً بمزاد، وسطحة (ملاحظة
/// المالك ٢٥ أغسطس ٢٠٢٦). صفٌّ واحد هادئ لا لوحة خدمات: أيقونة واسم، ونقرة تفتح المسار نفسه الذي
/// يفتحه تبويب «اطلب» — لا نسخة ثانية تتباعد عنه.
///
/// والأعلام تحكم: خدمة مغلقة لا تظهر أصلاً (§5.0 #3) — لا نَعِد بما لا نستطيع تقديمه اليوم.
class ServicesRow extends ConsumerWidget {
  /// على شاشة فارغة نشرح أكثر؛ وفوق قائمة مزدحمة نكتفي بالأسماء.
  final bool expanded;
  const ServicesRow({super.key, this.expanded = false});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = L10n.of(context);
    final flags = ref.watch(featureFlagsProvider(null)).value ?? FeatureFlags.allVisible;
    final vehicles = ref.watch(vehiclesProvider).value?.valueOrNull ?? const <Vehicle>[];
    final items = <({IconData icon, String label, String? body, VoidCallback onTap})>[
      if (flags.enabled(Flags.serviceMarketplace))
        (icon: Icons.build_outlined, label: l.srFix, body: l.srFixBody, onTap: () => openFixCarSheet(context, ref, vehicles)),
      if (flags.enabled(Flags.partsMarketplace))
        (icon: Icons.settings_input_component_outlined, label: l.reqPart, body: l.reqPartBody, onTap: () => openPartRequestSheet(context, ref, vehicles)),
      if (flags.enabled(Flags.tow))
        (icon: Icons.local_shipping_outlined, label: l.reqTow, body: l.reqTowBody, onTap: () => context.push('/tow/new')),
    ];
    if (items.isEmpty) return const SizedBox.shrink();
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      SectionTitle(l.servicesTitle),
      Row(children: [
        for (final s in items) ...[
          Expanded(child: _Tile(icon: s.icon, label: s.label, body: expanded ? s.body : null, onTap: s.onTap)),
          if (s != items.last) const SizedBox(width: SinaatySpace.md),
        ],
      ]),
    ]);
  }
}

class _Tile extends StatelessWidget {
  final IconData icon; final String label; final String? body; final VoidCallback onTap;
  const _Tile({required this.icon, required this.label, this.body, required this.onTap});
  @override Widget build(BuildContext context) {
    final s = Theme.of(context).colorScheme; final t = Theme.of(context).textTheme;
    return Material(
      color: s.surface, borderRadius: BorderRadius.circular(SinaatySpace.radius),
      child: InkWell(
        onTap: onTap, borderRadius: BorderRadius.circular(SinaatySpace.radius),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.md, vertical: SinaatySpace.lg),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(
              width: 40, height: 40, alignment: Alignment.center,
              decoration: BoxDecoration(color: s.primaryContainer, borderRadius: BorderRadius.circular(12)),
              child: Icon(icon, size: 21, color: s.onPrimaryContainer),
            ),
            const SizedBox(height: SinaatySpace.sm),
            // سطران: «أطلب قطعة غيار» لا يسع ثلث العرض في سطر، وقصّه إلى «أطلب قطعة ...» يخفي الخدمة نفسها.
            Text(label, style: t.titleSmall, maxLines: 2, overflow: TextOverflow.ellipsis),
            if (body != null) ...[
              const SizedBox(height: 2),
              Text(body!, style: t.bodySmall?.copyWith(color: s.onSurfaceVariant, height: 1.4), maxLines: 3),
            ],
          ]),
        ),
      ),
    );
  }
}
