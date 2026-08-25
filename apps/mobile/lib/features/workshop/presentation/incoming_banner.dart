import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../domain/incoming.dart';
import 'providers.dart';

/// «طلب جديد وصلك الآن» — البطاقة التي تعلو ما تفعله المنشأة.
///
/// **لماذا تعلو ولا تنتظر في قائمة:** صاحب الورشة تحت سيارة، والتشليح بين رفوفه. طلبٌ ينتظر في
/// تبويب لا يُفتح طلبٌ ضائع، وأول من يردّ يأخذ العمل. هذا هو نصف الحلقة الذي طلبه المالك:
/// «إشعار مستمر مثل طلبات التوصيل حتى يقبل صاحب الورشة بعد مشاهدة طلب العميل».
///
/// **ولماذا لا تملأ الشاشة:** نافذةٌ تحجب كل شيء تقطع من يوثّق فحصاً أو يصوّر ضرراً — فتُغلق بلا
/// قراءة. شريطٌ أسفل الشاشة يُقرأ في ثانية ويُقبل بنقرة، ولا يمنع العمل تحته.
class IncomingBanner extends ConsumerWidget {
  const IncomingBanner({super.key});

  @override Widget build(BuildContext context, WidgetRef ref) {
    final queue = ref.watch(incomingQueueProvider);
    if (queue.isEmpty) return const SizedBox.shrink();
    final item = queue.first;
    final l = L10n.of(context); final t = Theme.of(context).textTheme;

    return SafeArea(
      minimum: const EdgeInsets.fromLTRB(SinaatySpace.md, 0, SinaatySpace.md, SinaatySpace.md),
      child: SealCard(
        // `min` ضرورية: الشريط يعيش في فتحة قد تعطيه ارتفاعاً مفتوحاً، فيبتلع الشاشة كلها.
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Icon(item.kind == IncomingKind.service ? Icons.build_circle_outlined : Icons.settings_input_component_outlined, size: 18, color: Colors.white),
            const SizedBox(width: 8),
            Expanded(child: Text(item.kind == IncomingKind.service ? l.inNewService : l.inNewPart,
                style: t.bodySmall?.copyWith(color: Colors.white.withValues(alpha: .85)))),
            if (queue.length > 1) SealPill(l.inMore(queue.length - 1)),
          ]),
          const SizedBox(height: 6),
          Text(item.titleAr, style: t.titleLarge?.copyWith(color: Colors.white), maxLines: 1, overflow: TextOverflow.ellipsis),
          const SizedBox(height: 2),
          // المسافة قد تغيب (منشأة بلا موقع مضبوط) — يُحذف السطر ولا تُطبع «null كم».
          Text([if (item.distanceKm != null) l.drvKm(item.distanceKm!), if (item.metaAr?.isNotEmpty ?? false) item.metaAr!, item.number].join(' · '),
              style: t.bodySmall?.copyWith(color: Colors.white.withValues(alpha: .75)), maxLines: 1, overflow: TextOverflow.ellipsis),
          const SizedBox(height: SinaatySpace.md),
          Row(children: [
            Expanded(child: SealButton(label: l.inOpen, icon: Icons.arrow_back, onPressed: () {
              ref.read(incomingQueueProvider.notifier).dismiss(item.id);
              context.push(item.route);
            })),
            const SizedBox(width: SinaatySpace.sm),
            // «تجاهل» يُخفيها لهذه الجلسة فقط: الطلب يبقى في قائمته، والورشة قد تعود إليه.
            TextButton(
              onPressed: () { HapticFeedback.selectionClick(); ref.read(incomingQueueProvider.notifier).dismiss(item.id); },
              style: TextButton.styleFrom(foregroundColor: Colors.white.withValues(alpha: .85)),
              child: Text(l.inIgnore),
            ),
          ]),
        ]),
      ),
    );
  }
}
