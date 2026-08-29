import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/scan/doc_text.dart';
import '../../../core/scan/vin_scan_button.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../domain/istimara.dart';
import 'providers.dart';

/// إضافة مركبة: صورة الاستمارة أولاً، والكتابة اليدوية تحتها لمن أرادها.
///
/// **لماذا هذا الترتيب:** أثقل حقلين في المنتج هما رقم الهيكل (١٧ خانة) واللوحة، والاستمارة في
/// السيارة تحمل الاثنين مع السنة والماركة. صورةٌ واحدة تُغني عن كتابتها كلها.
///
/// **وما لا نفعله:** لا نعتمد ما قُرئ بصمت. القارئ الضوئي يخطئ، واستمارةٌ تُقرأ خطأً تُنشئ سجلاً
/// على سيارةٍ أخرى — فيُعرض ما قُرئ في الحقول نفسها ليراه صاحبه ويصحّحه قبل الحفظ.
class AddVehicleScreen extends ConsumerStatefulWidget {
  /// تُحقن في الاختبارات بمسار صورة جاهز بدل الكاميرا.
  final Future<String?> Function()? pickPhoto;
  const AddVehicleScreen({super.key, this.pickPhoto});
  @override ConsumerState<AddVehicleScreen> createState() => _AddVehicleScreenState();
}

class _AddVehicleScreenState extends ConsumerState<AddVehicleScreen> {
  final _vin = TextEditingController();
  final _plate = TextEditingController();
  bool _busy = false; bool _reading = false; String? _error; IstimaraRead? _read;

  @override void dispose() { _vin.dispose(); _plate.dispose(); super.dispose(); }

  Future<void> _shootIstimara() async {
    final l = L10n.of(context);
    final path = await (widget.pickPhoto?.call() ??
        ImagePicker().pickImage(source: ImageSource.camera, maxWidth: 2400).then((x) => x?.path));
    if (path == null || !mounted) return;
    setState(() { _reading = true; _error = null; });
    final text = await ref.read(docTextReaderProvider).read(path);
    if (!mounted) return;
    final read = text == null ? const IstimaraRead() : parseIstimara(text);
    setState(() {
      _reading = false;
      _read = read;
      if (read.vin != null) _vin.text = read.vin!;
      if (read.plate != null) _plate.text = read.plate!;
      // لا شيء قُرئ: تُقال الحقيقة ولا تُترك الشاشة صامتة كأن الزرّ لا يعمل.
      if (read.isEmpty) _error = l.istUnreadable;
    });
  }

  Future<void> _submit() async {
    final l = L10n.of(context);
    final vin = _vin.text.trim().toUpperCase(); final plate = _plate.text.trim();
    if (vin.isEmpty && plate.isEmpty) { setState(() => _error = l.addCarNeedOne); return; }
    setState(() { _busy = true; _error = null; });
    final r = await ref.read(vehiclesRepositoryProvider).add(vin: vin.isEmpty ? null : vin, plate: plate.isEmpty ? null : plate);
    if (!mounted) return; setState(() => _busy = false);
    r.when(ok: (_) { ref.invalidate(vehiclesProvider); context.pop(); },
        err: (f) => setState(() => _error = f.message(Localizations.localeOf(context).languageCode)));
  }

  @override Widget build(BuildContext context) {
    final l = L10n.of(context); final t = Theme.of(context).textTheme;
    final read = _read;
    return AppScaffold(
      title: l.addCarTitle,
      body: ListView(padding: const EdgeInsets.all(SinaatySpace.lg), children: [
        SealCard(child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(l.istTitle, style: t.titleMedium?.copyWith(color: Colors.white)),
          const SizedBox(height: 4),
          Text(l.istWhy, style: t.bodySmall?.copyWith(color: Colors.white.withValues(alpha: .85))),
          const SizedBox(height: SinaatySpace.md),
          SealButton(label: l.istShoot, icon: Icons.document_scanner_outlined, loading: _reading, onPressed: _shootIstimara),
        ])),
        if (read != null && !read.isEmpty) ...[
          const SizedBox(height: SinaatySpace.md),
          // ما قُرئ يُقال صراحةً: من يرى «قرأتُ ٣ حقول» يعرف أن الرابع عليه هو.
          SectionCard(child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Row(children: [
              const Icon(Icons.auto_awesome, size: 18, color: SinaatyColors.seal), const SizedBox(width: 8),
              Expanded(child: Text(l.istRead(read.found), style: t.bodyMedium)),
            ]),
            if (read.makeEn != null || read.year != null) Padding(padding: const EdgeInsets.only(top: 6),
              child: Text([if (read.makeEn != null) read.makeEn!, if (read.year != null) '${read.year}'].join(' · '),
                  style: t.bodySmall?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant))),
            Padding(padding: const EdgeInsets.only(top: 6), child: Text(l.istCheck, style: t.bodySmall?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant))),
          ])),
        ],
        const SizedBox(height: SinaatySpace.lg),
        Text(l.addCarSubtitle, style: t.bodyMedium?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant)),
        const SizedBox(height: SinaatySpace.md),
        TextField(controller: _vin, textDirection: TextDirection.ltr, textCapitalization: TextCapitalization.characters, maxLength: 17,
          inputFormatters: [FilteringTextInputFormatter.allow(RegExp('[A-Za-z0-9]'))],
          decoration: InputDecoration(labelText: l.vinLabel, hintText: 'JTDKN3DU0A0123456', counterText: '', suffixIcon: VinScanButton(controller: _vin))),
        const SizedBox(height: SinaatySpace.lg),
        TextField(controller: _plate, textDirection: TextDirection.rtl,
          decoration: InputDecoration(labelText: l.plateLabel, hintText: 'أ ب ج 1234  ·  1234 أ ب ج')),
        if (_error != null) Padding(padding: const EdgeInsets.only(top: SinaatySpace.md),
          child: Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error))),
      ]),
      primaryAction: PrimaryButton(label: l.addCarSubmit, loading: _busy, onPressed: _submit));
  }
}
