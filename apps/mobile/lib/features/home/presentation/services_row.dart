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
    final items = <({BrandGlyph icon, String label, String? body, VoidCallback onTap})>[
      if (flags.enabled(Flags.serviceMarketplace))
        (icon: BrandGlyph.carRepair, label: l.srvFix, body: l.srFixBody, onTap: () => openFixCarSheet(context, ref, vehicles)),
      if (flags.enabled(Flags.partsMarketplace))
        (icon: BrandGlyph.gear, label: l.srvPart, body: l.reqPartBody, onTap: () => openPartRequestSheet(context, ref, vehicles)),
      if (flags.enabled(Flags.tow))
        (icon: BrandGlyph.towTruck, label: l.srvTow, body: l.reqTowBody, onTap: () => context.push('/tow/new')),
    ];
    if (items.isEmpty) return const SizedBox.shrink();
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      SectionTitle(l.servicesTitle),
      // بطاقاتٌ متساوية الارتفاع: «أطلب قطعة غيار» يلتفّ سطرين فكان يعلو أخويه — عدم اتساقٍ
      // تراه العين قبل أن تقرأ. IntrinsicHeight يجعل الثلاث بارتفاع أطولهنّ.
      IntrinsicHeight(child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        for (final s in items) ...[
          Expanded(child: _Tile(icon: s.icon, label: s.label, body: expanded ? s.body : null, onTap: s.onTap)),
          if (s != items.last) const SizedBox(width: SinaatySpace.md),
        ],
      ])),
    ]);
  }
}

class _Tile extends StatelessWidget {
  final BrandGlyph icon; final String label; final String? body; final VoidCallback onTap;
  const _Tile({required this.icon, required this.label, this.body, required this.onTap});
  @override Widget build(BuildContext context) {
    final s = Theme.of(context).colorScheme; final t = Theme.of(context).textTheme;
    return Material(
      color: s.surface, borderRadius: BorderRadius.circular(SinaatySpace.radius),
      child: InkWell(
        onTap: onTap, borderRadius: BorderRadius.circular(SinaatySpace.radius),
        // ثلاثُ بطاقاتٍ **متطابقة**: أيقونة في الوسط واسمٌ من كلمةٍ تحتها. الأسماء الطويلة
        // («أطلب قطعة غيار») كانت تلتفّ سطرين فتعلو البطاقةُ أختيها ويختلّ الصف كله؛
        // والاسم القصير يقول الخدمة نفسها. (كلمة المالك: غير متوازنة ونفس الأسلوب.)
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm, vertical: SinaatySpace.lg),
          child: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.center, children: [
            Container(
              width: 46, height: 46, alignment: Alignment.center,
              decoration: BoxDecoration(color: s.primaryContainer, borderRadius: BorderRadius.circular(14)),
              child: BrandIcon(icon, size: 26, color: s.onPrimaryContainer),
            ),
            const SizedBox(height: SinaatySpace.sm),
            Text(label, style: t.titleSmall, maxLines: 1, overflow: TextOverflow.ellipsis, textAlign: TextAlign.center),
            if (body != null) ...[
              const SizedBox(height: 2),
              Text(body!, style: t.bodySmall?.copyWith(color: s.onSurfaceVariant, height: 1.4), maxLines: 2, textAlign: TextAlign.center),
            ],
          ]),
        ),
      ),
    );
  }
}
