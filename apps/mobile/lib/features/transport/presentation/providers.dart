import 'dart:typed_data';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
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
/// الكاميرا الحقيقية. كان الافتراضي `() async => null` — بديل الاختبارات تسرّب إلى الإنتاج، فزرّ
/// «التقط صورة» على الجهاز لا يفعل شيئاً، والصورة شرطُ التسليم: **ما كان سائقٌ ليُنهي مهمةً قط**.
final driverPickImageProvider = Provider<Future<Uint8List?> Function()>((ref) => () async {
  final x = await ImagePicker().pickImage(source: ImageSource.camera, imageQuality: 80, maxWidth: 1600);
  return x?.readAsBytes();
});

final transportRealtimeProvider = Provider<TransportRealtime>((ref) => TransportRealtimeImpl(baseUrl: ref.watch(appConfigProvider).apiBaseUrl, tokens: ref.watch(tokenStoreProvider)));
