import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/format/format.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../domain/notification.dart';
import 'providers.dart';
class InboxScreen extends ConsumerWidget {
  const InboxScreen({super.key});
  /// `sinaaty://work-orders/{id}/approve` → in-app route.
  static String? routeFor(String? deepLink) { if (deepLink == null) return null; final u = Uri.tryParse(deepLink); if (u == null || u.scheme != 'sinaaty') return null; return '/${u.host}${u.path}'; }
  @override Widget build(BuildContext context, WidgetRef ref) {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode; final v = ref.watch(inboxProvider);
    return AppScaffold(title: l.notifications, moreItems: [PopupMenuItem(value: 'read', child: Text(l.markAllRead))], onMore: (_) async { await ref.read(notificationsRepositoryProvider).markAllRead(); ref.invalidate(inboxProvider); ref.invalidate(unreadCountProvider); },
      body: AsyncResultView<List<AppNotification>>(value: v, onRetry: () => ref.invalidate(inboxProvider), builder: (list) => list.isEmpty ? EmptyState(icon: Icons.notifications_none, title: l.notificationsEmpty, body: '') : RefreshIndicator(onRefresh: () async => ref.invalidate(inboxProvider), child: ListView.separated(padding: const EdgeInsets.all(SinaatySpace.lg), itemCount: list.length, separatorBuilder: (_, _) => const Divider(height: 1), itemBuilder: (_, i) { final n = list[i]; final route = routeFor(n.deepLink); return AppListRow(icon: n.read ? Icons.notifications_none : Icons.notifications_active_outlined, title: locale == 'ar' ? n.titleAr : (n.titleEn ?? n.titleAr), subtitle: '${locale == 'ar' ? n.bodyAr : (n.bodyEn ?? n.bodyAr)}\n${Fmt.dateTime(n.createdAt, locale: locale)}', onTap: route == null ? null : () async { await ref.read(notificationsRepositoryProvider).markRead(n.id); ref.invalidate(unreadCountProvider); if (context.mounted) await context.push(route); }); }))));
  }
}
