import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/config/app_config.dart';
import '../../../core/di/core_providers.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/ui/ui.dart';
import 'package:go_router/go_router.dart';
import '../../account/presentation/account_screen.dart';
import '../../auth/presentation/providers.dart';
import '../../billing/presentation/wallet_screen.dart';
import '../../notifications/presentation/providers.dart';
import '../../vehicles/presentation/vehicles_screen.dart';
/// Flavor-driven tab shell: 3–4 tabs, never more (charter §5.0 #2). Real screens land in Steps 13/14/22.
class HomeShell extends ConsumerStatefulWidget { const HomeShell({super.key}); @override ConsumerState<HomeShell> createState() => _HomeShellState(); }
class _HomeShellState extends ConsumerState<HomeShell> {
  int _index = 0;
  @override Widget build(BuildContext context) {
    final l = L10n.of(context); final flavor = ref.watch(appConfigProvider).flavor; final me = ref.watch(authControllerProvider).me;
    final tabs = switch (flavor) {
      AppFlavor.customer => [(l.tabMyCars, Icons.directions_car_outlined), (l.tabRequest, Icons.add_circle_outline), (l.tabWallet, Icons.account_balance_wallet_outlined), (l.tabAccount, Icons.person_outline)],
      AppFlavor.partner => [(l.tabToday, Icons.today_outlined), (l.tabOrders, Icons.receipt_long_outlined), (l.tabParts, Icons.settings_input_component_outlined), (l.tabWallet, Icons.account_balance_wallet_outlined)],
      AppFlavor.fleet => [(l.tabToday, Icons.dashboard_outlined), (l.tabMyCars, Icons.directions_car_outlined), (l.tabWallet, Icons.account_balance_wallet_outlined), (l.tabAccount, Icons.person_outline)],
    };
    final title = tabs[_index].$1; final name = me?.fullNameAr ?? '';
    final body = switch ((flavor, _index)) {
      (AppFlavor.customer, 0) => const VehiclesScreen(),
      (AppFlavor.customer, 1) => EmptyState(icon: Icons.add_circle_outline, title: l.requestSoonTitle, body: l.requestSoonBody),
      (AppFlavor.customer, 2) => const WalletScreen(),
      (AppFlavor.customer, 3) => const AccountScreen(),
      (AppFlavor.partner, 0) => EmptyState(icon: Icons.build_outlined, title: l.welcomeBack, body: l.todayEmpty, actionLabel: l.newWorkOrder, onAction: () {}),
      _ => EmptyState(icon: Icons.hourglass_empty, title: l.comingSoon, body: me?.phone ?? ''),
    };
    final unread = flavor == AppFlavor.customer ? (ref.watch(unreadCountProvider).value ?? 0) : 0;
    return AppScaffold(title: title, subtitle: _index == 0 && name.isNotEmpty ? '${l.welcomeBack} $name' : null, leading: const Padding(padding: EdgeInsetsDirectional.only(start: 16), child: Center(child: BrandMark(size: 30))), body: body,
      moreItems: [PopupMenuItem(value: 'inbox', child: Text(unread > 0 ? '${l.notifications} ($unread)' : l.notifications)), PopupMenuItem(value: 'logout', child: Text(l.logout))],
      onMore: (v) { if (v == 'logout') ref.read(authControllerProvider.notifier).signOut(); if (v == 'inbox') context.push('/notifications'); },
      bottom: FloatingNav(index: _index, onChanged: (i) => setState(() => _index = i), items: [for (final t in tabs) (icon: t.$2, label: t.$1)]));
  }
}
