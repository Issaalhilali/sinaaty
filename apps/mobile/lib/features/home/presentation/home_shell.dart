import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/config/app_config.dart';
import '../../../core/di/core_providers.dart';
import '../../../core/flags/feature_flags.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/ui/ui.dart';
import '../../../core/voice/assistant.dart';
import '../../../core/voice/voice_input.dart';
import '../../../core/voice/voice_sheet.dart';
import 'package:go_router/go_router.dart';
import '../../account/presentation/account_screen.dart';
import '../../auth/presentation/providers.dart';
import '../../billing/presentation/wallet_screen.dart';
import '../../notifications/presentation/providers.dart';
import '../../vehicles/presentation/vehicles_screen.dart';
import '../../workshop/presentation/orders_screen.dart';
import '../../workshop/presentation/org_wallet_screen.dart';
import '../../workshop/presentation/providers.dart';
import '../../workshop/presentation/today_screen.dart';
import '../../parts/presentation/supplier_screens.dart';
import 'request_hub_screen.dart';
import '../../fleet/presentation/fleet_today_screen.dart';
import '../../parts/presentation/workshop_parts_screen.dart';
/// Flavor-driven tab shell: 3–4 tabs, never more (charter §5.0 #2). Real screens land in Steps 13/14/22.
class HomeShell extends ConsumerStatefulWidget { const HomeShell({super.key}); @override ConsumerState<HomeShell> createState() => _HomeShellState(); }
class _HomeShellState extends ConsumerState<HomeShell> {
  int _index = 0;
  @override Widget build(BuildContext context) {
    final l = L10n.of(context); final flavor = ref.watch(appConfigProvider).flavor; final me = ref.watch(authControllerProvider).me;
    final orgType = ref.watch(currentOrgInfoProvider).value?.type; final isSupplier = flavor == AppFlavor.partner && supplierOrgTypes.contains(orgType);
    // Feature flags decide which entry points exist at all (charter §5.0 #3); a failed load hides nothing.
    final flags = ref.watch(featureFlagsProvider(ref.watch(currentOrgIdProvider))).value ?? FeatureFlags.allVisible;
    final tabs = isSupplier ? <(String, IconData, Widget)>[
      (l.spRequests, Icons.gavel_outlined, const SupplierRequestsScreen()),
      (l.spSales, Icons.storefront_outlined, const SupplierSalesScreen()),
      (l.tabWallet, Icons.account_balance_wallet_outlined, const OrgWalletScreen()),
    ] : switch (flavor) {
      AppFlavor.customer => <(String, IconData, Widget)>[
        (l.tabMyCars, Icons.directions_car_outlined, const VehiclesScreen()),
        (l.tabRequest, Icons.add_circle_outline, const RequestHubScreen()),
        (l.tabWallet, Icons.account_balance_wallet_outlined, const WalletScreen()),
        (l.tabAccount, Icons.person_outline, const AccountScreen()),
      ],
      AppFlavor.partner => <(String, IconData, Widget)>[
        (l.tabToday, Icons.today_outlined, const TodayScreen()),
        (l.tabOrders, Icons.receipt_long_outlined, const OrdersScreen()),
        if (flags.enabled(Flags.partsMarketplace)) (l.tabParts, Icons.settings_input_component_outlined, const WorkshopPartsScreen()),
        (l.tabWallet, Icons.account_balance_wallet_outlined, const OrgWalletScreen()),
      ],
      AppFlavor.fleet => <(String, IconData, Widget)>[
        (l.tabToday, Icons.dashboard_outlined, const FleetTodayScreen()),
        (l.tabMyCars, Icons.directions_car_outlined, const VehiclesScreen()),
        (l.tabWallet, Icons.account_balance_wallet_outlined, const WalletScreen()),
        (l.tabAccount, Icons.person_outline, const AccountScreen()),
      ],
    };
    if (_index >= tabs.length) _index = 0; final title = tabs[_index].$1; final name = me?.fullNameAr ?? '';
    final body = tabs[_index].$3;
    final unread = flavor == AppFlavor.customer ? (ref.watch(unreadCountProvider).value ?? 0) : 0;
    final voiceOk = ref.watch(voiceAvailableProvider).value ?? false;
    final partner = flavor == AppFlavor.partner;
    return AppScaffold(title: title, subtitle: _index == 0 && name.isNotEmpty ? '${l.welcomeBack} $name' : null, leading: const Padding(padding: EdgeInsetsDirectional.only(start: 16), child: Center(child: BrandMark(size: 30))), body: body,
      trailing: Row(mainAxisSize: MainAxisSize.min, children: [
        if (voiceOk) IconButton(tooltip: l.assistantTooltip, icon: const Icon(Icons.mic_none), onPressed: () => _assistant(l, tabs, partner: partner && !isSupplier)),
        if (partner && !isSupplier) Padding(padding: const EdgeInsetsDirectional.only(end: 4), child: FilledButton.tonalIcon(style: FilledButton.styleFrom(minimumSize: const Size(0, 40), padding: const EdgeInsets.symmetric(horizontal: 14), backgroundColor: Theme.of(context).colorScheme.onSurface, foregroundColor: Theme.of(context).colorScheme.surface, shape: const StadiumBorder()), onPressed: () => context.push('/ws/new'), icon: const Icon(Icons.add, size: 18), label: Text(l.wsNewOrder))),
      ]),
      moreItems: [PopupMenuItem(value: 'inbox', child: Text(unread > 0 ? '${l.notifications} ($unread)' : l.notifications)), PopupMenuItem(value: 'logout', child: Text(l.logout))],
      onMore: (v) { if (v == 'logout') ref.read(authControllerProvider.notifier).signOut(); if (v == 'inbox') unawaited(context.push('/notifications')); },
      bottom: FloatingNav(index: _index, onChanged: (i) => setState(() => _index = i), items: [for (final t in tabs) (icon: t.$2, label: t.$1)]));
  }

  /// One sentence in → the right screen out. Money and legal actions are never voice-executed;
  /// the assistant delivers the user to the action, the action keeps its own explicit tap.
  Future<void> _assistant(L10n l, List<(String, IconData, Widget)> tabs, {required bool partner}) async {
    final said = await showVoiceSheet(context, ref, title: l.assistantTitle);
    if (said == null || said.trim().isEmpty || !mounted) return;
    final cmd = parseAssistant(said, partner: partner);
    if (cmd == null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(partner ? l.assistantTryPartner : l.assistantTryCustomer)));
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('${l.assistantAck} ${cmd.labelAr}'), duration: const Duration(seconds: 2)));
    switch (cmd.target) {
      case AssistantTarget.tow: unawaited(context.push('/tow/new'));
      case AssistantTarget.warranties: unawaited(context.push('/warranties'));
      case AssistantTarget.notifications: unawaited(context.push('/notifications'));
      case AssistantTarget.newOrder: unawaited(context.push('/ws/new'));
      case AssistantTarget.nearbyRequests: unawaited(context.push('/ws/service-requests'));
      default: _goTab(cmd.target, l, tabs);
    }
  }

  void _goTab(AssistantTarget t, L10n l, List<(String, IconData, Widget)> tabs) {
    final label = switch (t) {
      AssistantTarget.wallet => l.tabWallet,
      AssistantTarget.vehicles => l.tabMyCars,
      AssistantTarget.account => l.tabAccount,
      AssistantTarget.serviceRequest || AssistantTarget.partRequest => l.tabRequest,
      AssistantTarget.ordersTab => l.tabOrders,
      AssistantTarget.partsTab => l.tabParts,
      AssistantTarget.today => l.tabToday,
      _ => null,
    };
    final i = label == null ? -1 : tabs.indexWhere((x) => x.$1 == label);
    if (i >= 0) setState(() => _index = i);
  }
}
