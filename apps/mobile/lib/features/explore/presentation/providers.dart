import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/di/core_providers.dart';
import '../data/explore_repository_impl.dart';
import '../domain/explore.dart';

final exploreRepositoryProvider = Provider<ExploreRepository>((ref) => ExploreRepositoryImpl(ref.watch(apiClientProvider).dio));

/// الرياض مركزاً حين لا موقع — التجربة تبدأ من هنا، والموقع الحقيقي يشحذها إن مُنح.
const kFallbackLat = 24.7136, kFallbackLng = 46.6753;

/// نتيجة الاستكشاف لنصّ بحث (فارغ = القريب فقط). الموقع يُطلب مرة ويسقط بهدوء إلى الرياض.
final nearbyOrgsProvider = FutureProvider.autoDispose.family<List<NearbyOrg>, String>((ref, q) async {
  final here = await ref.watch(hereProvider).ifGranted();
  final r = await ref.watch(exploreRepositoryProvider).nearby(
      lat: here?.lat ?? kFallbackLat, lng: here?.lng ?? kFallbackLng, q: q.isEmpty ? null : q);
  return r.valueOrNull ?? const [];
});

/// الملف العام لمنشأة واحدة — للضيف.
final guestOrgProvider = FutureProvider.autoDispose.family<GuestOrgProfile, String>((ref, id) async {
  final r = await ref.watch(exploreRepositoryProvider).publicProfile(id);
  return r.when(ok: (v) => v, err: (f) => throw f);
});
