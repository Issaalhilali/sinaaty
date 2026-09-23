import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../di/core_providers.dart';

/// ما يعود به `GET /media/:id/download`: رابطٌ موقّع قصير العمر، ونوع الملف — لتُرسم الصورة صورةً والصوت مشغّلاً.
typedef MediaInfo = ({String url, String mimeType});

/// Resolves a media id to a short-lived download URL and its MIME type. The API signs the URL only
/// after checking the caller may read what the file is attached to — the id alone is never a permission.
/// autoDispose + family: URLs expire in minutes, so nothing long-lived is worth caching here.
final mediaInfoProvider = FutureProvider.autoDispose.family<MediaInfo?, String>((ref, mediaId) async {
  try {
    final d = (await ref.watch(apiClientProvider).dio.get<Map<String, dynamic>>('/media/$mediaId/download')).data;
    final url = d?['url'] as String?;
    if (url == null) return null;
    return (url: url, mimeType: (d?['mime_type'] as String?) ?? '');
  } catch (_) {
    return null;   // no access or offline → the thumbnail shows its placeholder, never an error screen
  }
});

/// الرابط وحده — لمن لا يهمّه النوع (المسارات القديمة).
final mediaUrlProvider = FutureProvider.autoDispose.family<String?, String>((ref, mediaId) async => (await ref.watch(mediaInfoProvider(mediaId).future))?.url);
