import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/di/core_providers.dart';
import '../../../core/result/result.dart';
import '../../workshop/presentation/providers.dart' show currentOrgIdProvider;
import '../data/fleet_repository_impl.dart';
import '../domain/fleet.dart';
import '../domain/fleet_repository.dart';

final fleetRepositoryProvider = Provider<FleetRepository>((ref) => FleetRepositoryImpl(ref.watch(apiClientProvider)));
final fleetOverviewProvider = FutureProvider.autoDispose<Result<FleetOverview>>((ref) async {
  final org = ref.watch(currentOrgIdProvider);
  if (org == null) return const Result.err(UnknownFailure());
  return ref.watch(fleetRepositoryProvider).overview(org);
});
final fleetPendingProvider = FutureProvider.autoDispose<Result<List<FleetPending>>>((ref) async {
  final org = ref.watch(currentOrgIdProvider);
  if (org == null) return const Result.ok([]);
  return ref.watch(fleetRepositoryProvider).pending(org);
});
final fleetStatementsProvider = FutureProvider.autoDispose<Result<List<FleetStatement>>>((ref) async {
  final org = ref.watch(currentOrgIdProvider);
  if (org == null) return const Result.ok([]);
  return ref.watch(fleetRepositoryProvider).statements(org);
});
final fleetStatementProvider = FutureProvider.autoDispose.family<Result<FleetStatement>, String>((ref, id) => ref.watch(fleetRepositoryProvider).statement(id));
