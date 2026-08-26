import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/di/core_providers.dart';
import '../../../core/result/result.dart';
import '../../vehicles/domain/vehicle.dart';
import '../../vehicles/presentation/providers.dart';
import '../../workshop/presentation/providers.dart' show currentOrgIdProvider;
import '../data/service_market_repository_impl.dart';
import '../data/service_request_realtime_impl.dart';
import '../domain/service_request.dart';
import '../domain/service_market_repository.dart';

final serviceMarketRepositoryProvider = Provider<ServiceMarketRepository>((ref) => ServiceMarketRepositoryImpl(ref.watch(apiClientProvider)));
final myServiceRequestsProvider = FutureProvider.autoDispose<Result<List<ServiceRequest>>>((ref) => ref.watch(serviceMarketRepositoryProvider).mine());
final nearbyServiceRequestsProvider = FutureProvider.autoDispose<Result<List<ServiceRequest>>>((ref) {
  final org = ref.watch(currentOrgIdProvider);
  if (org == null) return const Result.ok(<ServiceRequest>[]);
  return ref.watch(serviceMarketRepositoryProvider).nearby(orgId: org);
});
final serviceRequestProvider = FutureProvider.autoDispose.family<Result<ServiceRequest>, String>((ref, id) => ref.watch(serviceMarketRepositoryProvider).byId(id));
final serviceRequestRealtimeProvider = Provider<ServiceRequestRealtime>((ref) => ServiceRequestRealtimeImpl(baseUrl: ref.watch(appConfigProvider).apiBaseUrl, tokens: ref.watch(tokenStoreProvider)));
/// Watching this keeps the request screen live: any channel event refetches the request.
final serviceRequestLiveProvider = StreamProvider.autoDispose.family<void, String>((ref, id) {
  final s = ref.watch(serviceRequestRealtimeProvider).changes(id);
  return s.map((e) { ref.invalidate(serviceRequestProvider(id)); ref.invalidate(myServiceRequestsProvider); return e; });
});

/// ورش قريبة من العميل، المتخصّصون بصنع سيارته أولاً.
///
/// يقرأ الموقع مرّةً ويحتفظ به للجلسة (`keepAlive`): الصفحة الرئيسية تُبنى كثيراً، وطلب موقعٍ
/// جديد في كل بناء يستنزف البطارية ويومض الشريط. وبلا موقع لا شريط — ولا خطأ يُعرض: غياب
/// «ورش قريبة» ليس عطلاً يستحق رسالة.
final nearbyShopsProvider = FutureProvider.autoDispose<List<NearbyShop>>((ref) async {
  ref.keepAlive();
  // بلا طلب إذن: من لم يمنحه لا يرى الشريط، ولا تعترضه نافذة لم يطلبها.
  final where = await ref.watch(hereProvider).ifGranted();
  if (where == null) return const [];
  final cars = ref.watch(vehiclesProvider).value?.valueOrNull ?? const <Vehicle>[];
  final makeId = cars.map((v) => v.makeId).whereType<int>().firstOrNull;
  return (await ref.watch(serviceMarketRepositoryProvider).nearbyShops(lat: where.lat, lng: where.lng, makeId: makeId, limit: 8)).valueOrNull ?? const [];
});
