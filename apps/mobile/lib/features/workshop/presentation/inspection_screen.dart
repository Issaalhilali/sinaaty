import 'dart:typed_data';
import 'package:crypto/crypto.dart' as crypto;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../../work_orders/presentation/providers.dart';
import '../domain/workshop.dart';
import 'providers.dart';
/// Check-in inspection: 8 angles (camera → presign → upload → media_id), body notes (zone/severity), odometer & fuel → one submit.
/// [pickImage] is injectable so tests (and simulators without a camera) can supply bytes.
class InspectionScreen extends ConsumerStatefulWidget {
  final String id; final Future<Uint8List?> Function()? pickImage;
  const InspectionScreen({super.key, required this.id, this.pickImage});
  @override ConsumerState<InspectionScreen> createState() => _InspectionScreenState();
}
class _InspectionScreenState extends ConsumerState<InspectionScreen> {
  final _shots = <String, ({Uint8List bytes, String? mediaId})>{}; final _damages = <Damage>[]; final _odo = TextEditingController(); final _fuel = TextEditingController(); bool _busy = false; String? _error;
  String angleLabel(L10n l, String a) => switch (a) { 'front' => l.wsAngleFront, 'front_right' => l.wsAngleFrontRight, 'right' => l.wsAngleRight, 'rear_right' => l.wsAngleRearRight, 'rear' => l.wsAngleRear, 'rear_left' => l.wsAngleRearLeft, 'left' => l.wsAngleLeft, _ => l.wsAngleFrontLeft };
  Future<Uint8List?> _capture() async { if (widget.pickImage != null) return widget.pickImage!(); final x = await ImagePicker().pickImage(source: ImageSource.camera, imageQuality: 80, maxWidth: 1600); return x?.readAsBytes(); }
  /// صورةٌ التُقطت ولم تُرفع: لمسُها يعيد رفع **بايتاتها هي** لا يفتح الكاميرا من جديد —
  /// الرسالة تقول «المسها لإعادة الرفع»، والوعد يطابق الفعل.
  Future<void> _shoot(String angle) async {
    final existing = _shots[angle];
    final bytes = existing != null && existing.mediaId == null ? existing.bytes : await _capture();
    if (bytes == null || !mounted) return;
    setState(() { _shots[angle] = (bytes: bytes, mediaId: null); _busy = true; });
    final repo = ref.read(workshopRepositoryProvider); final sha = crypto.sha256.convert(bytes).toString();
    final p = await repo.presign(mimeType: 'image/jpeg', sizeBytes: bytes.length, sha256: sha, purpose: 'inspection'); if (!mounted) return;
    // **نتيجة الرفع كانت تُهمَل**: تُعلَّم الصورة بعلامة نجاحٍ خضراء وهي لم تصل المخزن أصلاً.
    // وهذه صور فحصٍ تُحسم بها النزاعات: فقدُها صامتاً يعني ضياع الدليل يوم يُحتاج إليه.
    // الآن الفشل يُقال، والصورة تبقى بعلامة «لم تُرفع» ويُعاد رفعها بلمسها.
    await p.when(
      ok: (pre) async {
        final up = await repo.upload(pre, bytes, 'image/jpeg');
        if (!mounted) return;
        setState(() {
          if (up.isOk) { _shots[angle] = (bytes: bytes, mediaId: pre.mediaId); }
          else { _shots[angle] = (bytes: bytes, mediaId: null); _error = up.when(ok: (_) => null, err: (f) => f.message(Localizations.localeOf(context).languageCode)); }
        });
      },
      err: (f) async => setState(() => _error = f.message(Localizations.localeOf(context).languageCode)));
    if (mounted) setState(() => _busy = false);
  }
  String? get _nextAngle => inspectionAngles.where((a) => !_shots.containsKey(a)).firstOrNull;
  Future<void> _submit() async {
    final l = L10n.of(context);
    // صورةٌ التُقطت ولم تُرفع لا تُحسب: التسليم بلا دليلها أسوأ من تأخيره لحظة.
    final pending = _shots.entries.where((e) => e.value.mediaId == null).length;
    if (pending > 0) { setState(() => _error = l.insPhotosPending(pending)); return; }
    setState(() { _busy = true; _error = null; });
    final ids = {for (final e in _shots.entries) if (e.value.mediaId != null) e.key: e.value.mediaId!};
    final r = await ref.read(workshopRepositoryProvider).inspect(widget.id, NewInspection(type: 'check_in', odometerKm: int.tryParse(_odo.text), fuelLevelPct: int.tryParse(_fuel.text), damages: _damages, mediaIds: ids.values.toList(), anglesToMedia: ids));
    if (!mounted) return; setState(() => _busy = false);
    r.when(ok: (_) { ref.invalidate(workOrderProvider(widget.id)); ref.invalidate(workOrderTimelineProvider(widget.id)); ref.invalidate(orgOrdersProvider); context.pop(); }, err: (f) => setState(() => _error = f.message(Localizations.localeOf(context).languageCode)));
  }
  Future<void> _addDamage() async {
    final l = L10n.of(context); final zone = TextEditingController(); final note = TextEditingController(); var sev = 'minor';
    final d = await showModalBottomSheet<Damage>(context: context, isScrollControlled: true, showDragHandle: true, builder: (ctx) => StatefulBuilder(builder: (ctx, setS) => SheetBody(child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Text(l.wsAddDamage, style: Theme.of(ctx).textTheme.titleLarge), const SizedBox(height: SinaatySpace.md),
      TextField(controller: zone, decoration: InputDecoration(labelText: l.wsZone, hintText: 'رفرف أمامي أيمن'), autofocus: true), const SizedBox(height: SinaatySpace.md),
      SegmentedButton<String>(segments: [ButtonSegment(value: 'minor', label: Text(l.wsMinor)), ButtonSegment(value: 'moderate', label: Text(l.wsModerate)), ButtonSegment(value: 'severe', label: Text(l.wsSevere))], selected: {sev}, onSelectionChanged: (s) => setS(() => sev = s.first), showSelectedIcon: false), const SizedBox(height: SinaatySpace.md),
      TextField(controller: note, decoration: InputDecoration(labelText: l.declineReason)), const SizedBox(height: SinaatySpace.lg),
      PrimaryButton(label: l.wsAddDamage, onPressed: () { if (zone.text.trim().isEmpty) return; Navigator.pop(ctx, Damage(zone: zone.text.trim(), severity: sev, noteAr: note.text.trim().isEmpty ? null : note.text.trim())); }),
    ]))));
    if (d != null) setState(() => _damages.add(d));
  }
  @override Widget build(BuildContext context) {
    final l = L10n.of(context); final s = Theme.of(context).colorScheme; final next = _nextAngle;
    // «٨ / ٨» يجب أن تعني ثماني صورٍ **محفوظة**، لا ثماني ضغطاتٍ على الزر: العدّاد كان
    // يحسب ما التُقط فيطمئن المفتش وصوره في الطريق ضاعت.
    final done = _shots.values.where((v) => v.mediaId != null).length;
    return AppScaffold(title: l.wsInspect,
      primaryAction: next != null ? PrimaryButton(label: '${l.wsShootNext} — ${angleLabel(l, next)}', icon: Icons.photo_camera_outlined, loading: _busy, onPressed: () => _shoot(next)) : PrimaryButton(label: l.wsSubmitInspection, icon: Icons.check, loading: _busy, onPressed: _submit),
      body: ListView(padding: const EdgeInsets.fromLTRB(SinaatySpace.lg, SinaatySpace.sm, SinaatySpace.lg, SinaatySpace.xl), children: [
        SectionTitle(l.wsAngles, trailing: Text(l.wsAngleOf(done, inspectionAngles.length), style: TextStyle(color: s.primary, fontWeight: FontWeight.w700))),
        GridView.count(crossAxisCount: 4, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(), mainAxisSpacing: 8, crossAxisSpacing: 8, children: [
          for (final a in inspectionAngles) InkWell(onTap: _busy ? null : () => _shoot(a), borderRadius: BorderRadius.circular(14), child: _shots.containsKey(a)
            ? Stack(fit: StackFit.expand, children: [ClipRRect(borderRadius: BorderRadius.circular(14), child: Image.memory(_shots[a]!.bytes, fit: BoxFit.cover, errorBuilder: (_, _, _) => Container(color: s.surfaceContainerHighest))), PositionedDirectional(top: 6, start: 6, child: Container(width: 20, height: 20, decoration: BoxDecoration(shape: BoxShape.circle, color: _shots[a]!.mediaId != null ? s.primary : s.secondary), child: Icon(_shots[a]!.mediaId != null ? Icons.check : Icons.upload, size: 13, color: Colors.white)))])
            : Container(decoration: BoxDecoration(color: s.surface, borderRadius: BorderRadius.circular(14), border: Border.all(color: s.outlineVariant, width: 1.5)), child: Center(child: Text(angleLabel(l, a), style: TextStyle(fontSize: 11, color: s.onSurfaceVariant), textAlign: TextAlign.center)))),
        ]),
        const SizedBox(height: SinaatySpace.lg), SectionTitle(l.wsDamages, trailing: TextButton.icon(onPressed: _addDamage, icon: const Icon(Icons.add, size: 18), label: Text(l.wsAddDamage))),
        SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm, vertical: SinaatySpace.xs), child: _damages.isEmpty ? Padding(padding: const EdgeInsets.all(12), child: Text(l.wsNoDamages, style: TextStyle(color: s.onSurfaceVariant, fontSize: 13, height: 1.5))) : Column(children: [for (final d in _damages) AppListRow(icon: Icons.priority_high, title: d.zone, subtitle: d.noteAr, trailing: StatusBadge(switch (d.severity) { 'severe' => l.wsSevere, 'moderate' => l.wsModerate, _ => l.wsMinor }, tone: switch (d.severity) { 'severe' => BadgeTone.bad, 'moderate' => BadgeTone.warn, _ => BadgeTone.plain }))])),
        const SizedBox(height: SinaatySpace.lg), SectionTitle(l.odometer),
        Row(children: [Expanded(child: TextField(controller: _odo, keyboardType: TextInputType.number, textDirection: TextDirection.ltr, decoration: InputDecoration(labelText: l.odometer, suffixText: l.km))), const SizedBox(width: SinaatySpace.md), Expanded(child: TextField(controller: _fuel, keyboardType: TextInputType.number, textDirection: TextDirection.ltr, decoration: InputDecoration(labelText: l.wsFuel)))]),
        if (_error != null) Padding(padding: const EdgeInsets.only(top: SinaatySpace.md), child: Text(_error!, style: TextStyle(color: s.error))),
      ]));
  }
}
