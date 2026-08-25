import 'dart:typed_data';

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
// ---- السائق
final driverProfileProvider = FutureProvider.autoDispose<Result<DriverProfile>>((ref) => ref.watch(transportRepositoryProvider).driverMe());
final driverJobsProvider = FutureProvider.autoDispose<Result<List<TransportJob>>>((ref) => ref.watch(transportRepositoryProvider).driverJobs());
final driverOffersProvider = FutureProvider.autoDispose<Result<List<TransportJob>>>((ref) => ref.watch(transportRepositoryProvider).offers());
/// الكاميرا تُحقن كي تعمل الاختبارات والمحاكي بصورة جاهزة (نفس نمط فحص الاستلام عند الورشة).
final driverPickImageProvider = Provider<Future<Uint8List?> Function()>((ref) => () async => null);

final transportRealtimeProvider = Provider<TransportRealtime>((ref) => TransportRealtimeImpl(baseUrl: ref.watch(appConfigProvider).apiBaseUrl, tokens: ref.watch(tokenStoreProvider)));
