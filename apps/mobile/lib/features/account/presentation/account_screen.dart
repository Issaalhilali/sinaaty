import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/di/core_providers.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../../auth/presentation/providers.dart';
import '../../notifications/presentation/providers.dart';
/// Tab «حسابي»: who I am, notifications, language, sign out. Nothing else (charter §5.0).
class AccountScreen extends ConsumerWidget {
  const AccountScreen({super.key});
  @override Widget build(BuildContext context, WidgetRef ref) {
    final l = L10n.of(context); final me = ref.watch(authControllerProvider).me; final unread = ref.watch(unreadCountProvider).value ?? 0; final locale = ref.watch(localeProvider);
    return ListView(padding: const EdgeInsets.all(SinaatySpace.lg), children: [
      SectionCard(child: Row(children: [CircleAvatar(radius: 26, child: Icon(Icons.person_outline, color: Theme.of(context).colorScheme.onPrimaryContainer)), const SizedBox(width: SinaatySpace.md), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(me?.fullNameAr ?? me?.phone ?? '', style: Theme.of(context).textTheme.titleLarge), Text(me?.phone ?? '', textDirection: TextDirection.ltr, style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant))])), StatusBadge(me?.nafathVerified ?? false ? l.nafathVerifiedLabel : l.notVerified, tone: me?.nafathVerified ?? false ? BadgeTone.seal : BadgeTone.plain, icon: Icons.verified_user_outlined)])),
      const SizedBox(height: SinaatySpace.lg),
      SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm), child: Column(children: [
        AppListRow(icon: Icons.notifications_none, title: l.notifications, trailing: unread > 0 ? StatusBadge('$unread', tone: BadgeTone.brass) : null, onTap: () => context.push('/notifications')),
        AppListRow(icon: Icons.language, title: l.language, trailing: SegmentedButton<String>(segments: [ButtonSegment(value: 'ar', label: Text(l.arabic)), ButtonSegment(value: 'en', label: Text(l.english))], selected: {locale}, onSelectionChanged: (s) => ref.read(localeProvider.notifier).set(s.first), showSelectedIcon: false)),
      ])),
      const SizedBox(height: SinaatySpace.lg),
      Center(child: TextButton(onPressed: () => ref.read(authControllerProvider.notifier).signOut(), child: Text(l.logout))),
    ]);
  }
}
