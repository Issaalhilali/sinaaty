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
    // أيقوناتُ البيت المرسومة لا Material الجاهزة — «السلايدرز» لقطعة الغيار كانت تقول قالباً
    // ست خدماتٍ لا ثلاث — والثلاث الجديدة أبوابٌ لمسارٍ **عامل** (طلب إصلاحٍ بوصفٍ مكتوبٍ
    // سلفاً تستقبله الورش وتسعّره)، لا أزرارٌ تَعِد بما لم يُبنَ. وهي أكثر ما يُطلب فعلاً في
    // السوق السعودي: فحصُ ما قبل الشراء، والصيانة الدورية، والبطارية على الطريق.
    final items = <({BrandGlyph icon, String label, String? body, VoidCallback onTap})>[
      if (flags.enabled(Flags.serviceMarketplace))
        (icon: BrandGlyph.carRepair, label: l.srvFix, body: l.srFixBody, onTap: () => openFixCarSheet(context, ref, vehicles)),
      if (flags.enabled(Flags.partsMarketplace))
        (icon: BrandGlyph.gear, label: l.srvPart, body: l.reqPartBody, onTap: () => openPartRequestSheet(context, ref, vehicles)),
      if (flags.enabled(Flags.tow))
        (icon: BrandGlyph.towTruck, label: l.srvTow, body: l.reqTowBody, onTap: () => context.push('/tow/new')),
      if (flags.enabled(Flags.serviceMarketplace)) ...[
        (icon: BrandGlyph.shieldSeal, label: l.srvInspect, body: l.srvInspectBody, onTap: () => openFixCarSheet(context, ref, vehicles, preset: l.srvPresetInspect)),
        (icon: BrandGlyph.symService, label: l.srvService, body: l.srvServiceBody, onTap: () => openFixCarSheet(context, ref, vehicles, preset: l.srvPresetService)),
        (icon: BrandGlyph.symBolt, label: l.srvRoadside, body: l.srvRoadsideBody, onTap: () => openFixCarSheet(context, ref, vehicles, preset: l.srvPresetRoadside)),
      ],
    ];
    if (items.isEmpty) return const SizedBox.shrink();
    // الحلقة أولاً: إصلاح · قطعة · سطحة على ورقة واحدة بثلاثة أبواب متساوية. ما عداها خدماتٌ نادرة
    // (فحص قبل الشراء، صيانة دورية، بطارية وطريق) تُطلب من «خدمات أخرى» — لا ست بطاقات متطابقة تنافس
    // البطل وتساوي بين ما يُطلب كل يوم وما يُطلب كل عام (design-audit/UX_PROBLEMS.md §1، القرار D4).
    final primary = items.take(3).toList(); final extras = items.skip(3).toList();
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      SectionTitle(l.servicesTitle, trailing: extras.isEmpty ? null : TextButton(onPressed: () => _showExtras(context, extras), child: Text(l.srvMore))),
      SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.xs, vertical: SinaatySpace.sm), child: Row(children: [
        for (final it in primary) Expanded(child: _Door(icon: it.icon, label: it.label, onTap: it.onTap)),
      ])),
    ]);
  }

  static Future<void> _showExtras(BuildContext context, List<({BrandGlyph icon, String label, String? body, VoidCallback onTap})> extras) {
    final l = L10n.of(context);
    return showModalBottomSheet<void>(context: context, showDragHandle: true, builder: (ctx) => SheetBody(child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Text(l.srvMoreTitle, style: Theme.of(ctx).textTheme.titleLarge), const SizedBox(height: SinaatySpace.sm),
      RowGroup(children: [for (final e in extras) AppListRow(brandIcon: e.icon, title: e.label, subtitle: e.body, onTap: () { Navigator.pop(ctx); e.onTap(); })]),
    ])));
  }
}

/// بابٌ من ثلاثة: أيقونة العلامة في دائرة الختم الناعمة، والاسم تحتها بسطرين كحدٍّ أقصى.
class _Door extends StatelessWidget {
  final BrandGlyph icon; final String label; final VoidCallback onTap;
  const _Door({required this.icon, required this.label, required this.onTap});
  @override Widget build(BuildContext context) {
    final s = Theme.of(context).colorScheme; final t = Theme.of(context).textTheme;
    return InkWell(onTap: onTap, borderRadius: BorderRadius.circular(SinaatySpace.radius), child: Padding(padding: const EdgeInsets.symmetric(vertical: SinaatySpace.md, horizontal: SinaatySpace.xs), child: Column(mainAxisSize: MainAxisSize.min, children: [
      Container(width: 56, height: 56, alignment: Alignment.center, decoration: BoxDecoration(shape: BoxShape.circle, color: s.primaryContainer), child: BrandIcon(icon, size: 30, color: s.primary, accent: SinaatyColors.brass)),
      const SizedBox(height: SinaatySpace.sm),
      Text(label, style: t.titleSmall, maxLines: 2, overflow: TextOverflow.ellipsis, textAlign: TextAlign.center),
    ])));
  }
}
