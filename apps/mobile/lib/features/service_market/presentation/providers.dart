import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/di/core_providers.dart';
import '../../../core/result/result.dart';
import '../data/service_market_repository_impl.dart';
import '../domain/service_request.dart';
import '../domain/service_market_repository.dart';

final serviceMarketRepositoryProvider = Provider<ServiceMarketRepository>((ref) => ServiceMarketRepositoryImpl(ref.watch(apiClientProvider)));
final myServiceRequestsProvider = FutureProvider.autoDispose<Result<List<ServiceRequest>>>((ref) => ref.watch(serviceMarketRepositoryProvider).mine());
final nearbyServiceRequestsProvider = FutureProvider.autoDispose<Result<List<ServiceRequest>>>((ref) => ref.watch(serviceMarketRepositoryProvider).nearby());
final serviceRequestProvider = FutureProvider.autoDispose.family<Result<ServiceRequest>, String>((ref, id) => ref.watch(serviceMarketRepositoryProvider).byId(id));
