import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../media/media_providers.dart';

/// A photo thumbnail by media id. Loading and no-access states render the same quiet grey box the app
/// used before real images existed — a photo strip must never turn into a strip of error icons.
class MediaThumb extends ConsumerWidget {
  final String mediaId;
  final double size;
  final BorderRadius? radius;
  const MediaThumb({super.key, required this.mediaId, this.size = 72, this.radius});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final url = ref.watch(mediaUrlProvider(mediaId)).value;
    final r = radius ?? BorderRadius.circular(12);
    final placeholder = Container(
      width: size, height: size,
      decoration: BoxDecoration(color: Theme.of(context).colorScheme.surfaceContainerHighest, borderRadius: r),
      child: Icon(Icons.photo_outlined, color: Theme.of(context).colorScheme.onSurfaceVariant),
    );
    if (url == null) return placeholder;
    return ClipRRect(
      borderRadius: r,
      child: Image.network(url, width: size, height: size, fit: BoxFit.cover,
        errorBuilder: (_, _, _) => placeholder,
        loadingBuilder: (_, child, progress) => progress == null ? child : placeholder),
    );
  }
}

/// A horizontal strip of [MediaThumb]s — the shape both inspection screens share.
/// Empty renders nothing by default: a lone dash in a card is noise. Pass [showEmptyDash] only where
/// "no photos" is itself information (the condition comparison, where an empty side means something).
class MediaStrip extends StatelessWidget {
  final List<String> mediaIds;
  final double size;
  final bool showEmptyDash;
  const MediaStrip({super.key, required this.mediaIds, this.size = 72, this.showEmptyDash = false});
  @override
  Widget build(BuildContext context) => mediaIds.isEmpty
      ? (showEmptyDash ? Text('—', style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)) : const SizedBox.shrink())
      : SizedBox(height: size, child: ListView.separated(
          scrollDirection: Axis.horizontal, itemCount: mediaIds.length,
          separatorBuilder: (_, _) => const SizedBox(width: 8),
          itemBuilder: (_, i) => MediaThumb(mediaId: mediaIds[i], size: size)));
}
