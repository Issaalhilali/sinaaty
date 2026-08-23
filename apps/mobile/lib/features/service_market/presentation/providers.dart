import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/di/core_providers.dart';
import '../../../core/result/result.dart';
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
