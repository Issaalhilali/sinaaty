import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/di/core_providers.dart';
import '../../../core/l10n/app_localizations.dart';
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
    final l = L10n.of(context); final t = Theme.of(context);
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
        // في بناء التطوير وحده: العنوان الذي يخاطبه التطبيق. ساعةٌ ضاعت في مطاردة «لا يوجد اتصال
        // بالإنترنت» بينما الشبكة سليمة والعنوان قديم — سطرٌ واحد يجعل التشخيص نظرة.
        if (ref.watch(appConfigProvider).appEnv != 'prod') ...[
          const SizedBox(height: SinaatySpace.sm),
          Text(ref.watch(appConfigProvider).apiBaseUrl, textAlign: TextAlign.center, textDirection: TextDirection.ltr,
            style: t.textTheme.bodySmall?.copyWith(color: t.colorScheme.onSurfaceVariant.withValues(alpha: .55), fontSize: 11)),
        ],
      ]),
    );
  }
}

/// سطح الختم: الاسم، الجملة التي تختصر المنصة، وثلاث ضمانات هي فرقها عن أي تطبيق ورش.
class _Hero extends StatelessWidget {
  final L10n l; const _Hero({required this.l});
  @override Widget build(BuildContext context) => Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
    Row(children: [
      Container(width: 44, height: 44, decoration: BoxDecoration(color: Colors.white.withValues(alpha: .14), borderRadius: BorderRadius.circular(13)),
        child: Center(child: Container(width: 18, height: 18, decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: Colors.white, width: 3))))),
      const SizedBox(width: 12),
      Text(l.appName, style: Theme.of(context).textTheme.titleLarge?.copyWith(color: Colors.white)),
    ]),
    const SizedBox(height: SinaatySpace.xl),
    Text(l.loginPromise, style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: Colors.white, height: 1.35)),
    const SizedBox(height: SinaatySpace.md),
    Wrap(spacing: 8, runSpacing: 8, children: [
      SealPill(l.loginTrustSign, icon: Icons.draw_outlined),
      SealPill(l.loginTrustEscrow, icon: Icons.lock_outline),
      SealPill(l.loginTrustInvoice, icon: Icons.receipt_long_outlined),
    ]),
  ]);
}
