import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../domain/service_request.dart';

/// شريط الورش القريبة على الصفحة الرئيسية.
///
/// كانت الصفحة قائمةَ أزرار: تفتحها فلا ترى سوقاً ولا تعرف أنّ حولك أحداً. وهذا هو **جوهر** ما
/// يشتكي منه صاحب السيارة: «أمرّ على الورش واحدة واحدة». فليرَ من حوله قبل أن يسأل — بأسماء
/// حقيقية وتقييمات ومسافات من نقطة الاكتشاف نفسها، لا بطاقاتِ زينة.
///
/// و«متخصّصة بسيارتك» تسبق «قريبة منك» في الترتيب: صاحب التويوتا يريد من يعرف التويوتا.
class NearbyShopsStrip extends ConsumerWidget {
  final List<NearbyShop> shops;
  final void Function(NearbyShop) onAsk;
  const NearbyShopsStrip({super.key, required this.shops, required this.onAsk});

  @override Widget build(BuildContext context, WidgetRef ref) {
    if (shops.isEmpty) return const SizedBox.shrink();
    final l = L10n.of(context);
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      SectionTitle(l.reqNearby),
      SizedBox(height: 168, child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 2),
        itemCount: shops.length,
        separatorBuilder: (_, _) => const SizedBox(width: SinaatySpace.md),
        itemBuilder: (_, i) => _ShopCard(shop: shops[i], onAsk: () => onAsk(shops[i])),
      )),
    ]);
  }
}

class _ShopCard extends StatelessWidget {
  final NearbyShop shop; final VoidCallback onAsk;
  const _ShopCard({required this.shop, required this.onAsk});

  @override Widget build(BuildContext context) {
    final l = L10n.of(context); final t = Theme.of(context).textTheme; final cs = Theme.of(context).colorScheme;
    return SizedBox(width: 232, child: SectionCard(onTap: onAsk, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Container(width: 38, height: 38, decoration: BoxDecoration(color: cs.primaryContainer, borderRadius: BorderRadius.circular(12)),
            child: Icon(Icons.storefront_outlined, size: 20, color: cs.onPrimaryContainer)),
        const SizedBox(width: SinaatySpace.sm),
        // التقييم رقمٌ فقط حين يكون له معنى: «0.0 من 0» أسوأ من لا شيء — تبدو الورشة سيئة وهي جديدة.
        if (shop.isRated)
          Row(children: [
            Icon(Icons.star_rounded, size: 16, color: cs.secondary),
            const SizedBox(width: 2),
            Text(shop.rating.toStringAsFixed(1), style: t.titleSmall),
            Text(' (${shop.ratingCount})', style: t.labelSmall?.copyWith(color: cs.onSurfaceVariant)),
          ])
        else
          StatusBadge(l.reqNearbyNew, tone: BadgeTone.plain),
      ]),
      const SizedBox(height: SinaatySpace.sm),
      Text(shop.nameAr, maxLines: 2, overflow: TextOverflow.ellipsis, style: t.titleSmall),
      const SizedBox(height: 2),
      Text([
        if (shop.distanceKm != null) '${shop.distanceKm!.toStringAsFixed(1)} كم',
        if (shop.city != null) shop.city!,
      ].join(' · '), style: t.labelSmall?.copyWith(color: cs.onSurfaceVariant)),
      const Spacer(),
      if (shop.specialised) StatusBadge(l.reqNearbySpecialised, tone: BadgeTone.seal, icon: Icons.verified_outlined),
    ])));
  }
}
