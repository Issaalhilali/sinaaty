import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/di/core_providers.dart';
import '../../../core/result/result.dart';
import '../data/work_order_realtime_impl.dart';
import '../data/work_orders_repository_impl.dart';
import '../domain/work_order.dart';
import '../domain/work_orders_repository.dart';
final workOrdersRepositoryProvider = Provider<WorkOrdersRepository>((ref) => WorkOrdersRepositoryImpl(ref.watch(apiClientProvider)));
final workOrderRealtimeProvider = Provider<WorkOrderRealtime>((ref) => WorkOrderRealtimeImpl(baseUrl: ref.watch(appConfigProvider).apiBaseUrl, tokens: ref.watch(tokenStoreProvider)));
final workOrdersProvider = FutureProvider.autoDispose<Result<List<WorkOrder>>>((ref) => ref.watch(workOrdersRepositoryProvider).list());
final workOrderProvider = FutureProvider.autoDispose.family<Result<WorkOrder>, String>((ref, id) => ref.watch(workOrdersRepositoryProvider).get(id));
final workOrderTimelineProvider = FutureProvider.autoDispose.family<Result<WoTimeline>, String>((ref, id) => ref.watch(workOrdersRepositoryProvider).timeline(id));
final inspectionDiffProvider = FutureProvider.autoDispose.family<Result<InspectionDiff>, String>((ref, id) => ref.watch(workOrdersRepositoryProvider).inspectionDiff(id));
final workOrderVersionProvider = FutureProvider.autoDispose.family<Result<WoVersion>, ({String id, int version})>((ref, k) => ref.watch(workOrdersRepositoryProvider).version(k.id, k.version));
/// Subscribes to realtime for a work order and invalidates its providers on every tick.
final workOrderLiveProvider = StreamProvider.autoDispose.family<void, String>((ref, id) { final s = ref.watch(workOrderRealtimeProvider).changes(id); return s.map((e) { ref.invalidate(workOrderProvider(id)); ref.invalidate(workOrderTimelineProvider(id)); ref.invalidate(workOrdersProvider); return e; }); });
