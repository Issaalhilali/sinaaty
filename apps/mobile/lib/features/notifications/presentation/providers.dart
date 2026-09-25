import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/di/core_providers.dart';
import '../../../core/result/result.dart';
import '../data/notifications_repository_impl.dart';
import '../domain/notification.dart';
import '../domain/notifications_repository.dart';
final notificationsRepositoryProvider = Provider<NotificationsRepository>((ref) => NotificationsRepositoryImpl(ref.watch(apiClientProvider)));
final inboxProvider = FutureProvider.autoDispose<Result<List<AppNotification>>>((ref) => ref.watch(notificationsRepositoryProvider).inbox());
final unreadCountProvider = FutureProvider.autoDispose<int>((ref) async => (await ref.watch(notificationsRepositoryProvider).unreadCount()).valueOrNull ?? 0);
