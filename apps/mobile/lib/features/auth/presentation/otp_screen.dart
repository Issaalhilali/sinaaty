import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/di/core_providers.dart';
import '../../../core/format/format.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../../../core/config/platform_info.dart';
import 'providers.dart';
class OtpScreen extends ConsumerStatefulWidget { final String phone; final String? debugCode; const OtpScreen({super.key, required this.phone, this.debugCode}); @override ConsumerState<OtpScreen> createState() => _OtpScreenState(); }
class _OtpScreenState extends ConsumerState<OtpScreen> {
  late final _code = TextEditingController(text: widget.debugCode ?? ''); bool _loading = false; String? _error;
  @override void dispose() { _code.dispose(); super.dispose(); }
  Future<void> _verify() async {
    if (_code.text.length != 6) return; setState(() { _loading = true; _error = null; });
    final flavor = ref.read(appConfigProvider).flavor.name;
    final r = await ref.read(authRepositoryProvider).verifyOtp(phone: widget.phone, code: _code.text, platform: platformName(), flavor: flavor);
    if (!mounted) return;
    await r.when(ok: (_) async { await ref.read(authControllerProvider.notifier).signedIn(); unawaited(_registerPush(flavor)); if (mounted) context.go('/'); }, err: (f) async { setState(() { _loading = false; _error = f.message(ref.read(localeProvider)); }); });
  }
  /// بعد الدخول لا أثناءه: الحصول على الرمز يطلب إذن الإشعارات على iOS. ولا يُعطّل الدخول أبداً —
  /// من رفض الإذن يدخل كما هو، ويفقد التنبيه وحده.
  Future<void> _registerPush(String flavor) async {
    final token = await ref.read(pushTokensProvider).token();
    if (token == null) return;
    await ref.read(authRepositoryProvider).registerPushToken(token, platform: platformName(), flavor: flavor);
  }

  @override Widget build(BuildContext context) {
    final l = L10n.of(context); final t = Theme.of(context);
    return SealScaffold(
      onBack: () => context.pop(),
      // نفس أخضر الشاشة السابقة: الرقم الذي أدخله للتوّ مكتوب أمامه، فلا يشكّ أنه أخطأ فيه.
      top: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Icon(Icons.sms_outlined, size: 34, color: Colors.white),
        const SizedBox(height: SinaatySpace.lg),
        Text(l.otpTitle, style: t.textTheme.headlineMedium?.copyWith(color: Colors.white, height: 1.35)),
        const SizedBox(height: SinaatySpace.sm),
        Text(l.otpSubtitle(Fmt.ltr(widget.phone)), style: t.textTheme.bodyMedium?.copyWith(color: Colors.white.withValues(alpha: .8))),
      ]),
      sheet: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        TextField(controller: _code, autofocus: true, keyboardType: TextInputType.number, textDirection: TextDirection.ltr, textAlign: TextAlign.center, maxLength: 6,
          style: const TextStyle(fontSize: 28, letterSpacing: 8, fontWeight: FontWeight.w700),
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          decoration: InputDecoration(counterText: '', errorText: _error),
          onChanged: (v) { if (v.length == 6) _verify(); }),
        const SizedBox(height: SinaatySpace.lg),
        PrimaryButton(label: l.verify, onPressed: _verify, loading: _loading),
        TextButton(onPressed: () => context.pop(), child: Text(l.resendCode)),
      ]),
    );
  }
}
