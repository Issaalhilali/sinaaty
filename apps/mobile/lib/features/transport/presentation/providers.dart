import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/di/core_providers.dart';
import '../../../core/result/result.dart';
import '../data/transport_realtime_impl.dart';
import '../data/transport_repository_impl.dart';
import '../domain/transport.dart';
import '../domain/transport_repository.dart';

final transportRepositoryProvider = Provider<TransportRepository>((ref) => TransportRepositoryImpl(ref.watch(apiClientProvider)));
final myTowJobsProvider = FutureProvider.autoDispose<Result<List<TransportJob>>>((ref) => ref.watch(transportRepositoryProvider).myJobs());
final towJobProvider = FutureProvider.autoDispose.family<Result<TransportJob>, String>((ref, id) => ref.watch(transportRepositoryProvider).job(id));
final transportRealtimeProvider = Provider<TransportRealtime>((ref) => TransportRealtimeImpl(baseUrl: ref.watch(appConfigProvider).apiBaseUrl, tokens: ref.watch(tokenStoreProvider)));
