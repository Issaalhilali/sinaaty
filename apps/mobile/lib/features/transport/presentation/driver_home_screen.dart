import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/format/format.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/l10n/labels.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../domain/driver_job.dart';
import '../domain/transport.dart';
import 'providers.dart';

/// شاشة السائق: حالتي، مهمتي الآن، ثم ما هو قريب.
///
/// سائقٌ خلف مقود لا يقرأ قوائم. فإن كانت في يده مهمة فهي وحدها من يملأ الشاشة بزرّها الوحيد؛
/// وإلا فقائمة العروض القريبة. لا شيء ثالث.
class DriverHomeScreen extends ConsumerWidget {
  const DriverHomeScreen({super.key});

  @override Widget build(BuildContext context, WidgetRef ref) {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode;
    final me = ref.watch(driverProfileProvider);
    return AsyncResultView<DriverProfile>(
      value: me,
      onRetry: () => ref.invalidate(driverProfileProvider),
      builder: (d) {
        final jobs = ref.watch(driverJobsProvider).value?.valueOrNull ?? const <TransportJob>[];
        final current = jobs.where((j) => isDriverActive(j.status)).firstOrNull;
        return RefreshIndicator(
          onRefresh: () async { ref.invalidate(driverJobsProvider); ref.invalidate(driverOffersProvider); },
          child: ListView(padding: EdgeInsets.fromLTRB(SinaatySpace.lg, SinaatySpace.sm, SinaatySpace.lg, SinaatySpace.bottomClearance(context)), children: [
            _StatusRow(d: d),
            if (!d.canAcceptJobs) ...[
              const SizedBox(height: SinaatySpace.md),
              // الخادم يرفض القبول بلا منشأة لأن الفاتورة تصدر باسمها — تُقال قبل الضغط لا بعده.
              _Note(l.drvNeedOrg),
            ],
            const SizedBox(height: SinaatySpace.md),
            if (current != null)
              _CurrentJob(job: current)
            else ...[
              SectionTitle(l.drvNearby),
              _Offers(online: d.online, canAccept: d.canAcceptJobs, locale: locale),
            ],
          ]),
        );
      },
    );
  }
}

class _StatusRow extends ConsumerWidget {
  final DriverProfile d; const _StatusRow({required this.d});
  @override Widget build(BuildContext context, WidgetRef ref) {
    final l = L10n.of(context); final t = Theme.of(context).textTheme;
    return SectionCard(child: Row(children: [
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(d.online ? l.drvOnline : l.drvOffline, style: t.titleMedium),
        const SizedBox(height: 2),
        Text(Fmt.meta([d.truckPlate, if (d.truckType != null) Labels.truckType(l, d.truckType!)]), style: t.bodySmall?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant)),
      ])),
      Switch(value: d.online, onChanged: (v) async {
        await ref.read(transportRepositoryProvider).setOnline(v);
        ref.invalidate(driverProfileProvider); ref.invalidate(driverOffersProvider);
      }),
    ]));
  }
}

/// المهمة التي في يده الآن — بطاقة الختم بزرّ واحد كبير، كما يفعل أمر العمل عند الورشة.
class _CurrentJob extends ConsumerStatefulWidget {
  final TransportJob job; const _CurrentJob({required this.job});
  @override ConsumerState<_CurrentJob> createState() => _CurrentJobState();
}

class _CurrentJobState extends ConsumerState<_CurrentJob> {
  bool _busy = false; String? _error;

  Future<void> _advance() async {
    final j = widget.job; final next = nextDriverStep(j.status); if (next == null) return;
    if (stepNeedsProof(j.status)) { await context.push<void>('/drv/jobs/${j.id}/proof'); return; }
    setState(() { _busy = true; _error = null; });
    final r = await ref.read(transportRepositoryProvider).driverTransition(j.id, next);
    if (!mounted) return; setState(() => _busy = false);
    r.when(ok: (_) => ref.invalidate(driverJobsProvider), err: (f) => setState(() => _error = f.message(Localizations.localeOf(context).languageCode)));
  }

  @override Widget build(BuildContext context) {
    final l = L10n.of(context); final t = Theme.of(context).textTheme; final j = widget.job;
    final locale = Localizations.localeOf(context).languageCode;
    final step = driverFlow.indexOf(j.status);
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      SealCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Text(Labels.transportStatus(l, j.status), style: t.titleLarge?.copyWith(color: Colors.white))),
          SealPill(j.number),
        ]),
        const SizedBox(height: SinaatySpace.md),
        _Leg(icon: Icons.trip_origin, label: l.drvPickup, value: j.pickupAddress ?? j.pickup?.toString() ?? '—'),
        const SizedBox(height: 8),
        _Leg(icon: Icons.place_outlined, label: l.drvDropoff, value: j.dropoffAddress ?? j.dropoff?.toString() ?? '—'),
        const SizedBox(height: SinaatySpace.md),
        Row(children: [
          MoneyText(Fmt.money(j.price, locale: locale), style: t.titleLarge?.copyWith(color: Colors.white)),
          const Spacer(),
          if (j.distanceKm != null) Text(l.drvKm(j.distanceKm!), style: t.bodySmall?.copyWith(color: Colors.white70)),
        ]),
        const SizedBox(height: SinaatySpace.md),
        SealSteps(total: driverFlow.length, current: step < 0 ? 0 : step),
        const SizedBox(height: SinaatySpace.lg),
        SealButton(label: Labels.driverAction(l, j.status), loading: _busy, onPressed: _advance),
      ])),
      if (_error != null) Padding(padding: const EdgeInsets.only(top: SinaatySpace.md), child: _Note(_error!)),
    ]);
  }
}

class _Leg extends StatelessWidget {
  final IconData icon; final String label; final String value;
  const _Leg({required this.icon, required this.label, required this.value});
  @override Widget build(BuildContext context) => Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Icon(icon, size: 16, color: Colors.white70), const SizedBox(width: 8),
    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.white60)),
      Text(value, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.white), maxLines: 2, overflow: TextOverflow.ellipsis),
    ])),
  ]);
}

class _Offers extends ConsumerWidget {
  final bool online; final bool canAccept; final String locale;
  const _Offers({required this.online, required this.canAccept, required this.locale});

  @override Widget build(BuildContext context, WidgetRef ref) {
    final l = L10n.of(context);
    if (!online) return EmptyState(icon: Icons.wifi_off_outlined, title: l.drvOfflineTitle, body: l.drvOfflineBody);
    return AsyncResultView<List<TransportJob>>(
      value: ref.watch(driverOffersProvider),
      onRetry: () => ref.invalidate(driverOffersProvider),
      builder: (offers) {
        if (offers.isEmpty) return EmptyState(icon: Icons.local_shipping_outlined, title: l.drvNoOffersTitle, body: l.drvNoOffersBody);
        return SectionCard(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.sm), child: RowGroup(children: [
          for (final o in offers)
            AppListRow(
              icon: Icons.local_shipping_outlined,
              title: Fmt.meta([o.pickupAddress ?? o.pickup?.toString(), o.dropoffAddress ?? o.dropoff?.toString()]),
              subtitle: Fmt.meta([Fmt.money(o.quotedPrice, locale: locale), if (o.distanceKm != null) l.drvKm(o.distanceKm!)]),
              onTap: canAccept ? () => _accept(context, ref, o) : null,
            ),
        ]));
      },
    );
  }

  Future<void> _accept(BuildContext context, WidgetRef ref, TransportJob o) async {
    final r = await ref.read(transportRepositoryProvider).acceptOffer(o.id);
    if (!context.mounted) return;
    r.when(
      ok: (_) { ref.invalidate(driverJobsProvider); ref.invalidate(driverOffersProvider); },
      // «أُسندت لسائق آخر» ليست خطأً في التطبيق — هو سباقٌ خسره، ويُقال كما هو.
      err: (f) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(f.message(Localizations.localeOf(context).languageCode)))),
    );
  }
}

/// سطر تنبيه هادئ داخل الشاشة — لا كتلة خطأ تملأها.
class _Note extends StatelessWidget {
  final String text; const _Note(this.text);
  @override Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return SectionCard(child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Icon(Icons.info_outline, size: 18, color: SinaatyColors.brass), const SizedBox(width: 8),
      Expanded(child: Text(text, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: scheme.onSurfaceVariant))),
    ]));
  }
}
