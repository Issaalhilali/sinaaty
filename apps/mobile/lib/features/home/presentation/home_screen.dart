import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/format/format.dart';
import '../../../core/l10n/labels.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../../billing/presentation/due_row.dart';
import '../../service_market/domain/service_request.dart' show NearbyShop;
import '../../service_market/presentation/nearby_shops_strip.dart';
import '../../service_market/presentation/fix_car_sheet.dart';
import '../../service_market/presentation/providers.dart' as sm;
import '../../vehicles/domain/vehicle.dart';
import '../../vehicles/presentation/providers.dart';
import '../../vehicles/presentation/vehicles_screen.dart' show WorkOrderCard;
import '../../work_orders/domain/work_order.dart';
import '../../work_orders/presentation/providers.dart';
import 'services_row.dart';

/// شاشة الهبوط.
///
/// كانت «سياراتي»: ثلاث بطاقات وصفُّ سيارةٍ بارد، ثم **ستون بالمئة سوادٌ فارغ**. والفراغ هنا ليس
/// هدوءاً — يقول «لا يوجد سوق». وكان تبويب «اطلب» يحمل نفس «ماذا تحتاج؟» فتبويبان لوظيفة واحدة.
///
/// الترتيب هو الرسالة، من الأعجل إلى الأبعد:
///   ١. **مستحقّ عليك** — للمال إنذارٌ ومسار تنفيذ، وما سواه ينتظر.
///   ٢. **ما يجري على سيارتك الآن** — بطاقة الختم بزرّها الواحد.
///   ٣. **ما الذي تحتاجه** — وإن لم يكن شيءٌ جارياً تصدّرت هذه بحجمها الكامل.
///   ٤. **ورشٌ حولك** — يرى السوق قبل أن يسأل: «أمرّ على الورش واحدة واحدة» هي الشكوى الأصل.
///   ٥. **سياراتك**.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override Widget build(BuildContext context, WidgetRef ref) {
    final l = L10n.of(context); final t = Theme.of(context).textTheme;
    final locale = Localizations.localeOf(context).languageCode;
    final vehicles = ref.watch(vehiclesProvider).value?.valueOrNull ?? const <Vehicle>[];
    final orders = ref.watch(workOrdersProvider).value?.valueOrNull ?? const <WorkOrder>[];
    final shops = ref.watch(sm.nearbyShopsProvider).value ?? const <NearbyShop>[];
    final live = orders.where((w) => w.isActive).toList();

    Future<void> refresh() async {
      ref.invalidate(vehiclesProvider); ref.invalidate(workOrdersProvider); ref.invalidate(sm.nearbyShopsProvider);
    }

    return RefreshIndicator(onRefresh: refresh, child: ListView(
      padding: EdgeInsets.fromLTRB(SinaatySpace.lg, SinaatySpace.sm, SinaatySpace.lg, SinaatySpace.bottomClearance(context)),
      children: [
        const DueRow(),

        if (live.isNotEmpty) ...[
          SectionTitle(l.activeOrders),
          // **بطلٌ واحد فقط.** بطاقتان خضراوان ضخمتان فوق بعضهما تأكلان نصف الشاشة، وحين يكون كل
          // شيء بطلاً لا بطل — والعين لا تجد مكاناً تستريح فيه. الأعجل يأخذ سطح الختم، والبقية
          // صفوفٌ هادئة تُقرأ في سطر ويُنقر عليها.
          WorkOrderCard(order: live.first, vehicle: vehicles.where((v) => v.id == live.first.vehicleId).firstOrNull,
              onTap: () => context.push('/work-orders/${live.first.id}')),
          if (live.length > 1) ...[
            const SizedBox(height: SinaatySpace.md),
            SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm, vertical: SinaatySpace.xs),
              child: Column(children: [
                for (final w in live.skip(1))
                  AppListRow(
                    icon: Icons.build_circle_outlined,
                    title: w.titleAr ?? l.workOrder,
                    subtitle: Fmt.meta([vehicles.where((v) => v.id == w.vehicleId).firstOrNull?.title, Fmt.money(w.total, locale: locale)]),
                    trailing: StatusBadge(Labels.woStatus(l, w.status), tone: w.awaitingApproval ? BadgeTone.brass : BadgeTone.plain),
                    onTap: () => context.push('/work-orders/${w.id}')),
              ])),
          ],
          const SizedBox(height: SinaatySpace.lg),
          const ServicesRow(),
        ] else
          // لا شيء جارٍ: السؤال نفسه يتصدّر بحجمه الكامل بدل صفٍّ صغير فوق فراغ.
          _AskHero(vehicles: vehicles),

        if (shops.isNotEmpty) ...[
          const SizedBox(height: SinaatySpace.xl),
          NearbyShopsStrip(shops: shops, onAsk: (_) => openFixCarSheet(context, ref, vehicles)),
        ],

        const SizedBox(height: SinaatySpace.xl),
        SectionTitle(l.myCars, trailing: TextButton.icon(onPressed: () => context.push('/vehicles/add'),
            icon: const Icon(Icons.add, size: 18), label: Text(l.addCar))),
        if (vehicles.isEmpty)
          EmptyState(icon: Icons.directions_car_outlined, title: l.emptyCarsTitle, body: l.emptyCarsBody,
              actionLabel: l.addCar, onAction: () => context.push('/vehicles/add'))
        else
          SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm, vertical: SinaatySpace.xs),
            child: Column(children: [
              for (final v in vehicles)
                AppListRow(icon: Icons.directions_car_outlined, title: v.title, subtitle: v.subtitle,
                    onTap: () => context.push('/vehicles/${v.id}')),
            ])),
        SizedBox(height: t.bodySmall == null ? 0 : SinaatySpace.lg),
      ],
    ));
  }
}

/// السؤال حين لا شيء يجري — سطح الختم، وسؤالٌ بلسان صاحب السيارة، وخدماتٌ تحته.
class _AskHero extends ConsumerWidget {
  final List<Vehicle> vehicles;
  const _AskHero({required this.vehicles});

  @override Widget build(BuildContext context, WidgetRef ref) {
    final l = L10n.of(context); final t = Theme.of(context).textTheme;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      SealCard(child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text(l.reqFixHero, style: t.headlineSmall?.copyWith(color: Colors.white)),
        const SizedBox(height: 6),
        Text(l.reqFixHeroBody, style: t.bodyMedium?.copyWith(color: Colors.white.withValues(alpha: .82), height: 1.55)),
        const SizedBox(height: SinaatySpace.lg),
        SealButton(label: l.srFix, icon: Icons.build_outlined, onPressed: () => openFixCarSheet(context, ref, vehicles)),
      ])),
      const SizedBox(height: SinaatySpace.lg),
      const ServicesRow(),
    ]);
  }
}
