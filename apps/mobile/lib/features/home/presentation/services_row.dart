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
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      SectionTitle(l.servicesTitle),
      // شبكةٌ من ثلاثة أعمدة: ستُّ خدماتٍ في صفّين متساويي الارتفاع بلا حسابٍ يدوي.
      GridView.count(
        crossAxisCount: 3, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
        mainAxisSpacing: SinaatySpace.md, crossAxisSpacing: SinaatySpace.md, childAspectRatio: .84,
        children: [for (final s in items) _Tile(icon: s.icon, label: s.label, body: null, onTap: s.onTap)],
      ),
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
          // `mainAxisSize.min` + `Flexible` على النص: البلاطة تفيض ٧٫٥px على المقاسات التي
          // يكبر فيها الخط (تكبير النظام، أو شاشة أضيق) — والمرونة تحلّها بلا رقمٍ سحري.
          child: Column(mainAxisSize: MainAxisSize.min, mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.center, children: [
            // أيقونةٌ على قرصٍ متدرّج بلون الهوية بدل مربّعٍ باهتٍ بخطٍّ رفيع: الحجم أكبر،
            // والتباين أقوى، والقرص يعطي الأيقونة وزناً تراه العين من بعيد (كلمة المالك:
            // غيّر الأيقونات للأفضل). لا ظلال — تدرّجٌ ولمسةُ نحاسٍ واحدة.
            Container(
              width: 56, height: 56, alignment: Alignment.center,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(begin: Alignment.topRight, end: Alignment.bottomLeft,
                    colors: [s.primary, SinaatyColors.sealInk]),
              ),
              child: BrandIcon(icon, size: 30, color: Colors.white, accent: SinaatyColors.brass),
            ),
            const SizedBox(height: SinaatySpace.sm),
            // «فحص قبل الشراء» لا يسع ثلث العرض في سطر: سطران يحفظان الاسم كاملاً — وبتره
            // إلى «فحص قبل الشـ...» يخفي الخدمة نفسها (نفس درس بطاقات الأمر).
            Flexible(child: Text(label, style: t.titleSmall, maxLines: 2, overflow: TextOverflow.ellipsis, textAlign: TextAlign.center)),
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
