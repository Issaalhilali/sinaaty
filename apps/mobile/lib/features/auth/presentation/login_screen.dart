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
/// Screen 1 of login: phone → send code. One field, one button.
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
    return Scaffold(body: SafeArea(child: Padding(padding: const EdgeInsets.all(SinaatySpace.xl), child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      const Spacer(), const _Logo(), const SizedBox(height: SinaatySpace.xl),
      const BrandMark(size: 56), const SizedBox(height: SinaatySpace.xl), Text(l.loginTitle, style: t.textTheme.headlineMedium), const SizedBox(height: SinaatySpace.sm), Text(l.loginSubtitle, style: t.textTheme.bodyMedium?.copyWith(color: t.colorScheme.onSurfaceVariant)),
      const SizedBox(height: SinaatySpace.xl),
      TextField(controller: _phone, keyboardType: TextInputType.phone, textDirection: TextDirection.ltr, textAlign: TextAlign.left, autofillHints: const [AutofillHints.telephoneNumber], inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9+٠-٩ ]'))], decoration: InputDecoration(labelText: l.phoneLabel, hintText: l.phoneHint, errorText: _error, prefixIcon: const Icon(Icons.phone_iphone)), onSubmitted: (_) => _send()),
      const SizedBox(height: SinaatySpace.lg), PrimaryButton(label: l.sendCode, onPressed: _send, loading: _loading),
      const SizedBox(height: SinaatySpace.md), OutlinedButton.icon(onPressed: null, icon: const Icon(Icons.verified_user_outlined), label: Text('${l.loginWithNafath} — ${l.comingSoon}')),
      const Spacer(flex: 2),
    ]))));
  }
}
class _Logo extends StatelessWidget { const _Logo(); @override Widget build(BuildContext context) { final c = Theme.of(context).colorScheme; return Row(children: [Container(width: 44, height: 44, decoration: BoxDecoration(color: c.primary, borderRadius: BorderRadius.circular(12)), child: Icon(Icons.check_rounded, color: c.onPrimary)), const SizedBox(width: 12), Text(L10n.of(context).appName, style: Theme.of(context).textTheme.titleLarge)]); } }
