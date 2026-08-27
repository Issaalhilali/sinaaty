import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/di/core_providers.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import 'providers.dart';

/// تسجيل المنشأة الذاتي.
///
/// صاحب ورشة كان يُنزّل التطبيق فلا يجد ما يفعله: لا مسار تسجيل إطلاقاً، والمنشآت تُنشأ من لوحة
/// التحكم وحدها. وسوقٌ لا ينضمّ إليه المزوّدون بأنفسهم لا ينمو.
///
/// ثلاث خطوات لا أكثر — وكلٌّ منها تسأل شيئاً واحداً:
///   ١. من أنت (اسم ونوع نشاط؛ السجل التجاري اختياري هنا ويُطلب مع الوثائق).
///   ٢. أين أنت — وهو أهمّها: الموقع يقرّر من يصله الطلب، ويُقرأ من الجهاز لا يُكتب.
///   ٣. وثيقتان للتحقّق.
/// ثم يذهب للمراجعة، ويعرف صاحبه بالضبط أين وقف.
class OnboardScreen extends ConsumerStatefulWidget {
  final Future<Uint8List?> Function()? pickImage;
  const OnboardScreen({super.key, this.pickImage});
  @override ConsumerState<OnboardScreen> createState() => _OnboardScreenState();
}

const _types = [
  ('workshop', 'obTypeWorkshop'), ('body_shop', 'obTypeBody'), ('service_center', 'obTypeService'),
  ('scrapyard', 'obTypeScrap'), ('parts_dealer', 'obTypeParts'),
];

class _OnboardScreenState extends ConsumerState<OnboardScreen> {
  final _name = TextEditingController(); final _cr = TextEditingController();
  final _city = TextEditingController(); final _district = TextEditingController();
  String _type = 'workshop';
  int _step = 0;
  String? _orgId;
  ({double lat, double lng})? _place;
  bool _busy = false, _locating = false;
  final _docs = <String, bool>{'commercial_registration': false, 'owner_id': false};
  String? _error;

  @override void dispose() { _name.dispose(); _cr.dispose(); _city.dispose(); _district.dispose(); super.dispose(); }

  String _label(L10n l, String key) => switch (key) {
    'obTypeWorkshop' => l.obTypeWorkshop, 'obTypeBody' => l.obTypeBody, 'obTypeService' => l.obTypeService,
    'obTypeScrap' => l.obTypeScrap, _ => l.obTypeParts,
  };

  Future<void> _locate() async {
    setState(() => _locating = true);
    final p = await ref.read(hereProvider).now();
    if (!mounted) return;
    setState(() { _place = p; _locating = false; if (p == null) _error = L10n.of(context).srLocateFailed; });
  }

  Future<void> _createThenNext() async {
    setState(() { _busy = true; _error = null; });
    final r = await ref.read(workshopRepositoryProvider).registerOrg(
      type: _type, legalNameAr: _name.text.trim(), tradeNameAr: _name.text.trim(),
      crNumber: _cr.text.trim().isEmpty ? null : _cr.text.trim(),
    );
    if (!mounted) return;
    r.when(
      ok: (id) { setState(() { _orgId = id; _step = 1; _busy = false; }); unawaited(_locate()); },
      err: (f) => setState(() { _error = f.message(ref.read(localeProvider)); _busy = false; }),
    );
  }

  Future<void> _saveLocation() async {
    if (_place == null || _city.text.trim().isEmpty) return;
    setState(() { _busy = true; _error = null; });
    final r = await ref.read(workshopRepositoryProvider).setOrgLocation(_orgId!,
        city: _city.text.trim(), district: _district.text.trim().isEmpty ? null : _district.text.trim(),
        lat: _place!.lat, lng: _place!.lng);
    if (!mounted) return;
    r.when(ok: (_) => setState(() { _step = 2; _busy = false; }),
        err: (f) => setState(() { _error = f.message(ref.read(localeProvider)); _busy = false; }));
  }

  Future<void> _attach(String type) async {
    Uint8List? bytes;
    if (widget.pickImage != null) {
      bytes = await widget.pickImage!();
    } else {
      final x = await ImagePicker().pickImage(source: ImageSource.camera, imageQuality: 80, maxWidth: 2000);
      bytes = x == null ? null : await x.readAsBytes();
    }
    if (bytes == null || !mounted) return;
    setState(() { _busy = true; _error = null; });
    final repo = ref.read(workshopRepositoryProvider);
    final pre = await repo.presign(mimeType: 'image/jpeg', sizeBytes: bytes.length, sha256: 'x' * 64, purpose: 'kyb');
    final p = pre.valueOrNull;
    if (p == null) { if (mounted) setState(() { _busy = false; _error = L10n.of(context).errorGeneric; }); return; }
    await repo.upload(p, bytes, 'image/jpeg');
    final r = await repo.addKybDoc(_orgId!, type: type, mediaId: p.mediaId);
    if (!mounted) return;
    r.when(ok: (_) => setState(() { _docs[type] = true; _busy = false; }),
        err: (f) => setState(() { _error = f.message(ref.read(localeProvider)); _busy = false; }));
  }

  Future<void> _submit() async {
    setState(() { _busy = true; _error = null; });
    final r = await ref.read(workshopRepositoryProvider).submitForReview(_orgId!);
    if (!mounted) return;
    r.when(
      ok: (_) { ref.invalidate(myOrgsProvider); if (mounted) setState(() { _step = 3; _busy = false; }); },
      err: (f) => setState(() { _error = f.message(ref.read(localeProvider)); _busy = false; }),
    );
  }

  @override Widget build(BuildContext context) {
    final l = L10n.of(context); final t = Theme.of(context).textTheme; final cs = Theme.of(context).colorScheme;
    final steps = [l.obStepInfo, l.obStepPlace, l.obStepDocs];

    return AppScaffold(title: l.obTitle, body: ListView(
      padding: EdgeInsets.fromLTRB(SinaatySpace.lg, SinaatySpace.sm, SinaatySpace.lg, SinaatySpace.bottomClearance(context)),
      children: [
        if (_step < 3) ...[
          Text(l.obBody, style: t.bodyMedium?.copyWith(color: cs.onSurfaceVariant)),
          const SizedBox(height: SinaatySpace.lg),
          // أين وقف: ثلاث نقاط لا شريط تقدّم غامض.
          Row(children: [
            for (var i = 0; i < steps.length; i++) ...[
              if (i > 0) const SizedBox(width: 8),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Container(height: 4, decoration: BoxDecoration(
                    color: i <= _step ? cs.primary : cs.outlineVariant, borderRadius: BorderRadius.circular(2))),
                const SizedBox(height: 6),
                Text(steps[i], style: t.labelSmall?.copyWith(color: i <= _step ? cs.onSurface : cs.onSurfaceVariant)),
              ])),
            ],
          ]),
          const SizedBox(height: SinaatySpace.xl),
        ],

        if (_step == 0) ...[
          TextField(controller: _name, autofocus: true, onChanged: (_) => setState(() {}),
              decoration: InputDecoration(labelText: l.obName, hintText: l.obNameHint)),
          const SizedBox(height: SinaatySpace.md),
          Text(l.obType, style: t.titleSmall),
          const SizedBox(height: SinaatySpace.sm),
          Wrap(spacing: 8, runSpacing: 8, children: [
            for (final (code, key) in _types)
              ChoiceChip(label: Text(_label(l, key)), selected: _type == code, onSelected: (_) => setState(() => _type = code)),
          ]),
          const SizedBox(height: SinaatySpace.md),
          TextField(controller: _cr, keyboardType: TextInputType.number, textDirection: TextDirection.ltr,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(10)],
              decoration: InputDecoration(labelText: l.obCr, hintText: l.obCrHint, helperText: l.obCrOptional)),
          const SizedBox(height: SinaatySpace.xl),
          if (_error != null) InlineError(message: _error!, retryLabel: l.retry),
          PrimaryButton(label: l.obCreate, loading: _busy,
              onPressed: _name.text.trim().length < 2 ? null : _createThenNext),
        ],

        if (_step == 1) ...[
          Text(l.obLocation, style: t.titleLarge),
          const SizedBox(height: 4),
          Text(l.obLocationBody, style: t.bodyMedium?.copyWith(color: cs.onSurfaceVariant, height: 1.55)),
          const SizedBox(height: SinaatySpace.lg),
          SectionCard(child: Row(children: [
            Icon(_place != null ? Icons.my_location : Icons.location_searching, color: _place != null ? cs.primary : cs.onSurfaceVariant),
            const SizedBox(width: SinaatySpace.md),
            Expanded(child: Text(_place != null ? l.srHere : (_locating ? l.srLocating : l.obUseMyLocation),
                style: t.titleSmall)),
            if (_place == null && !_locating) TextButton(onPressed: _locate, child: Text(l.obUseMyLocation)),
          ])),
          const SizedBox(height: SinaatySpace.md),
          TextField(controller: _city, onChanged: (_) => setState(() {}), decoration: InputDecoration(labelText: l.obCity)),
          const SizedBox(height: SinaatySpace.md),
          TextField(controller: _district, decoration: InputDecoration(labelText: l.obDistrict)),
          const SizedBox(height: SinaatySpace.xl),
          if (_error != null) InlineError(message: _error!, retryLabel: l.retry),
          PrimaryButton(label: l.obNext, loading: _busy,
              onPressed: (_place == null || _city.text.trim().isEmpty) ? null : _saveLocation),
        ],

        if (_step == 2) ...[
          Text(l.obDocs, style: t.titleLarge),
          const SizedBox(height: 4),
          Text(l.obDocsBody, style: t.bodyMedium?.copyWith(color: cs.onSurfaceVariant, height: 1.55)),
          const SizedBox(height: SinaatySpace.lg),
          SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm), child: Column(children: [
            for (final (type, label) in [('commercial_registration', l.obDocCr), ('owner_id', l.obDocId)])
              AppListRow(
                icon: _docs[type]! ? Icons.check_circle_outline : Icons.upload_file_outlined,
                title: label,
                trailing: _docs[type]!
                    ? StatusBadge(l.obUploaded, tone: BadgeTone.seal)
                    : TextButton(onPressed: _busy ? null : () => _attach(type), child: Text(l.obUpload)),
              ),
          ])),
          const SizedBox(height: SinaatySpace.xl),
          if (_error != null) InlineError(message: _error!, retryLabel: l.retry),
          PrimaryButton(label: l.obSubmit, loading: _busy,
              onPressed: _docs.values.every((v) => v) ? _submit : null),
        ],

        if (_step == 3) ...[
          const SizedBox(height: SinaatySpace.xl),
          SealCard(child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Row(children: [
              const Icon(Icons.hourglass_top, color: Colors.white),
              const SizedBox(width: SinaatySpace.sm),
              Expanded(child: Text(l.obPending, style: t.titleLarge?.copyWith(color: Colors.white))),
            ]),
            const SizedBox(height: SinaatySpace.sm),
            Text(l.obPendingBody, style: t.bodyMedium?.copyWith(color: Colors.white.withValues(alpha: .82), height: 1.6)),
          ])),
        ],
      ],
    ));
  }
}
