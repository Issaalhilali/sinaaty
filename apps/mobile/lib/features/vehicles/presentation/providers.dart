import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/di/core_providers.dart';
import '../../../core/result/result.dart';
import '../data/vehicles_repository_impl.dart';
import '../domain/vehicle.dart';
import '../domain/vehicles_repository.dart';
final vehiclesRepositoryProvider = Provider<VehiclesRepository>((ref) => VehiclesRepositoryImpl(ref.watch(apiClientProvider)));
final vehiclesProvider = FutureProvider.autoDispose<Result<List<Vehicle>>>((ref) => ref.watch(vehiclesRepositoryProvider).list());
final passportProvider = FutureProvider.autoDispose.family<Result<VehiclePassport>, String>((ref, id) => ref.watch(vehiclesRepositoryProvider).passport(id));
