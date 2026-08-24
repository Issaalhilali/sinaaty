import 'package:flutter/material.dart';
import '../../theme/tokens.dart';
/// The signature surface (UI v2): deep seal gradient, faint geometric hatch, soft glow — carries "the most important thing now",
/// one number and one button. Text on it is white; use [SealPill] for chips and [SealButton] for the action.
class SealCard extends StatelessWidget {
  final Widget child; final EdgeInsetsGeometry padding;
  const SealCard({super.key, required this.child, this.padding = const EdgeInsets.fromLTRB(20, 18, 20, 18)});
  @override Widget build(BuildContext context) => Container(
    decoration: BoxDecoration(borderRadius: BorderRadius.circular(SinaatySpace.radiusLg + 4), boxShadow: [BoxShadow(color: SinaatyColors.sealDeep.withValues(alpha: .55), blurRadius: 40, spreadRadius: -18, offset: const Offset(0, 24))]),
    child: ClipRRect(borderRadius: BorderRadius.circular(SinaatySpace.radiusLg + 4), child: Stack(children: [
      const Positioned.fill(child: DecoratedBox(decoration: BoxDecoration(gradient: RadialGradient(center: Alignment(1, -1.2), radius: 1.6, colors: [Color(0xFF137A61), SinaatyColors.seal, SinaatyColors.sealDeep], stops: [0, .4, 1])))),
      Positioned.fill(child: CustomPaint(painter: _HatchPainter())),
      PositionedDirectional(end: -90, bottom: -140, child: Container(width: 260, height: 260, decoration: BoxDecoration(shape: BoxShape.circle, gradient: RadialGradient(colors: [SinaatyColors.dSeal.withValues(alpha: .45), SinaatyColors.dSeal.withValues(alpha: 0)], stops: const [0, .65])))),
      DefaultTextStyle.merge(style: const TextStyle(color: Colors.white), child: IconTheme.merge(data: const IconThemeData(color: Colors.white), child: Padding(padding: padding, child: child))),
    ])));
}
/// نفس سطح الختم بلا بطاقة ولا حواف — يملأ ما يُعطى له (ترويسة شاشة الدخول مثلاً).
/// الطلاء واحد لأن الهوية واحدة؛ فرقه الوحيد أنه لا يُقصّ ولا يُظلَّل.
class SealSurface extends StatelessWidget {
  final Widget child; const SealSurface({super.key, required this.child});
  @override Widget build(BuildContext context) => Stack(fit: StackFit.expand, children: [
    const DecoratedBox(decoration: BoxDecoration(gradient: RadialGradient(center: Alignment(1, -1.2), radius: 1.6, colors: [Color(0xFF137A61), SinaatyColors.seal, SinaatyColors.sealDeep], stops: [0, .4, 1]))),
    CustomPaint(painter: _HatchPainter()),
    PositionedDirectional(end: -110, top: 40, child: Container(width: 320, height: 320, decoration: BoxDecoration(shape: BoxShape.circle, gradient: RadialGradient(colors: [SinaatyColors.dSeal.withValues(alpha: .40), SinaatyColors.dSeal.withValues(alpha: 0)], stops: const [0, .65])))),
    DefaultTextStyle.merge(style: const TextStyle(color: Colors.white), child: IconTheme.merge(data: const IconThemeData(color: Colors.white), child: child)),
  ]);
}
class _HatchPainter extends CustomPainter {
  @override void paint(Canvas c, Size s) {
    final p = Paint()..color = Colors.white.withValues(alpha: .05)..strokeWidth = 1; const gap = 22.0; final n = ((s.width + s.height) / gap).ceil();
    for (var i = 0; i < n; i++) { final d = i * gap; c.drawLine(Offset(d, 0), Offset(d - s.height, s.height), p); c.drawLine(Offset(s.width - d, 0), Offset(s.width - d + s.height, s.height), p..color = Colors.white.withValues(alpha: .035)); }
    // fade the hatch towards the bottom
    c.drawRect(Offset.zero & s, Paint()..shader = LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Colors.transparent, SinaatyColors.sealDeep.withValues(alpha: .35)]).createShader(Offset.zero & s));
  }
  @override bool shouldRepaint(covariant CustomPainter _) => false;
}
/// White-on-seal action button used inside a SealCard.
class SealButton extends StatelessWidget {
  final String label; final VoidCallback? onPressed; final IconData? icon; final bool loading;
  const SealButton({super.key, required this.label, required this.onPressed, this.icon, this.loading = false});
  @override Widget build(BuildContext context) => FilledButton(style: FilledButton.styleFrom(backgroundColor: Colors.white, foregroundColor: SinaatyColors.sealDeep, minimumSize: const Size.fromHeight(52), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(SinaatySpace.radius))), onPressed: loading ? null : onPressed,
    child: loading ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2.5, color: SinaatyColors.sealDeep)) : Row(mainAxisSize: MainAxisSize.min, children: [if (icon != null) ...[Icon(icon, size: 20), const SizedBox(width: 8)], Text(label)]));
}
/// Translucent chip for SealCard.
class SealPill extends StatelessWidget {
  final String label; final IconData? icon; const SealPill(this.label, {super.key, this.icon});
  @override Widget build(BuildContext context) => Container(padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 5), decoration: BoxDecoration(color: Colors.white.withValues(alpha: .16), borderRadius: BorderRadius.circular(999)), child: Row(mainAxisSize: MainAxisSize.min, children: [if (icon != null) ...[Icon(icon, size: 13), const SizedBox(width: 5)] else ...[Container(width: 6, height: 6, decoration: const BoxDecoration(shape: BoxShape.circle, color: Colors.white)), const SizedBox(width: 6)], Text(label, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, height: 1.2))]));
}
/// Progress segments (steps done / current / upcoming) for a SealCard.
class SealSteps extends StatelessWidget {
  final int total; final int current; const SealSteps({super.key, required this.total, required this.current});
  @override Widget build(BuildContext context) => Row(children: [for (var i = 0; i < total; i++) Expanded(child: Container(height: 4, margin: EdgeInsetsDirectional.only(end: i < total - 1 ? 5 : 0), decoration: BoxDecoration(borderRadius: BorderRadius.circular(2), color: i < current ? Colors.white : i == current ? SinaatyColors.dSeal : Colors.white.withValues(alpha: .22), boxShadow: i == current ? [BoxShadow(color: SinaatyColors.dSeal.withValues(alpha: .9), blurRadius: 10)] : null)))]);
}
/// Thin budget/progress meter for a SealCard: white fill on a translucent track, glowing softly;
/// turns brass once the value nears its cap (≥ 80%) — a calm warning, not an alarm.
class SealMeter extends StatelessWidget {
  final double value; // 0..1
  const SealMeter({super.key, required this.value});
  @override Widget build(BuildContext context) {
    final v = value.clamp(0.0, 1.0).toDouble(); final near = v >= .8;
    return ClipRRect(borderRadius: BorderRadius.circular(999), child: SizedBox(height: 6, child: Stack(children: [
      Positioned.fill(child: ColoredBox(color: Colors.white.withValues(alpha: .18))),
      Positioned.fill(child: Align(alignment: AlignmentDirectional.centerStart, child: FractionallySizedBox(widthFactor: v < .02 ? .02 : v, heightFactor: 1,
        child: DecoratedBox(decoration: BoxDecoration(color: near ? SinaatyColors.dBrass : Colors.white, borderRadius: BorderRadius.circular(999), boxShadow: [BoxShadow(color: (near ? SinaatyColors.dBrass : SinaatyColors.dSeal).withValues(alpha: .8), blurRadius: 10)]))))),
    ])));
  }
}
/// Floating pill navigation (UI v2): translucent surface, rounded, 3–4 items, selected item gets a soft seal fill.
class FloatingNav extends StatelessWidget {
  final int index; final ValueChanged<int> onChanged; final List<({IconData icon, String label})> items;
  const FloatingNav({super.key, required this.index, required this.onChanged, required this.items});
  @override Widget build(BuildContext context) {
    final s = Theme.of(context).colorScheme; final dark = Theme.of(context).brightness == Brightness.dark;
    return Padding(padding: const EdgeInsets.fromLTRB(16, 0, 16, 14), child: SafeArea(top: false, child: Container(height: 68, padding: const EdgeInsets.all(6), decoration: BoxDecoration(color: s.surface.withValues(alpha: dark ? .94 : .96), borderRadius: BorderRadius.circular(26), border: Border.all(color: s.outlineVariant.withValues(alpha: .8)), boxShadow: [BoxShadow(color: SinaatyColors.ink.withValues(alpha: dark ? .6 : .18), blurRadius: 40, spreadRadius: -14, offset: const Offset(0, 20))]),
      child: Row(children: [for (var i = 0; i < items.length; i++) Expanded(child: _NavItem(item: items[i], selected: i == index, onTap: () => onChanged(i)))]))));
  }
}
class _NavItem extends StatelessWidget {
  final ({IconData icon, String label}) item; final bool selected; final VoidCallback onTap; const _NavItem({required this.item, required this.selected, required this.onTap});
  @override Widget build(BuildContext context) { final s = Theme.of(context).colorScheme; final fg = selected ? s.onPrimaryContainer : s.onSurfaceVariant;
    return InkWell(onTap: onTap, borderRadius: BorderRadius.circular(20), child: AnimatedContainer(duration: const Duration(milliseconds: 180), decoration: BoxDecoration(color: selected ? s.primaryContainer : Colors.transparent, borderRadius: BorderRadius.circular(20)), child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [Icon(item.icon, size: 22, color: fg), const SizedBox(height: 2), Text(item.label, style: TextStyle(fontSize: 11, fontWeight: selected ? FontWeight.w700 : FontWeight.w600, color: fg))]))); }
}
