import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../media/media_providers.dart';
import '../../theme/tokens.dart';

/// A media thumbnail by id: a photo renders as a photo, a voice note as a small player. Loading and
/// no-access states render the same quiet grey box the app used before real images existed — a strip
/// must never turn into a strip of error icons.
class MediaThumb extends ConsumerWidget {
  final String mediaId;
  final double size;
  final BorderRadius? radius;
  const MediaThumb({super.key, required this.mediaId, this.size = 72, this.radius});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final info = ref.watch(mediaInfoProvider(mediaId)).value;
    final r = radius ?? BorderRadius.circular(12);
    final placeholder = Container(
      width: size, height: size,
      decoration: BoxDecoration(color: Theme.of(context).colorScheme.surfaceContainerHighest, borderRadius: r),
      child: Icon(Icons.photo_outlined, color: Theme.of(context).colorScheme.onSurfaceVariant),
    );
    if (info == null) return placeholder;
    if (info.mimeType.startsWith('audio/')) return _AudioTile(url: info.url, size: size, radius: r);
    return ClipRRect(
      borderRadius: r,
      child: Image.network(info.url, width: size, height: size, fit: BoxFit.cover,
        errorBuilder: (_, _, _) => placeholder,
        loadingBuilder: (_, child, progress) => progress == null ? child : placeholder),
    );
  }
}

/// الملاحظة الصوتية: زرّ تشغيل واحد بحجم الصورة — تُسمع الطقطقة بصوت صاحبها بدل وصفها.
/// المشغّل يعيش مع البطاقة ويموت معها؛ ولا يُبنى إلا عند أول تشغيل (رابطٌ موقّع لا يُطلب عبثاً).
class _AudioTile extends StatefulWidget {
  final String url; final double size; final BorderRadius radius;
  const _AudioTile({required this.url, required this.size, required this.radius});
  @override State<_AudioTile> createState() => _AudioTileState();
}

class _AudioTileState extends State<_AudioTile> {
  AudioPlayer? _player;
  bool _playing = false;

  @override void dispose() { _player?.dispose(); super.dispose(); }

  Future<void> _toggle() async {
    final p = _player ??= AudioPlayer()
      ..onPlayerComplete.listen((_) { if (mounted) setState(() => _playing = false); });
    if (_playing) { await p.pause(); if (mounted) setState(() => _playing = false); return; }
    setState(() => _playing = true);
    try { await p.play(UrlSource(widget.url)); }
    catch (_) { if (mounted) setState(() => _playing = false); }
  }

  @override Widget build(BuildContext context) => Semantics(button: true, label: 'تسجيل صوتي', child: InkWell(
    borderRadius: widget.radius, onTap: _toggle,
    child: Container(
      width: widget.size, height: widget.size,
      decoration: BoxDecoration(color: SinaatyColors.sealSoft, borderRadius: widget.radius, border: Border.all(color: SinaatyColors.seal.withValues(alpha: .35))),
      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        AnimatedSwitcher(duration: const Duration(milliseconds: 160),
          child: Icon(_playing ? Icons.pause_circle_filled : Icons.play_circle_fill, key: ValueKey(_playing), size: widget.size * .42, color: SinaatyColors.seal)),
        const SizedBox(height: 2),
        Icon(Icons.graphic_eq, size: widget.size * .2, color: SinaatyColors.seal.withValues(alpha: _playing ? 1 : .55)),
      ]),
    ),
  ));
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
