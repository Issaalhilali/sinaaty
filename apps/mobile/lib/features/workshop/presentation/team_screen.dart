import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../../auth/domain/normalize_phone.dart';
import '../domain/workshop.dart';
import 'providers.dart';

/// فريق الورشة — صاحبها يضيف فنّيه بجواله ويحدد دوره، ويزيله يوم يغادر.
///
/// كانت العضوية تُدار من لوحة الإدارة وحدها: صاحب ورشةٍ لا يستطيع إدخال موظفه بنفسه.
/// شاشةٌ واحدة: القائمة، إضافةٌ بورقةٍ سفلية (جوال + دور بثلاث شرائح)، وإزالةٌ من صف العضو.
class TeamScreen extends ConsumerStatefulWidget {
  const TeamScreen({super.key});
  @override ConsumerState<TeamScreen> createState() => _TeamScreenState();
}

final _membersProvider = FutureProvider.autoDispose<List<OrgMember>>((ref) async {
  final org = ref.watch(currentOrgIdProvider);
  if (org == null) return const [];
  return (await ref.watch(workshopRepositoryProvider).members(org)).valueOrNull ?? const [];
});

class _TeamScreenState extends ConsumerState<TeamScreen> {
  bool _busy = false;

  String _roleLabel(L10n l, String r) => switch (r) {
        'owner' => l.roleOwner, 'manager' => l.roleManager, 'technician' => l.roleTechnician, 'accountant' => l.roleAccountant, _ => r };

  Future<void> _add() async {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode;
    final org = ref.read(currentOrgIdProvider); if (org == null) return;
    final phone = TextEditingController(); var role = 'technician'; String? error;
    final ok = await showModalBottomSheet<bool>(context: context, showDragHandle: true, isScrollControlled: true,
      builder: (c) => StatefulBuilder(builder: (c, setS) => SheetBody(child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text(l.teamAdd, style: Theme.of(c).textTheme.titleLarge),
          const SizedBox(height: 4),
          Text(l.teamAddBody, style: Theme.of(c).textTheme.bodySmall?.copyWith(color: Theme.of(c).colorScheme.onSurfaceVariant, height: 1.6)),
          const SizedBox(height: SinaatySpace.lg),
          TextField(controller: phone, keyboardType: TextInputType.phone, textDirection: TextDirection.ltr, textAlign: TextAlign.left, autofocus: true,
              decoration: InputDecoration(labelText: l.phoneLabel, hintText: l.phoneHint, errorText: error, prefixIcon: const Icon(Icons.phone_iphone)),
              onChanged: (_) { if (error != null) setS(() => error = null); }),
          const SizedBox(height: SinaatySpace.md),
          SegmentedButton<String>(
            segments: [ButtonSegment(value: 'technician', label: Text(l.roleTechnician)), ButtonSegment(value: 'manager', label: Text(l.roleManager)), ButtonSegment(value: 'accountant', label: Text(l.roleAccountant))],
            selected: {role}, showSelectedIcon: false, onSelectionChanged: (s) => setS(() => role = s.first)),
          const SizedBox(height: SinaatySpace.lg),
          PrimaryButton(label: l.teamAddConfirm, icon: Icons.person_add_alt_outlined, onPressed: () {
            if (normalizeSaudiPhone(phone.text) == null) { setS(() => error = l.errorInvalidPhone); return; }
            Navigator.pop(c, true);
          }),
        ]))));
    if (ok != true || !mounted) return;
    setState(() => _busy = true);
    final r = await ref.read(workshopRepositoryProvider).addMember(org, phone: normalizeSaudiPhone(phone.text)!, role: role);
    if (!mounted) return;
    setState(() => _busy = false);
    r.when(ok: (_) => ref.invalidate(_membersProvider), err: (f) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(f.message(locale)))));
  }

  Future<void> _remove(OrgMember m) async {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode;
    final org = ref.read(currentOrgIdProvider); if (org == null) return;
    final ok = await showModalBottomSheet<bool>(context: context, showDragHandle: true, builder: (c) => Padding(
      padding: const EdgeInsets.fromLTRB(SinaatySpace.lg, 0, SinaatySpace.lg, SinaatySpace.xl),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text(l.teamRemoveTitle(m.nameAr ?? m.phone), style: Theme.of(c).textTheme.titleLarge),
        const SizedBox(height: SinaatySpace.sm),
        Text(l.teamRemoveBody, style: Theme.of(c).textTheme.bodyMedium),
        const SizedBox(height: SinaatySpace.xl),
        FilledButton(style: FilledButton.styleFrom(backgroundColor: Theme.of(c).colorScheme.error, foregroundColor: Theme.of(c).colorScheme.onError),
            onPressed: () => Navigator.pop(c, true), child: Text(l.teamRemoveConfirm)),
        TextButton(onPressed: () => Navigator.pop(c, false), child: Text(l.cancel)),
      ])));
    if (ok != true || !mounted) return;
    final r = await ref.read(workshopRepositoryProvider).removeMember(org, m.userId);
    if (!mounted) return;
    r.when(ok: (_) => ref.invalidate(_membersProvider), err: (f) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(f.message(locale)))));
  }

  @override Widget build(BuildContext context) {
    final l = L10n.of(context);
    final members = ref.watch(_membersProvider);
    return AppScaffold(
      title: l.wsTeam,
      primaryAction: PrimaryButton(label: l.teamAdd, icon: Icons.person_add_alt_outlined, loading: _busy, onPressed: _busy ? null : _add),
      body: members.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, _) => EmptyState(glyph: BrandGlyph.person, title: l.errorGeneric, body: '', actionLabel: l.retry, onAction: () => ref.invalidate(_membersProvider)),
        data: (list) => list.isEmpty
            ? EmptyState(glyph: BrandGlyph.person, title: l.teamEmpty, body: l.teamEmptyBody)
            : RefreshIndicator(onRefresh: () async => ref.invalidate(_membersProvider), child: ListView(padding: EdgeInsets.fromLTRB(SinaatySpace.lg, SinaatySpace.md, SinaatySpace.lg, SinaatySpace.bottomClearance(context)), children: [
                SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm), child: Column(children: [
                  for (final m in list)
                    AppListRow(
                      brandIcon: BrandGlyph.person,
                      title: m.nameAr?.isNotEmpty == true ? m.nameAr! : m.phone,
                      subtitle: m.nameAr?.isNotEmpty == true ? m.phone : null,
                      trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                        StatusBadge(_roleLabel(l, m.role), tone: m.role == 'owner' ? BadgeTone.seal : BadgeTone.plain),
                        // المالك لا يُزال — الورشة لا تُترك بلا رأس
                        if (m.role != 'owner') IconButton(icon: const Icon(Icons.close, size: 18), onPressed: () => _remove(m)),
                      ]),
                    ),
                ])),
              ])),
      ),
    );
  }
}
