import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/format/format.dart';
import '../domain/service_request.dart';

/// خريطة العروض: سيارة العميل في المركز، وكل ورشةٍ قدّمت عرضاً دبّوسٌ حيث هي فعلاً — بالاتجاه
/// والمسافة — وعليه سعرها. تجيب عن السؤال الذي لا تجيب عنه القائمة: «هذه الأرخص… لكن كم تبعد؟»
///
/// **لماذا خريطة مسافاتٍ لا خريطة شوارع:** بلاطات الخرائط تُطلب من خادمٍ خارجي، وكل طلب بلاطة
/// يكشف موقع العميل التقريبي لطرفٍ ثالث — وقرار إقامة البيانات (§5.4) يسبق أي مزوّد خرائط.
/// الحلقات هنا تُرسم محلياً من إحداثياتٍ يملكها الخادم نفسه: لا بلاطات، لا مفتاح، لا تسريب.
/// حين يُتخذ قرار مزوّد الخرائط تُستبدل هذه الطبقة بطبقة شوارع والدبابيس هي هي.
class OfferMap extends StatelessWidget {
  final double centerLat, centerLng;
  final List<ServiceOffer> offers;
  final String? selectedId;
  final ValueChanged<ServiceOffer> onSelect;
  const OfferMap({super.key, required this.centerLat, required this.centerLng, required this.offers, this.selectedId, required this.onSelect});

  /// إزاحة الورشة عن السيارة بالكيلومتر (شرقاً، شمالاً) — تقريب المستوي يكفي لعشرات الكيلومترات.
  static (double dx, double dy) _offsetKm(double lat0, double lng0, double lat, double lng) {
    const kmPerDeg = 111.32;
    final dy = (lat - lat0) * kmPerDeg;
    final dx = (lng - lng0) * kmPerDeg * math.cos(lat0 * math.pi / 180);
    return (dx, dy);
  }

  /// نصف قطر الخريطة: أبعد عرضٍ مرفوعاً إلى رقمٍ «نظيف» (٥ · ١٠ · ٢٥ · ٥٠ · ١٠٠ كم) فتُقرأ الحلقات.
  static double _radiusKm(Iterable<double> distances) {
    final far = distances.fold<double>(0, math.max);
    for (final r in const [5.0, 10.0, 25.0, 50.0, 100.0]) { if (far <= r * .92) return r; }
    return (far * 1.1).ceilToDouble();
  }

  @override Widget build(BuildContext context) {
    final l = L10n.of(context); final t = Theme.of(context).textTheme;
    final locale = Localizations.localeOf(context).languageCode;
    final pinned = offers.where((o) => o.hasPin).toList();
    final off = [for (final o in pinned) _offsetKm(centerLat, centerLng, o.lat!, o.lng!)];
    final radius = _radiusKm(off.map((p) => math.sqrt(p.$1 * p.$1 + p.$2 * p.$2)));
    final unpinned = offers.length - pinned.length;

    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      AspectRatio(aspectRatio: 1, child: LayoutBuilder(builder: (context, box) {
        final size = box.maxWidth; final c = size / 2; final scale = (c - 28) / radius;   // 28px: يبقى الدبّوس داخل الإطار
        return Stack(clipBehavior: Clip.none, children: [
          Positioned.fill(child: CustomPaint(painter: _RingsPainter(radiusKm: radius, kmLabel: (km) => l.drvKm(km.toStringAsFixed(km < 10 ? 1 : 0)), textStyle: t.bodySmall!))),
          // السيارة في المركز
          Positioned(left: c - 16, top: c - 16, child: Container(width: 32, height: 32,
              decoration: BoxDecoration(shape: BoxShape.circle, color: SinaatyColors.sealDeep, border: Border.all(color: Colors.white, width: 2)),
              child: const Icon(Icons.directions_car, size: 18, color: Colors.white))),
          for (var i = 0; i < pinned.length; i++)
            _Pin(
              // الشمال إلى أعلى، والشرق إلى اليمين — كما تُقرأ أي خريطة. الإطار لا يتأثر بـ RTL.
              x: c + off[i].$1 * scale, y: c - off[i].$2 * scale,
              offer: pinned[i], selected: pinned[i].id == selectedId, locale: locale, onTap: () => onSelect(pinned[i]),
            ),
        ]);
      })),
      const SizedBox(height: SinaatySpace.sm),
      Text(unpinned > 0 ? l.srMapNoPin(unpinned) : l.srMapNote, style: t.bodySmall?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant)),
    ]);
  }
}

class _Pin extends StatelessWidget {
  final double x, y; final ServiceOffer offer; final bool selected; final String locale; final VoidCallback onTap;
  const _Pin({required this.x, required this.y, required this.offer, required this.selected, required this.locale, required this.onTap});
  @override Widget build(BuildContext context) {
    final price = offer.priceMin == null ? null : Fmt.money(offer.priceMin!, locale: locale).split(' ').first;
    final label = price ?? (offer.freeInspection ? L10n.of(context).srMapFree : '—');
    final bg = selected ? SinaatyColors.seal : Colors.white;
    final fg = selected ? Colors.white : SinaatyColors.sealDeep;
    // الدبّوس مركّزٌ على نقطته أفقياً، وقاعدته على النقطة رأسياً — حيث الورشة بالضبط.
    return Positioned(left: x - 40, top: y - 34, width: 80, child: GestureDetector(onTap: onTap, child: Column(mainAxisSize: MainAxisSize.min, children: [
      AnimatedContainer(duration: const Duration(milliseconds: 180), padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999), border: Border.all(color: SinaatyColors.seal, width: selected ? 0 : 1.2),
            boxShadow: [BoxShadow(color: SinaatyColors.sealDeep.withValues(alpha: .18), blurRadius: 8, offset: const Offset(0, 3))]),
        child: Text(label, style: TextStyle(color: fg, fontWeight: FontWeight.w700, fontSize: 12, fontFeatures: const [FontFeature.tabularFigures()]), maxLines: 1, overflow: TextOverflow.ellipsis)),
      Container(width: 8, height: 8, decoration: BoxDecoration(shape: BoxShape.circle, color: SinaatyColors.seal, border: Border.all(color: Colors.white, width: 1.5))),
    ])));
  }
}

/// الحلقات: ثلاث دوائر بمسافاتها، وخطّا محاور خافتان — أرضية هادئة لا تنافس الدبابيس.
class _RingsPainter extends CustomPainter {
  final double radiusKm; final String Function(double km) kmLabel; final TextStyle textStyle;
  _RingsPainter({required this.radiusKm, required this.kmLabel, required this.textStyle});
  @override void paint(Canvas canvas, Size size) {
    final c = Offset(size.width / 2, size.height / 2); final r = size.width / 2 - 28;
    canvas.drawCircle(c, size.width / 2, Paint()..color = SinaatyColors.paper2);
    final ring = Paint()..color = SinaatyColors.line..style = PaintingStyle.stroke..strokeWidth = 1;
    final axis = Paint()..color = SinaatyColors.line.withValues(alpha: .6)..strokeWidth = 1;
    canvas.drawLine(Offset(c.dx, c.dy - r), Offset(c.dx, c.dy + r), axis);
    canvas.drawLine(Offset(c.dx - r, c.dy), Offset(c.dx + r, c.dy), axis);
    for (final f in const [1 / 3, 2 / 3, 1.0]) {
      canvas.drawCircle(c, r * f, ring);
      final tp = TextPainter(text: TextSpan(text: kmLabel(radiusKm * f), style: textStyle.copyWith(color: SinaatyColors.muted, fontSize: 10)), textDirection: TextDirection.ltr)..layout();
      tp.paint(canvas, Offset(c.dx + 4, c.dy - r * f - tp.height - 1));
    }
  }
  @override bool shouldRepaint(_RingsPainter old) => old.radiusKm != radiusKm;
}
