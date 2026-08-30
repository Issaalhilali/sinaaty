import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/di/core_providers.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/config/app_config.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../domain/normalize_phone.dart';
import 'providers.dart';

/// أول شاشة يراها إنسان — ولها عملان: أن تقول ما هذا المنتج، وأن تأخذ رقماً واحداً.
///
/// كانت شعاراً وحقلاً وزرّاً ميتاً («نفاذ — قريباً»)، فكان أول انطباع عن المنصة وعداً بالنقص، ولم
/// تقل لمن يفتحها لأول مرة **لماذا** يعطي رقمه. الآن: سطح الختم الأخضر — توقيع المنتج في كل شاشة
/// أخرى — يحمل الجملة التي تختصر المنصة كلها وثلاث ضمانات هي فرقها عن أي تطبيق ورش، ثم لوحٌ أبيض
/// يرتفع فوقه بفعل واحد. ولا وعد بما لا يعمل: نفاذ يُذكر حيث يقع فعلاً — عند الاعتماد.
class LoginScreen extends ConsumerStatefulWidget { const LoginScreen({super.key}); @override ConsumerState<LoginScreen> createState() => _LoginScreenState(); }

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _phone = TextEditingController(); bool _loading = false; String? _error;
  @override void dispose() { _phone.dispose(); super.dispose(); }

  Future<void> _send() async {
    final l = L10n.of(context); final phone = normalizeSaudiPhone(_phone.text);
    if (phone == null) { setState(() => _error = l.errorInvalidPhone); return; }
    setState(() { _loading = true; _error = null; });
    final r = await ref.read(authRepositoryProvider).requestOtp(phone);
    if (!mounted) return; setState(() => _loading = false);
    r.when(ok: (v) => context.push('/login/otp', extra: {'phone': v.phone, 'debug': v.debugCode}), err: (f) => setState(() => _error = f.message(ref.read(localeProvider))));
  }

  @override Widget build(BuildContext context) {
    final l = L10n.of(context);
    // الثيم يُلتقط من تحت غلاف الفاتح: التقاطه فوق الغلاف أعطى «ادخل بجوالك» لونَ
    // الداكن على لوحٍ أبيض — باهتةً بالكاد تُقرأ (لقطة المالك على جهازه الداكن).
    return Theme(data: AppTheme.light(), child: Builder(builder: (context) {
      final t = Theme.of(context);
      return SealScaffold(
      top: _Hero(l: l),
      sheet: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text(l.loginTitle, style: t.textTheme.titleLarge),
        const SizedBox(height: 4),
        Text(l.loginSubtitle, style: t.textTheme.bodySmall?.copyWith(color: t.colorScheme.onSurfaceVariant)),
        const SizedBox(height: SinaatySpace.lg),
        TextField(
          controller: _phone, keyboardType: TextInputType.phone, textDirection: TextDirection.ltr, textAlign: TextAlign.left,
          autofillHints: const [AutofillHints.telephoneNumber],
          inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9+٠-٩ ]'))],
          decoration: InputDecoration(labelText: l.phoneLabel, hintText: l.phoneHint, errorText: _error, prefixIcon: const Icon(Icons.phone_iphone)),
          // الخطأ يعيش ما دام سببه: كان يُمسح عند الإرسال وحده، فيبقى «أدخل رقم جوال سعودي صحيح»
          // والحقل أحمر بينما الرقم أمام عينيه صحيح — يصحّح ولا يرى أثراً لتصحيحه.
          onChanged: (_) { if (_error != null) setState(() => _error = null); },
          onSubmitted: (_) => _send(),
        ),
        const SizedBox(height: SinaatySpace.lg),
        PrimaryButton(label: l.sendCode, onPressed: _send, loading: _loading),
        const SizedBox(height: SinaatySpace.md),
        // بدل زرّ «قريباً»: نفاذ يُذكر حيث يعمل فعلاً — جملة واحدة، وهي أيضاً وعدٌ صادق.
        Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(Icons.verified_user_outlined, size: 15, color: t.colorScheme.onSurfaceVariant),
          const SizedBox(width: 6),
          Flexible(child: Text(l.loginNafathNote, textAlign: TextAlign.center, style: t.textTheme.bodySmall?.copyWith(color: t.colorScheme.onSurfaceVariant))),
        ]),
        // بابُ الضيف — للعميل وحده: يستكشف الورش من حوله قبل أن يُطلب منه رقم.
        // (متاجر التطبيقات تشترط التصفح قبل الحساب لتطبيقات السوق أصلاً.)
        if (ref.watch(appConfigProvider).flavor == AppFlavor.customer)
          TextButton(
            onPressed: () { ref.read(guestModeProvider.notifier).enter(); context.go('/explore'); },
            child: Text(l.exploreFirst),
          ),
        // في بناء التطوير وحده: العنوان الذي يخاطبه التطبيق. ساعةٌ ضاعت في مطاردة «لا يوجد اتصال
        // بالإنترنت» بينما الشبكة سليمة والعنوان قديم — سطرٌ واحد يجعل التشخيص نظرة.
        if (ref.watch(appConfigProvider).appEnv != 'prod') ...[
          const SizedBox(height: SinaatySpace.sm),
          Text(ref.watch(appConfigProvider).apiBaseUrl, textAlign: TextAlign.center, textDirection: TextDirection.ltr,
            style: t.textTheme.bodySmall?.copyWith(color: t.colorScheme.onSurfaceVariant.withValues(alpha: .55), fontSize: 11)),
        ],
      ]),
    );
    }));
  }
}

/// سطح الختم: الاسم، الجملة التي تختصر المنصة، وثلاث ضمانات هي فرقها عن أي تطبيق ورش.
class _Hero extends StatelessWidget {
  final L10n l; const _Hero({required this.l});
  @override Widget build(BuildContext context) {
    // «النصوص كبيرة لحجم الشاشة» — كلمة المالك على جهازه: المقاس يُشتق من عرض الشاشة
    // ويُحصر بين حدّين، فيتنفس على الكبيرة ولا يزاحم على الصغيرة. والارتفاع القصير
    // (جوالات قديمة، لوحة مفاتيح مفتوحة) يطوي الشعار ويُبقي الجوهر.
    final size = MediaQuery.sizeOf(context);
    final titleSize = (size.width * .058).clamp(19.0, 25.0).toDouble();
    final compact = size.height < 640;
    return Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
      if (!compact) ...[
        Row(children: [
          const BrandMark(size: 38),
          const SizedBox(width: 10),
          Text(l.appName, style: Theme.of(context).textTheme.titleMedium?.copyWith(color: Colors.white, fontWeight: FontWeight.w800)),
        ]),
        const SizedBox(height: SinaatySpace.lg),
      ],
      Text(l.loginPromise, style: TextStyle(fontFamily: AppTheme.fontFamily, fontSize: titleSize, fontWeight: FontWeight.w800, color: Colors.white, height: 1.45)),
      const SizedBox(height: SinaatySpace.md),
      Wrap(spacing: 6, runSpacing: 6, children: [
        SealPill(l.loginTrustSign, icon: Icons.draw_outlined),
        SealPill(l.loginTrustEscrow, icon: Icons.lock_outline),
        SealPill(l.loginTrustInvoice, icon: Icons.receipt_long_outlined),
      ]),
    ]);
  }
}
