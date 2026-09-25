import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/di/core_providers.dart';
import '../../../core/result/result.dart';
import '../data/disputes_repository_impl.dart';
import '../domain/dispute.dart';
import '../domain/disputes_repository.dart';

final disputesRepositoryProvider = Provider<DisputesRepository>((ref) => DisputesRepositoryImpl(ref.watch(apiClientProvider)));
final myDisputesProvider = FutureProvider.autoDispose<Result<List<Dispute>>>((ref) => ref.watch(disputesRepositoryProvider).mine());
final disputeProvider = FutureProvider.autoDispose.family<Result<Dispute>, String>((ref, id) => ref.watch(disputesRepositoryProvider).byId(id));
