import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/di/core_providers.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';

/// أول نَفَسٍ للتطبيق — ثلاثة وعود قبل أن يُطلب منه شيء.
///
/// تُرسم على سطح الختم نفسه الذي يحمل هوية كل شاشة (لا سوادٍ فارغ)، ولكل وعدٍ **مشهدٌ مرسوم**
/// بألوان الهوية — بطاقة طلبٍ تشعّ نحو الورش، ريالٌ خلف قفل، ورقةٌ مختومة بختمٍ نحاسي — لا
/// أيقونة جاهزة تفضح قالباً. وتُرى مرةً واحدة: من عرف لماذا لا يُحاضَر فيه ثانية.
class WelcomeScreen extends ConsumerStatefulWidget {
  const WelcomeScreen({super.key});
  static const seenKey = 'welcome_seen_v1';
  @override ConsumerState<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends ConsumerState<WelcomeScreen> {
  final _page = PageController();
  int _i = 0;

  Future<void> _start() async {
    ref.read(welcomeSeenProvider.notifier).mark();                          // الحارس يقرأ هذا فوراً
    unawaited(SharedPreferences.getInstance().then((p) => p.setBool(WelcomeScreen.seenKey, true)));
    if (mounted) context.go('/login');
  }

  @override void dispose() { _page.dispose(); super.dispose(); }

  @override Widget build(BuildContext context) {
    final l = L10n.of(context); final t = Theme.of(context);
    final slides = [
      (const _SceneRequest(), l.welcome1Title, l.welcome1Body),
      (const _SceneEscrow(), l.welcome2Title, l.welcome2Body),
      (const _SceneSealed(), l.welcome3Title, l.welcome3Body),
    ];
    final last = _i == slides.length - 1;
    return Scaffold(body: SealSurface(child: SafeArea(child: Column(children: [
      // سطرٌ واحد يحمل الهوية والفرار معاً — لا شيء يطفو وحده
      Padding(
        padding: const EdgeInsets.fromLTRB(SinaatySpace.lg, SinaatySpace.md, SinaatySpace.lg, 0),
        child: Row(children: [
          const BrandMark(size: 34),
          const SizedBox(width: 10),
          Text(l.appName, style: t.textTheme.titleLarge?.copyWith(color: Colors.white, fontWeight: FontWeight.w800, letterSpacing: .2)),
          const Spacer(),
          TextButton(onPressed: _start, style: TextButton.styleFrom(foregroundColor: Colors.white.withValues(alpha: .65)), child: Text(l.welcomeSkip)),
        ]),
      ),
      Expanded(child: PageView.builder(
        controller: _page, itemCount: slides.length,
        onPageChanged: (i) => setState(() => _i = i),
        itemBuilder: (_, i) {
          final s = slides[i];
          return Padding(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.xl), child: Column(children: [
            // المشهد يملك النصف الأعلى — مركّزاً، لا قرصاً تائهاً في فراغ
            Expanded(flex: 11, child: Center(child: SizedBox(width: 250, height: 250, child: s.$1))),
            // والنص يملك النصف الأدنى بميزانٍ ثابت بين البطاقات الثلاث
            Expanded(flex: 9, child: Column(children: [
              Text(s.$2, textAlign: TextAlign.center,
                  style: t.textTheme.headlineMedium?.copyWith(color: Colors.white, fontWeight: FontWeight.w800, height: 1.35)),
              const SizedBox(height: SinaatySpace.md),
              ConstrainedBox(constraints: const BoxConstraints(maxWidth: 340), child: Text(s.$3, textAlign: TextAlign.center,
                  style: t.textTheme.bodyLarge?.copyWith(color: Colors.white.withValues(alpha: .78), height: 1.85))),
            ])),
          ]));
        },
      )),
      Row(mainAxisAlignment: MainAxisAlignment.center, children: [
        for (var i = 0; i < slides.length; i++)
          AnimatedContainer(duration: const Duration(milliseconds: 200), margin: const EdgeInsets.symmetric(horizontal: 3.5),
            width: i == _i ? 24 : 7, height: 7,
            decoration: BoxDecoration(color: i == _i ? const Color(0xFFD2A860) : Colors.white.withValues(alpha: .3), borderRadius: BorderRadius.circular(4))),
      ]),
      Padding(padding: const EdgeInsets.fromLTRB(SinaatySpace.xl, SinaatySpace.lg, SinaatySpace.xl, SinaatySpace.lg),
        child: SizedBox(width: double.infinity, child: SealButton(
          label: last ? l.welcomeStart : l.welcomeNext,
          onPressed: last ? _start : () => _page.nextPage(duration: const Duration(milliseconds: 280), curve: Curves.easeOutCubic),
        ))),
    ]))));
  }
}

// ─── المشاهد الثلاثة — مرسومة بألوان الهوية، لا أيقونات جاهزة ───────────────────────────

const _ink = Colors.white;
const _brass = Color(0xFFD2A860);
const _mint = Color(0xFF7ACDB0);

Paint _stroke(Color c, [double w = 2]) => Paint()..color = c..style = PaintingStyle.stroke..strokeWidth = w..strokeCap = StrokeCap.round;
Paint _fill(Color c) => Paint()..color = c;

/// وعد ١ — بطاقة طلبٍ تشعّ: طلبك يخرج منك ويصل الورش القريبة من حولك.
class _SceneRequest extends StatelessWidget {
  const _SceneRequest();
  @override Widget build(BuildContext context) => CustomPaint(painter: _RequestPainter());
}

class _RequestPainter extends CustomPainter {
  @override void paint(Canvas c, Size s) {
    final center = Offset(s.width / 2, s.height / 2);
    // موجات الوصول — تتسع وتخفت
    for (final (r, a) in [(78.0, .28), (104.0, .16), (128.0, .08)]) {
      c.drawCircle(center, r, _stroke(_ink.withValues(alpha: a), 1.4));
    }
    // الورش على أطراف الموجات — نقاطٌ أضاءها الطلب، إحداها نحاسية (الفائزة)
    for (final (ang, rr, col, dot) in [(-.6, 104.0, _mint, 5.0), (2.4, 128.0, Colors.white70, 4.0), (3.9, 104.0, _brass, 6.0)]) {
      final p = center + Offset(math.cos(ang) * rr, math.sin(ang) * rr);
      c.drawCircle(p, dot + 6, _fill(col.withValues(alpha: .15)));
      c.drawCircle(p, dot, _fill(col));
    }
    // بطاقة الطلب في القلب — زجاجية بحدٍّ مضيء وثلاثة أسطر
    final card = RRect.fromRectAndRadius(Rect.fromCenter(center: center, width: 118, height: 88), const Radius.circular(18));
    c.drawRRect(card.shift(const Offset(0, 10)).inflate(2), _fill(Colors.black.withValues(alpha: .18)));
    c.drawRRect(card, _fill(_ink.withValues(alpha: .12)));
    c.drawRRect(card, _stroke(_ink.withValues(alpha: .8), 1.8));
    final lineX = center.dx + 38; final y0 = center.dy - 22;
    for (final (dy, w, a) in [(0.0, 62.0, .9), (18.0, 44.0, .55), (36.0, 52.0, .55)]) {
      c.drawLine(Offset(lineX, y0 + dy), Offset(lineX - w, y0 + dy), _stroke(_ink.withValues(alpha: a), 5));
    }
    // نبضة إرسال أعلى البطاقة — قوسان نحاسيان
    c.drawArc(Rect.fromCircle(center: center - const Offset(0, 62), radius: 12), math.pi * 1.15, math.pi * .7, false, _stroke(_brass, 2.4));
    c.drawArc(Rect.fromCircle(center: center - const Offset(0, 62), radius: 19), math.pi * 1.2, math.pi * .6, false, _stroke(_brass.withValues(alpha: .5), 2));
  }
  @override bool shouldRepaint(covariant CustomPainter _) => false;
}

/// وعد ٢ — الريال خلف القفل: المبلغ موجودٌ ومرئي، لكنه لا يتحرك حتى تستلم.
class _SceneEscrow extends StatelessWidget {
  const _SceneEscrow();
  @override Widget build(BuildContext context) => Stack(alignment: Alignment.center, children: [
    CustomPaint(size: const Size(250, 250), painter: _EscrowPainter()),
    // «ر.س» نصٌّ حقيقي بخط التطبيق — في قلب القطعة النقدية
    Padding(padding: const EdgeInsets.only(bottom: 34), child: Text('ر.س',
        style: TextStyle(color: _ink.withValues(alpha: .95), fontSize: 27, fontWeight: FontWeight.w800, height: 1.25))),
  ]);
}

class _EscrowPainter extends CustomPainter {
  @override void paint(Canvas c, Size s) {
    final center = Offset(s.width / 2, s.height / 2 - 16);
    // هالة
    c.drawCircle(center, 92, _fill(_mint.withValues(alpha: .07)));
    // القطعة: قرصٌ بحدّين — عملةٌ لا زرّ
    c.drawCircle(center, 64, _fill(_ink.withValues(alpha: .12)));
    c.drawCircle(center, 64, _stroke(_ink.withValues(alpha: .85), 2));
    c.drawCircle(center, 52, _stroke(_ink.withValues(alpha: .25), 1.4));
    // القفل يطبق على القطعة من أسفل — جسمه نحاسي مصمت وقوسه يحتضن القرص
    final lockBody = RRect.fromRectAndRadius(Rect.fromCenter(center: center + const Offset(0, 74), width: 64, height: 46), const Radius.circular(12));
    c.drawArc(Rect.fromCircle(center: center + const Offset(0, 52), radius: 26), math.pi, math.pi, false, _stroke(_brass, 5));
    c.drawRRect(lockBody, _fill(_brass));
    c.drawCircle(center + const Offset(0, 70), 5, _fill(SinaatyColors.sealDeep));
    c.drawLine(center + const Offset(0, 74), center + const Offset(0, 84), _stroke(SinaatyColors.sealDeep, 3.4));
    // شارة اطمئنان: صحٌّ نعناعي صغير بجانب القطعة
    final ok = center + const Offset(-74, -50);
    c.drawCircle(ok, 15, _fill(_mint.withValues(alpha: .18)));
    c.drawCircle(ok, 15, _stroke(_mint, 1.6));
    final check = Path()..moveTo(ok.dx - 6, ok.dy)..lineTo(ok.dx - 1.5, ok.dy + 4.5)..lineTo(ok.dx + 6.5, ok.dy - 4);
    c.drawPath(check, _stroke(_mint, 2.4));
  }
  @override bool shouldRepaint(covariant CustomPainter _) => false;
}

/// وعد ٣ — الورقة المختومة: بنودٌ مكتوبة، توقيعٌ نعناعي، وختمُ الصنعة النحاسي — حقٌّ لا يضيع.
class _SceneSealed extends StatelessWidget {
  const _SceneSealed();
  @override Widget build(BuildContext context) => CustomPaint(painter: _SealedPainter());
}

class _SealedPainter extends CustomPainter {
  @override void paint(Canvas c, Size s) {
    final center = Offset(s.width / 2, s.height / 2);
    // الورقة — بميلٍ خفيف يمنحها حياة
    c.save();
    c.translate(center.dx, center.dy);
    c.rotate(-.045);
    final sheet = RRect.fromRectAndRadius(Rect.fromCenter(center: Offset.zero, width: 148, height: 188), const Radius.circular(14));
    c.drawRRect(sheet.shift(const Offset(0, 10)).inflate(2), _fill(Colors.black.withValues(alpha: .18)));
    c.drawRRect(sheet, _fill(_ink.withValues(alpha: .12)));
    c.drawRRect(sheet, _stroke(_ink.withValues(alpha: .8), 1.8));
    // بنودها — أسطرٌ تقصر كما في مستند حقيقي، وسطر المجموع أبرزها
    for (final (dy, w, a) in [(-64.0, 96.0, .9), (-40.0, 80.0, .5), (-16.0, 88.0, .5), (8.0, 66.0, .5), (38.0, 44.0, .85)]) {
      c.drawLine(Offset(60, dy), Offset(60 - w, dy), _stroke(_ink.withValues(alpha: a), dy == 38.0 ? 6 : 5));
    }
    // التوقيع — خطٌّ حرٌّ بالنعناعي فوق سطر المجموع
    final sig = Path()..moveTo(46, 66)..cubicTo(30, 54, 22, 76, 8, 64)..cubicTo(-2, 55, -14, 70, -26, 62);
    c.drawPath(sig, _stroke(_mint, 2.6));
    c.restore();
    // ختم الصنعة — حلقة نحاسية مسنّنة تطبع على زاوية الورقة (شعار المنصة نفسه)
    final seal = center + const Offset(-64, 78);
    c.drawCircle(seal, 34, _fill(SinaatyColors.sealDeep.withValues(alpha: .55)));
    c.drawCircle(seal, 30, _stroke(_brass, 3));
    for (var i = 0; i < 24; i++) {
      final a = i * math.pi / 12;
      c.drawLine(seal + Offset(math.cos(a) * 33, math.sin(a) * 33), seal + Offset(math.cos(a) * 36.5, math.sin(a) * 36.5), _stroke(_brass.withValues(alpha: .85), 2));
    }
    c.drawCircle(seal, 12, _stroke(_brass, 2.6));
    c.drawCircle(seal, 4.5, _fill(_brass));
  }
  @override bool shouldRepaint(covariant CustomPainter _) => false;
}
