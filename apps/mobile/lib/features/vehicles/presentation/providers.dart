import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/config/app_config.dart';
import '../../../core/di/core_providers.dart';
import '../../workshop/presentation/providers.dart' show currentOrgIdProvider;
import '../../../core/result/result.dart';
import '../data/vehicles_repository_impl.dart';
import '../domain/vehicle.dart';
import '../domain/vehicles_repository.dart';
final vehiclesRepositoryProvider = Provider<VehiclesRepository>((ref) => VehiclesRepositoryImpl(ref.watch(apiClientProvider)));
/// على المحاكي: مدير الأسطول استورد سيارةً فبقي تبويبه «لا توجد سيارات» — القائمة كانت قائمة *المستخدم*،
/// والسيارة مسجّلة باسم *المنشأة*. في نكهة الأسطول تُقرأ وتُضاف السيارات باسم المنشأة الحالية.
final vehiclesOrgProvider = Provider<String?>((ref) => ref.watch(appConfigProvider).flavor == AppFlavor.fleet ? ref.watch(currentOrgIdProvider) : null);
final vehiclesProvider = FutureProvider.autoDispose<Result<List<Vehicle>>>((ref) => ref.watch(vehiclesRepositoryProvider).list(orgId: ref.watch(vehiclesOrgProvider)));
final passportProvider = FutureProvider.autoDispose.family<Result<VehiclePassport>, String>((ref, id) => ref.watch(vehiclesRepositoryProvider).passport(id));
