import '../../../core/api/api_client.dart';
import '../../../core/api/api_error_mapper.dart';
import '../../../core/result/result.dart';
import '../domain/notification.dart';
import '../domain/notifications_repository.dart';
class NotificationsRepositoryImpl implements NotificationsRepository {
  final ApiClient api; NotificationsRepositoryImpl(this.api);
  Future<Result<T>> _run<T>(Future<T> Function() f) async { try { return Result.ok(await f()); } catch (e) { return Result.err(mapDioError(e)); } }
  @override Future<Result<List<AppNotification>>> inbox() => _run(() async => (await api.dio.get<List<dynamic>>('/me/notifications')).data!.cast<Map<String, dynamic>>().map((n) => AppNotification(id: n['id'] as String, templateCode: (n['templateCode'] ?? '') as String, titleAr: (n['titleAr'] ?? '') as String, bodyAr: n['bodyAr'] as String, titleEn: n['titleEn'] as String?, bodyEn: n['bodyEn'] as String?, deepLink: (n['data'] as Map?)?['deep_link'] as String?, read: n['readAt'] != null, createdAt: DateTime.parse(n['createdAt'] as String))).toList());
  @override Future<Result<int>> unreadCount() => _run(() async => ((await api.dio.get<Map<String, dynamic>>('/me/notifications/unread-count')).data!['unread'] as num).toInt());
  @override Future<Result<void>> markRead(String id) => _run(() async { await api.dio.post<void>('/me/notifications/$id/read'); });
  @override Future<Result<void>> markAllRead() => _run(() async { await api.dio.post<void>('/me/notifications/read-all'); });
}
