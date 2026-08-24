import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../../../core/di/core_providers.dart';
import '../../../core/result/result.dart';
import '../../auth/presentation/providers.dart';
import '../../work_orders/domain/work_order.dart';
import '../data/pending_actions_file.dart';
import '../data/workshop_repository_impl.dart';
import '../domain/workshop.dart';
import '../domain/workshop_repository.dart';
final workshopRepositoryProvider = Provider<WorkshopRepository>((ref) => WorkshopRepositoryImpl(ref.watch(apiClientProvider)));
final pendingActionsProvider = Provider<PendingActions>((_) => FilePendingActions());
/// Every org the member belongs to, active ones first (the server sorts).
final myOrgsProvider = FutureProvider<List<OrgBrief>>((ref) async {
  if (ref.watch(authControllerProvider).me == null) return const [];
  return (await ref.watch(workshopRepositoryProvider).myOrgs()).valueOrNull ?? const [];
});
/// The org the partner app is currently acting as. Falls back to the token's first membership only
/// until the briefs arrive — an old draft org must never be the one the app opens into.
final currentOrgIdProvider = Provider<String?>((ref) =>
    ref.watch(myOrgsProvider).value?.firstOrNull?.id ?? ref.watch(authControllerProvider).me?.orgs.firstOrNull?.orgId);
/// Org type decides the partner tabs (workshop vs supplier) — read off the same list, no extra call.
final currentOrgInfoProvider = FutureProvider<({String type, String nameAr})?>((ref) async {
  final orgs = await ref.watch(myOrgsProvider.future); final id = ref.watch(currentOrgIdProvider);
  for (final o in orgs) { if (o.id == id) return (type: o.type, nameAr: o.nameAr); }
  return null;
});
const supplierOrgTypes = {'scrapyard', 'parts_dealer', 'parts_distributor', 'parts_brand_agent'};
final orgOrdersProvider = FutureProvider.autoDispose<Result<List<WorkOrder>>>((ref) async { final org = ref.watch(currentOrgIdProvider); if (org == null) return const Result.ok([]); return ref.watch(workshopRepositoryProvider).orgOrders(org); });
/// الأوامر التي صدرت لها فاتورة — نداء واحد يكشف ما سُلّم بلا مطالبة بالمال.
final invoicedWorkOrderIdsProvider = FutureProvider.autoDispose<Result<Set<String>>>((ref) async {
  final org = ref.watch(currentOrgIdProvider); if (org == null) return const Result.ok(<String>{});
  return ref.watch(workshopRepositoryProvider).invoicedWorkOrderIds(org);
});
final abandonedStatusProvider = FutureProvider.autoDispose.family<Result<AbandonedStatus>, String>((ref, woId) => ref.watch(workshopRepositoryProvider).abandonedStatus(woId));
final orgWalletProvider = FutureProvider.autoDispose<Result<OrgWallet>>((ref) async { final org = ref.watch(currentOrgIdProvider); if (org == null) return const Result.err(UnknownFailure()); return ref.watch(workshopRepositoryProvider).wallet(org); });

/// Offline-first for the two daily actions (status update, photo attach): try now; on network failure queue and replay later.
class SyncController extends Notifier<int> {
  Timer? _timer;
  @override int build() { Future.microtask(_refreshCount); _timer = Timer.periodic(const Duration(seconds: 20), (_) => sync()); ref.onDispose(() => _timer?.cancel()); return 0; }
  Future<void> _refreshCount() async => state = (await ref.read(pendingActionsProvider).all()).length;
  Future<Result<void>> _perform(PendingAction a) async {
    final repo = ref.read(workshopRepositoryProvider); final p = a.payload;
    return switch (a.kind) {
      'transition' => (await repo.transition(p['woId'] as String, p['to'] as String, noteAr: p['noteAr'] as String?)).map((_) {}),
      'attach_media' => repo.attachMedia(p['woId'] as String, (p['mediaIds'] as List).cast<String>(), label: (p['label'] as String?) ?? 'progress'),
      _ => Future.value(const Result.ok(null)),
    };
  }
  /// Run now; if offline, persist and report queued=true.
  Future<({bool queued, Failure? failure})> run(String kind, Map<String, dynamic> payload) async {
    final a = PendingAction(id: const Uuid().v7(), kind: kind, payload: payload, createdAt: DateTime.now());
    final r = await _perform(a);
    return r.when(ok: (_) => (queued: false, failure: null), err: (f) async { if (f is NetworkFailure) { await ref.read(pendingActionsProvider).add(a); await _refreshCount(); return (queued: true, failure: null); } return (queued: false, failure: f); });
  }
  /// Replay queued actions in order; stop at the first network failure (still offline).
  Future<int> sync() async {
    final q = ref.read(pendingActionsProvider); var done = 0;
    for (final a in await q.all()) { final r = await _perform(a); final stop = r.when(ok: (_) => false, err: (f) => f is NetworkFailure); if (stop) break; await q.remove(a.id); done++; }
    await _refreshCount(); if (done > 0) ref.invalidate(orgOrdersProvider); return done;
  }
}
final syncControllerProvider = NotifierProvider<SyncController, int>(SyncController.new);
