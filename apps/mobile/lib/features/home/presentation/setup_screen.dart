import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/di/core_providers.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../../auth/presentation/providers.dart';
import '../../vehicles/presentation/providers.dart';

/// «جهّز حسابك» — دقيقة واحدة تجعل الرئيسية له لا لمجهول.
///
/// عميلٌ جديد بلا اسمٍ ولا سيارة كان يهبط على شاشةٍ تناديه «أهلاً بعودتك» بلا اسمٍ تناديه به،
/// وبطاقة سيارةٍ فارغة. خطوتان: اسمه (يُكتب في حسابه فوراً — `PATCH /me`)، ثم سيارته
/// (`POST /vehicles` بسجلها الدائم). كلاهما في قاعدة البيانات لا في ذاكرة الجهاز: يدخل من
/// جهازٍ آخر فيجد حسابه كما جهّزه. و«لاحقاً» تُحترم — لا إلحاح على من قرّر.
class SetupScreen extends ConsumerStatefulWidget {
  const SetupScreen({super.key});
  @override ConsumerState<SetupScreen> createState() => _SetupScreenState();
}

class _SetupScreenState extends ConsumerState<SetupScreen> {
  final _name = TextEditingController();
  bool _saving = false; int _step = 0; String? _error;

  void _dismiss() {
    ref.read(setupDismissedProvider.notifier).mark();
    unawaited(SharedPreferences.getInstance().then((p) => p.setBool('setup_dismissed_v1', true)));
  }

  Future<void> _saveName() async {
    final l = L10n.of(context); final name = _name.text.trim();
    if (name.length < 2) { setState(() => _error = l.setupNameShort); return; }
    setState(() { _saving = true; _error = null; });
    final r = await ref.read(authControllerProvider.notifier).setName(name);
    if (!mounted) return;
    setState(() => _saving = false);
    r.when(
      ok: (_) => setState(() => _step = 1),
      err: (f) => setState(() => _error = f.message(Localizations.localeOf(context).languageCode)),
    );
  }

  Future<void> _addCar() async {
    await context.push('/vehicles/add');
    if (!mounted) return;
    ref.invalidate(vehiclesProvider);
    // أُضيفت؟ الحارس في HomeShell يرى القائمة فيُخرجنا وحده. لم تُضف؟ نبقى هنا بلا عتاب.
  }

  @override void dispose() { _name.dispose(); super.dispose(); }

  @override Widget build(BuildContext context) {
    final l = L10n.of(context);
    final me = ref.watch(authControllerProvider).me;
    // من له اسمٌ أصلاً (عاد بعد إضافة الاسم وخرج قبل السيارة) يبدأ من خطوة السيارة.
    final step = (me?.fullNameAr?.isNotEmpty ?? false) ? 1 : _step;
    // الثيم من تحت غلاف الفاتح — لا من فوقه (نفس علّة «ادخل بجوالك» الباهتة)
    return Theme(data: AppTheme.light(), child: Builder(builder: (context) {
      final t = Theme.of(context);
      return SealScaffold(
      top: Column(mainAxisSize: MainAxisSize.min, children: [
        const BrandMark(size: 40),
        const SizedBox(height: SinaatySpace.lg),
        Text(l.setupTitle, textAlign: TextAlign.center, style: t.textTheme.headlineSmall?.copyWith(color: Colors.white, fontWeight: FontWeight.w800)),
        const SizedBox(height: 6),
        Text(l.setupSubtitle, textAlign: TextAlign.center, style: t.textTheme.bodyMedium?.copyWith(color: Colors.white.withValues(alpha: .75))),
        const SizedBox(height: SinaatySpace.lg),
        SealSteps(total: 2, current: step),
      ]),
      sheet: step == 0
          ? Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Text(l.setupNameTitle, style: t.textTheme.titleLarge),
              const SizedBox(height: 4),
              Text(l.setupNameBody, style: t.textTheme.bodySmall?.copyWith(color: t.colorScheme.onSurfaceVariant, height: 1.6)),
              const SizedBox(height: SinaatySpace.lg),
              TextField(
                controller: _name, autofocus: true, textInputAction: TextInputAction.done,
                decoration: InputDecoration(labelText: l.setupNameLabel, hintText: l.setupNameHint, errorText: _error, prefixIcon: const Icon(Icons.person_outline)),
                onChanged: (_) { if (_error != null) setState(() => _error = null); },
                onSubmitted: (_) => _saveName(),
              ),
              const SizedBox(height: SinaatySpace.lg),
              PrimaryButton(label: l.setupNext, onPressed: _saveName, loading: _saving),
              TextButton(onPressed: _dismiss, child: Text(l.setupLater)),
            ])
          : Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Text(l.setupCarTitle, style: t.textTheme.titleLarge),
              const SizedBox(height: 4),
              Text(l.setupCarBody, style: t.textTheme.bodySmall?.copyWith(color: t.colorScheme.onSurfaceVariant, height: 1.6)),
              const SizedBox(height: SinaatySpace.lg),
              PrimaryButton(label: l.setupAddCar, icon: Icons.directions_car_outlined, onPressed: _addCar),
              TextButton(onPressed: _dismiss, child: Text(l.setupLater)),
            ]),
    );
    }));
  }
}
