import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../di/core_providers.dart';

/// Resolves a media id to a short-lived download URL. The API signs the URL only after checking the
/// caller may read what the file is attached to — the id alone is never a permission.
/// autoDispose + family: URLs expire in minutes, so nothing long-lived is worth caching here.
final mediaUrlProvider = FutureProvider.autoDispose.family<String?, String>((ref, mediaId) async {
  try {
    final d = (await ref.watch(apiClientProvider).dio.get<Map<String, dynamic>>('/media/$mediaId/download')).data;
    return d?['url'] as String?;
  } catch (_) {
    return null;   // no access or offline → the thumbnail shows its placeholder, never an error screen
  }
});
