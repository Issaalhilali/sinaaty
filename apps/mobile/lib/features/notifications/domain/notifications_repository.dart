import '../../../core/result/result.dart';
import 'notification.dart';
abstract interface class NotificationsRepository { Future<Result<List<AppNotification>>> inbox(); Future<Result<int>> unreadCount(); Future<Result<void>> markRead(String id); Future<Result<void>> markAllRead(); }
