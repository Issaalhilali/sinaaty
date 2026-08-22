import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import '../api/api_error_mapper.dart';
import '../di/core_providers.dart';
import '../result/result.dart';

/// Feature flags from `GET /v1/config` (pilot spec). A flag is a license to HIDE, never to show:
/// an entry point disappears only on an explicit `false`; a missing flag — or a failed load —
/// leaves everything visible, because the server enforces the gate anyway (charter §5.0 #3).
class FeatureFlags {
  final Map<String, bool> features;
  const FeatureFlags(this.features);
  static const allVisible = FeatureFlags({});
  bool enabled(String flag) => features[flag] != false;
}

/// Known flag names (mirrors apps/api pilot/domain/feature-flags.ts).
abstract final class Flags {
  static const tow = 'tow';
  static const partsMarketplace = 'parts_marketplace';
  static const tradeAccounts = 'trade_accounts';
  static const accidentReports = 'accident_reports';
  static const warrantyWallet = 'warranty_wallet';
  static const aiInspection = 'ai_inspection';
  static const disputes = 'disputes';
  static const serviceMarketplace = 'service_marketplace';
  static const voiceToInvoice = 'voice_to_invoice';
}

abstract interface class FlagsRepository {
  Future<Result<FeatureFlags>> load({String? orgId});
}

class FlagsRepositoryImpl implements FlagsRepository {
  final ApiClient api;
  FlagsRepositoryImpl(this.api);
  @override Future<Result<FeatureFlags>> load({String? orgId}) async {
    try {
      final j = (await api.dio.get<Map<String, dynamic>>('/config', queryParameters: {'org_id': ?orgId})).data!;
      final f = (j['features'] as Map?)?.cast<String, dynamic>() ?? const <String, dynamic>{};
      return Result.ok(FeatureFlags({for (final e in f.entries) if (e.value is bool) e.key: e.value as bool}));
    } catch (e) {
      return Result.err(mapDioError(e));
    }
  }
}

final flagsRepositoryProvider = Provider<FlagsRepository>((ref) => FlagsRepositoryImpl(ref.watch(apiClientProvider)));

/// Flags for one subject (org id, or null for the signed-in user). Refreshes when invalidated
/// (e.g. after switching orgs). Any failure resolves to [FeatureFlags.allVisible].
final featureFlagsProvider = FutureProvider.family<FeatureFlags, String?>((ref, orgId) async {
  final r = await ref.watch(flagsRepositoryProvider).load(orgId: orgId);
  return r.when(ok: (f) => f, err: (_) => FeatureFlags.allVisible);
});
