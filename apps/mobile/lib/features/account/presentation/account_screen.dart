import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/di/core_providers.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../../../core/format/format.dart';
import '../../auth/domain/auth_entities.dart';
import '../../auth/presentation/providers.dart';
import '../../notifications/presentation/providers.dart';
/// Tab «حسابي»: who I am, notifications, language, sign out. Nothing else (charter §5.0).
class AccountScreen extends ConsumerWidget {
  const AccountScreen({super.key});
  @override Widget build(BuildContext context, WidgetRef ref) {
    final l = L10n.of(context); final me = ref.watch(authControllerProvider).me; final unread = ref.watch(unreadCountProvider).value ?? 0; final locale = ref.watch(localeProvider);
    return ListView(padding: const EdgeInsets.all(SinaatySpace.lg), children: [
      SectionCard(child: Row(children: [
        CircleAvatar(radius: 26, child: Icon(Icons.person_outline, color: Theme.of(context).colorScheme.onPrimaryContainer)),
        const SizedBox(width: SinaatySpace.md),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(me?.fullNameAr ?? l.addYourName, style: Theme.of(context).textTheme.titleLarge),
          Text(me?.phone ?? '', textDirection: TextDirection.ltr, style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)),
          if (me?.email != null) Text(me!.email!, textDirection: TextDirection.ltr, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant)),
        ])),
        // الاسم والبريد في ورقةٍ واحدة — والقلم يظهر دائماً: موثّق نفاذٍ يعدّل بريده لا اسمه.
        IconButton(icon: const Icon(Icons.edit_outlined), tooltip: l.editProfile, onPressed: () => _editProfile(context, ref, me)),
        StatusBadge(me?.nafathVerified ?? false ? l.nafathVerifiedLabel : l.notVerified, tone: me?.nafathVerified ?? false ? BadgeTone.seal : BadgeTone.plain, icon: Icons.verified_user_outlined),
      ])),
      const SizedBox(height: SinaatySpace.lg),
      SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm), child: Column(children: [
        // المحفظة والضمانات دخلتا هنا بعد تقليص التبويبات: «أنا» شيءٌ واحد لا تبويبان.
        AppListRow(brandIcon: BrandGlyph.wallet, title: l.tabWallet, onTap: () => context.push('/wallet')),
        AppListRow(brandIcon: BrandGlyph.shieldSeal, title: l.ptWarranties, onTap: () => context.push('/warranties')),
        AppListRow(brandIcon: BrandGlyph.bell, title: l.notifications, trailing: unread > 0 ? StatusBadge('$unread', tone: BadgeTone.brass) : null, onTap: () => context.push('/notifications')),
        AppListRow(icon: Icons.language, title: l.language, trailing: SegmentedButton<String>(segments: [ButtonSegment(value: 'ar', label: Text(l.arabic)), ButtonSegment(value: 'en', label: Text(l.english))], selected: {locale}, onSelectionChanged: (s) => ref.read(localeProvider.notifier).set(s.first), showSelectedIcon: false)),
      ])),
      const SizedBox(height: SinaatySpace.lg),
      // الدعم والتعريف — كان نصف الشاشة فراغاً أسود، والمتاجر تسألهما قبل النشر أصلاً
      SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm), child: Column(children: [
        AppListRow(icon: Icons.support_agent_outlined, title: l.supportTitle, onTap: () => context.push('/support')),
        AppListRow(icon: Icons.info_outline, title: l.aboutTitle, onTap: () => context.push('/about')),
      ])),
      const SizedBox(height: SinaatySpace.lg),
      Center(child: TextButton(onPressed: () => ref.read(authControllerProvider.notifier).signOut(), child: Text(l.logout))),
    ]);
  }

  Future<void> _editProfile(BuildContext context, WidgetRef ref, Me? me) async {
    final l = L10n.of(context);
    final nafath = me?.nafathVerified ?? false;
    final locked = me?.nameLockedUntil;
    final nameFrozen = nafath || locked != null;
    final name = TextEditingController(text: me?.fullNameAr ?? '');
    final email = TextEditingController(text: me?.email ?? '');
    final ok = await showDialog<bool>(context: context, builder: (d) => AlertDialog(
      title: Text(l.editProfile),
      content: Column(mainAxisSize: MainAxisSize.min, children: [
        // الاسم يوقّع الاعتمادات: موثّق نفاذ لا يعدّله، ومن غيّره حديثاً ينتظر موعده المسمّى
        TextField(controller: name, enabled: !nameFrozen, autofocus: !nameFrozen,
            decoration: InputDecoration(labelText: l.yourName,
                helperText: nafath ? l.nameFromNafath : locked != null ? l.nameLockedUntil(Fmt.date(locked, locale: Localizations.localeOf(context).languageCode)) : null,
                helperMaxLines: 2)),
        const SizedBox(height: SinaatySpace.md),
        TextField(controller: email, keyboardType: TextInputType.emailAddress, textDirection: TextDirection.ltr,
            decoration: InputDecoration(labelText: l.emailLabel, helperText: l.emailWhy, helperMaxLines: 2)),
      ]),
      actions: [TextButton(onPressed: () => Navigator.pop(d, false), child: Text(l.cancel)), FilledButton(onPressed: () => Navigator.pop(d, true), child: Text(l.save))],
    ));
    if (ok != true || !context.mounted) return;
    final n = name.text.trim(); final e = email.text.trim();
    final r = await ref.read(authControllerProvider.notifier).updateProfile(
      fullNameAr: !nameFrozen && n.length >= 2 && n != (me?.fullNameAr ?? '') ? n : null,
      email: e.isNotEmpty && e != (me?.email ?? '') ? e : null,
      clearEmail: e.isEmpty && me?.email != null,          // مسح الحقل = سحب البريد من الحساب
    );
    if (!context.mounted) return;
    r.when(ok: (_) {}, err: (f) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(f.message(Localizations.localeOf(context).languageCode)))));
  }
}
