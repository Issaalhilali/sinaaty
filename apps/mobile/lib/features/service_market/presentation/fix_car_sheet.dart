import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/di/core_providers.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/location/here.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/voice/voice_sheet.dart';
import '../../../core/ui/ui.dart';
import '../../transport/domain/transport.dart' show parseLocationLink;
import '../../vehicles/domain/vehicle.dart';
import '../../vehicles/presentation/providers.dart';
import '../domain/symptoms.dart';
import 'providers.dart';

// رموز البيت المرسومة — رموز Material العامة ذهبت مع بقية القالب
const _icons = <String, BrandGlyph>{
  'power_settings_new': BrandGlyph.symNoStart, 'graphic_eq': BrandGlyph.symNoise,
  'do_not_step': BrandGlyph.symBrakes, 'thermostat': BrandGlyph.symHeat, 'vibration': BrandGlyph.symShake,
  'call_split': BrandGlyph.symPulls, 'water_drop': BrandGlyph.symLeak, 'warning_amber': BrandGlyph.symWarning,
  'ac_unit': BrandGlyph.symAc, 'bolt': BrandGlyph.symBolt, 'car_crash': BrandGlyph.symCrash, 'build': BrandGlyph.symService,
};

/// «أصلح سيارتي».
///
/// كانت ورقةً تطلب ستة قرارات قبل أن يحدث شيء: اختر السيارة، اكتب وصفاً، أضف صوراً، **الصق رابط
/// خرائط**، اختر نطاق البحث ١٠/٢٥/٥٠ كم، اختر التوقيت. ومن انكسرت سيارته لا يفتح خرائط لينسخ
/// رابطاً، ولا يعرف أن ٢٥ كم أفضل من ١٠ — ذاك قرارنا لا قراره. وزرّ «أرسل» كان يصمت عند أي نقص.
///
/// الآن: **ينقر ما يلاحظه**، وموقعه يُقرأ من الجهاز، والنطاق حُذف، والزرّ يقول ما ينقص.
/// [preset] وصفٌ مكتوبٌ سلفاً يفتح الورقة جاهزة — بابُ خدمةٍ محدّدة (فحص قبل الشراء،
/// صيانة دورية، بطارية على الطريق) يقود إلى **المسار نفسه** لا إلى زرٍّ ميت: الورش
/// تستقبله طلباً عادياً وتسعّره، فالخدمة الجديدة تعمل يوم إطلاقها لا بعد بناءٍ آخر.
Future<void> openFixCarSheet(BuildContext context, WidgetRef ref, List<Vehicle> vehicles,
    {Future<Uint8List?> Function()? pickImage, Here? here, String? preset}) async {
  final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode;
  final Here loc = here ?? ref.read(hereProvider);
  final note = TextEditingController(text: preset ?? ''); final manual = TextEditingController();
  String? vehicleId = vehicles.isNotEmpty ? vehicles.first.id : null;
  final picked = <Symptom>{}; final photos = <Uint8List>[];
  var when = 'today';
  ({double lat, double lng})? place;
  var locating = true, locateFailed = false;

  Future<Uint8List?> capture() async {
    if (pickImage != null) return pickImage();
    final x = await ImagePicker().pickImage(source: ImageSource.camera, imageQuality: 80, maxWidth: 1600);
    return x?.readAsBytes();
  }

  final ok = await showModalBottomSheet<bool>(
    context: context, showDragHandle: true, isScrollControlled: true,
    builder: (ctx) => StatefulBuilder(builder: (ctx, setS) {
      // الموقع يُطلب فور فتح الورقة، لا حين يضغط «أرسل»: الانتظار يقع أثناء اختياره الأعراض فلا يشعر به.
      if (locating && place == null && !locateFailed) {
        loc.now().then((p) { if (ctx.mounted) setS(() { place = p; locating = false; locateFailed = p == null; }); });
      }
      final t = Theme.of(ctx); final cs = t.colorScheme;
      final gap = missing(picked: picked.toList(), note: note.text, hasVehicle: vehicleId != null,
          hasPlace: place != null || parseLocationLink(manual.text) != null);

      return Padding(
        padding: EdgeInsets.fromLTRB(SinaatySpace.lg, 0, SinaatySpace.lg, MediaQuery.viewInsetsOf(ctx).bottom + SinaatySpace.lg),
        child: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text(l.srFix, style: t.textTheme.headlineSmall),
          const SizedBox(height: 2),
          Text(l.srOffersComing, style: t.textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant, height: 1.5)),

          // بلا سيارة لا معنى لأمر إصلاح — فيُدعى لإضافتها لا يُردّ بخطأ تحقّق.
          if (vehicles.isEmpty) ...[
            const SizedBox(height: SinaatySpace.lg),
            SectionCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Icon(Icons.directions_car_outlined, size: 20, color: cs.primary),
                const SizedBox(width: SinaatySpace.sm),
                Expanded(child: Text(l.srNoVehicle, style: t.textTheme.titleSmall)),
              ]),
              const SizedBox(height: 4),
              Text(l.srNoVehicleBody, style: t.textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant, height: 1.5)),
            ])),
            const SizedBox(height: SinaatySpace.lg),
            PrimaryButton(label: l.srAddVehicle, icon: Icons.add, onPressed: () => Navigator.pop(ctx, false)),
          ] else ...[
            // سيارة واحدة = لا سؤال. أكثر من واحدة = شرائح تُنقر، لا قائمة منسدلة تُفتح وتُغلق.
            if (vehicles.length > 1) ...[
              const SizedBox(height: SinaatySpace.md),
              SizedBox(height: 40, child: ListView.separated(scrollDirection: Axis.horizontal, itemCount: vehicles.length,
                separatorBuilder: (_, _) => const SizedBox(width: 8),
                itemBuilder: (_, i) => ChoiceChip(label: Text(vehicles[i].title), selected: vehicleId == vehicles[i].id,
                    onSelected: (_) => setS(() => vehicleId = vehicles[i].id)))),
            ],

            const SizedBox(height: SinaatySpace.lg),
            Text(l.srWhatYouNotice, style: t.textTheme.titleMedium),
            const SizedBox(height: 2),
            Text(l.srPickMore, style: t.textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
            const SizedBox(height: SinaatySpace.sm),
            Wrap(spacing: 8, runSpacing: 8, children: [
              for (final s in kSymptoms)
                FilterChip(
                  avatar: BrandIcon(_icons[s.icon] ?? BrandGlyph.symService, size: 18,
                      color: picked.contains(s) ? cs.onSecondaryContainer : cs.onSurfaceVariant),
                  label: Text(s.labelAr), selected: picked.contains(s), showCheckmark: false,
                  onSelected: (v) => setS(() => v ? picked.add(s) : picked.remove(s)),
                ),
            ]),

            const SizedBox(height: SinaatySpace.lg),
            TextField(controller: note, minLines: 1, maxLines: 4, onChanged: (_) => setS(() {}),
              decoration: InputDecoration(labelText: l.srNoteOptional, hintText: l.srNoteHint,
                  suffixIcon: VoiceMicButton(controller: note, title: l.srNoteOptional))),

            const SizedBox(height: SinaatySpace.sm),
            Row(children: [
              TextButton.icon(onPressed: () async { final b = await capture(); if (b != null) setS(() => photos.add(b)); },
                  icon: const Icon(Icons.add_a_photo_outlined, size: 18), label: Text(l.dsAttach)),
              const Spacer(),
              for (final p in photos.take(4))
                Padding(padding: const EdgeInsetsDirectional.only(start: 6),
                  child: ClipRRect(borderRadius: BorderRadius.circular(8),
                    child: Image.memory(p, width: 36, height: 36, fit: BoxFit.cover,
                        errorBuilder: (_, _, _) => Container(width: 36, height: 36, color: cs.surfaceContainerHighest)))),
            ]),

            // الموقع سطرٌ يُطمئن، لا حقلٌ يُملأ — ولا يظهر حقل إلا حين يتعذّر.
            const SizedBox(height: SinaatySpace.md),
            if (place != null)
              Row(children: [
                Icon(Icons.my_location, size: 18, color: cs.primary), const SizedBox(width: SinaatySpace.sm),
                Expanded(child: Text(l.srHere, style: t.textTheme.bodyMedium)),
              ])
            else if (locating)
              Row(children: [
                const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
                const SizedBox(width: SinaatySpace.sm),
                Text(l.srLocating, style: t.textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
              ])
            else ...[
              Row(children: [
                Icon(Icons.location_off_outlined, size: 18, color: cs.onSurfaceVariant),
                const SizedBox(width: SinaatySpace.sm),
                Expanded(child: Text(l.srLocateFailed, style: t.textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant))),
                TextButton(onPressed: () => setS(() { locating = true; locateFailed = false; }), child: Text(l.srUseMyLocation)),
              ]),
              TextField(controller: manual, textDirection: TextDirection.ltr, onChanged: (_) => setS(() {}),
                  decoration: InputDecoration(labelText: l.srLocateManual, hintText: l.srWhereHint, prefixIcon: const Icon(Icons.place_outlined))),
            ],

            const SizedBox(height: SinaatySpace.md),
            // المقسّم لا ينكمش وثلاث كلماتٍ عربية أعرض من الصف — سطرٌ كامل تحت عنوانه
            Text(l.srWhenAsk, style: t.textTheme.titleSmall),
            const SizedBox(height: SinaatySpace.sm),
            SegmentedButton<String>(
              segments: [ButtonSegment(value: 'now', label: Text(l.srNow)), ButtonSegment(value: 'today', label: Text(l.srToday)), ButtonSegment(value: 'this_week', label: Text(l.srThisWeek))],
              selected: {when}, showSelectedIcon: false, onSelectionChanged: (s) => setS(() => when = s.first)),

            const SizedBox(height: SinaatySpace.md),
            // دمجُ الأبواب: من سيارته لا تمشي لا يُترك يكتشف السطحة وحده — الرحلة عندنا واحدة،
            // وهذا بالضبط ما يفصلنا عن تطبيقات «خدمة واحدة»: السطحة تُسلّم للورشة لا للرصيف.
            Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              Icon(Icons.info_outline, size: 15, color: t.colorScheme.onSurfaceVariant),
              const SizedBox(width: 6),
              Flexible(child: Text(l.srCantMove, style: t.textTheme.bodySmall?.copyWith(color: t.colorScheme.onSurfaceVariant))),
              TextButton(
                style: TextButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 8), minimumSize: const Size(0, 32)),
                onPressed: () { Navigator.pop(ctx, false); Future.microtask(() { if (context.mounted) context.push('/tow/new', extra: {'vehicle_id': vehicleId}); }); },
                child: Text(l.srOrderTow),
              ),
            ]),
            const SizedBox(height: SinaatySpace.sm),
            // لا زرّ ميت: إن نقص شيء قيل ما هو، ولا يُترك ينقر بلا أثر.
            if (gap != null) Padding(padding: const EdgeInsets.only(bottom: 8),
              child: Row(children: [
                Icon(Icons.info_outline, size: 16, color: cs.onSurfaceVariant), const SizedBox(width: 6),
                Expanded(child: Text(gap, style: t.textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant))),
              ])),
            PrimaryButton(label: l.srSend, icon: Icons.send_outlined,
                onPressed: gap == null ? () => Navigator.pop(ctx, true) : null),
          ],
        ])),
      );
    }),
  );

  if (ok == false && context.mounted) {
    await context.push('/vehicles/add');
    if (!context.mounted) return;
    final fresh = ref.read(vehiclesProvider).value?.valueOrNull ?? const <Vehicle>[];
    if (fresh.isNotEmpty) await openFixCarSheet(context, ref, fresh, pickImage: pickImage, here: loc);
    return;
  }
  if (ok != true || !context.mounted) return;

  final repo = ref.read(serviceMarketRepositoryProvider);
  final mediaIds = <String>[];
  for (final p in photos) { final id = (await repo.uploadPhoto(p, mimeType: 'image/jpeg')).valueOrNull; if (id != null) mediaIds.add(id); }
  // `GeoPoint` نوع النقل و«place» سجلّ من منفذ الموقع — نوحّدهما هنا صراحةً بدل ضمّهما بـ`??`
  // فيستنتج المحلّل `Object` ويسقط البناء.
  final typed = parseLocationLink(manual.text);
  final point = place ?? (lat: typed!.lat, lng: typed.lng);
  final chosen = picked.toList();
  final r = await repo.create(
    vehicleId: vehicleId,
    titleAr: requestTitle(picked: chosen, note: note.text),
    descriptionAr: note.text.trim().isEmpty ? null : note.text.trim(),
    lat: point.lat, lng: point.lng,
    // النطاق قرار المنصة لا العميل: هو لا يعرف أن ٢٥ أفضل من ١٠، ونحن نعرف. و«وسّع النطاق»
    // يبقى في شاشة الطلب لمن هدأ سوقه.
    radiusKm: 25, preferredTime: when, mediaIds: mediaIds,
  );
  if (!context.mounted) return;
  r.when(
    ok: (req) { ref.invalidate(myServiceRequestsProvider); context.push('/service-requests/${req.id}'); },
    err: (f) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(f.message(locale)))),
  );
}
