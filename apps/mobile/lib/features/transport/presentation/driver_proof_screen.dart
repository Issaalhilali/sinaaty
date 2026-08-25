import 'package:crypto/crypto.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../../workshop/presentation/providers.dart' show workshopRepositoryProvider;
import 'providers.dart';

/// إثبات التسليم: صورة السيارة عند التسليم + رمز يُقرأ من المستلم.
///
/// هذه هي الخطوة التي تُنهي المهمة وتُفرج عن المال، فلا تُختصر: الصورة تثبت الحال، والرمز يثبت أن
/// من استلم هو صاحب الطلب لا أحداً آخر. الخادم يرفض أياً منهما ناقصاً؛ الشاشة ترتّبهما بالترتيب
/// الذي يحدث به الأمر فعلاً: تصوّر، ثم اطلب الرمز، ثم أدخله.
class DriverProofScreen extends ConsumerStatefulWidget {
  final String jobId;
  /// تُحقن في الاختبارات بصورة جاهزة بدل الكاميرا.
  final Future<Uint8List?> Function()? pickImage;
  const DriverProofScreen({super.key, required this.jobId, this.pickImage});
  @override ConsumerState<DriverProofScreen> createState() => _DriverProofScreenState();
}

class _DriverProofScreenState extends ConsumerState<DriverProofScreen> {
  final _code = TextEditingController();
  String? _mediaId; bool _busy = false; bool _codeSent = false; String? _error;
  @override void dispose() { _code.dispose(); super.dispose(); }

  Future<void> _shoot() async {
    final bytes = await (widget.pickImage?.call() ?? ref.read(driverPickImageProvider)());
    if (bytes == null || !mounted) return;
    setState(() { _busy = true; _error = null; });
    final repo = ref.read(workshopRepositoryProvider);
    final p = await repo.presign(mimeType: 'image/jpeg', sizeBytes: bytes.length, sha256: sha256.convert(bytes).toString(), purpose: 'transport_proof');
    if (!mounted) return;
    await p.when(
      ok: (pre) async {
        final up = await repo.upload(pre, bytes, 'image/jpeg');
        if (!mounted) return;
        up.when(ok: (_) => setState(() { _mediaId = pre.mediaId; _busy = false; }), err: (f) => setState(() { _busy = false; _error = f.message(Localizations.localeOf(context).languageCode); }));
      },
      err: (f) async => setState(() { _busy = false; _error = f.message(Localizations.localeOf(context).languageCode); }),
    );
  }

  Future<void> _sendCode() async {
    setState(() { _busy = true; _error = null; });
    final r = await ref.read(transportRepositoryProvider).sendReceiverCode(widget.jobId);
    if (!mounted) return;
    setState(() { _busy = false; _codeSent = r.isOk; if (!r.isOk) _error = r.failureOrNull?.message(Localizations.localeOf(context).languageCode); });
  }

  Future<void> _complete() async {
    if (_mediaId == null || _code.text.length != 6) return;
    setState(() { _busy = true; _error = null; });
    final r = await ref.read(transportRepositoryProvider).completeWithProof(widget.jobId, mediaId: _mediaId!, code: _code.text);
    if (!mounted) return; setState(() => _busy = false);
    r.when(ok: (_) { ref.invalidate(driverJobsProvider); ref.invalidate(driverOffersProvider); context.pop(); },
        err: (f) => setState(() => _error = f.message(Localizations.localeOf(context).languageCode)));
  }

  @override Widget build(BuildContext context) {
    final l = L10n.of(context); final t = Theme.of(context).textTheme;
    final ready = _mediaId != null && _code.text.length == 6;
    return AppScaffold(
      title: l.drvProofTitle,
      body: ListView(padding: const EdgeInsets.all(SinaatySpace.lg), children: [
        Text(l.drvProofWhy, style: t.bodyMedium?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant)),
        const SizedBox(height: SinaatySpace.lg),
        SectionCard(child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Row(children: [
            Icon(_mediaId != null ? Icons.check_circle : Icons.photo_camera_outlined, size: 20, color: _mediaId != null ? SinaatyColors.seal : Theme.of(context).colorScheme.onSurfaceVariant),
            const SizedBox(width: 8),
            Expanded(child: Text(_mediaId != null ? l.drvPhotoDone : l.drvPhotoStep, style: t.bodyMedium)),
          ]),
          const SizedBox(height: SinaatySpace.md),
          OutlinedButton.icon(onPressed: _busy ? null : _shoot, icon: const Icon(Icons.photo_camera_outlined), label: Text(_mediaId == null ? l.drvTakePhoto : l.drvRetakePhoto)),
        ])),
        const SizedBox(height: SinaatySpace.md),
        SectionCard(child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text(_codeSent ? l.drvCodeSent : l.drvCodeStep, style: t.bodyMedium),
          const SizedBox(height: SinaatySpace.md),
          TextField(
            controller: _code, keyboardType: TextInputType.number, textDirection: TextDirection.ltr, textAlign: TextAlign.center, maxLength: 6,
            style: const TextStyle(fontSize: 24, letterSpacing: 6, fontWeight: FontWeight.w700),
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            decoration: const InputDecoration(counterText: '', hintText: '------'),
            onChanged: (_) => setState(() {}),
          ),
          TextButton(onPressed: _busy ? null : _sendCode, child: Text(_codeSent ? l.drvResendCode : l.drvSendCode)),
        ])),
        if (_error != null) Padding(padding: const EdgeInsets.only(top: SinaatySpace.md), child: Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error))),
      ]),
      primaryAction: PrimaryButton(label: l.drvComplete, loading: _busy, onPressed: ready ? _complete : null),
    );
  }
}
