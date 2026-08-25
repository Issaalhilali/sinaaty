import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/format/format.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';
import '../domain/fleet.dart';
import '../domain/policy_preview.dart';
import 'providers.dart';

/// قواعد الصرف — ثلاثة أرقام تحكم كل أمر إصلاح في الأسطول.
///
/// كانت تُقرأ في كل مكان ولا تُضبط من أي مكان: كل أسطول يحتاج مهندساً يكتب حدوده بنداء مباشر.
/// وحين تُفتح للضبط لا يكفي أن تُعرض حقول: مسؤول الأسطول يكتب رقماً ولا يرى أثره إلا بعد أسابيع
/// على أوامر حقيقية. فالشاشة تعرض **المعنى** حيّاً: مبلغٌ افتراضي وماذا يحدث له بهذه الأرقام.
class FleetPolicyScreen extends ConsumerStatefulWidget {
  final String orgId;
  const FleetPolicyScreen({super.key, required this.orgId});
  @override ConsumerState<FleetPolicyScreen> createState() => _FleetPolicyScreenState();
}

class _FleetPolicyScreenState extends ConsumerState<FleetPolicyScreen> {
  final _auto = TextEditingController();
  final _two = TextEditingController();
  final _budget = TextEditingController();
  String? _id; bool _loaded = false; bool _busy = false; String? _error;

  @override void dispose() { _auto.dispose(); _two.dispose(); _budget.dispose(); super.dispose(); }

  void _fill(List<FleetPolicy> list) {
    if (_loaded) return;
    _loaded = true;
    final p = list.where((x) => x.isActive).firstOrNull ?? list.firstOrNull;
    if (p == null) return;
    _id = p.id; _auto.text = p.autoApproveBelow;
    _two.text = p.requiresTwoApproversAbove ?? ''; _budget.text = p.monthlyBudget ?? '';
  }

  /// رسالة الخطأ تزول مع أول تعديل: خطأٌ باقٍ بعد تصحيح سببه يكذب على من صحّحه.
  void _clearError() => setState(() => _error = null);

  String? _v(TextEditingController c) => c.text.trim().isEmpty ? null : c.text.trim();

  Future<void> _save() async {
    final l = L10n.of(context);
    if (thresholdsContradict(autoApproveBelow: _v(_auto), requiresTwoApproversAbove: _v(_two))) {
      setState(() => _error = l.flPolicyContradiction); return;
    }
    setState(() { _busy = true; _error = null; });
    final r = await ref.read(fleetRepositoryProvider).savePolicy(widget.orgId, FleetPolicy(
      id: _id, nameAr: l.flPolicyName, autoApproveBelow: _v(_auto) ?? '0',
      requiresTwoApproversAbove: _v(_two), monthlyBudget: _v(_budget),
    ));
    if (!mounted) return; setState(() => _busy = false);
    r.when(
      ok: (_) { ref.invalidate(fleetPoliciesProvider(widget.orgId)); ref.invalidate(fleetOverviewProvider);
        // قد تُفتح من رابط عميق بلا شاشة قبلها — عندها لا رجوع، والحفظ لا يرمي.
        if (context.canPop()) { context.pop(); } else { setState(() {}); } },
      err: (f) => setState(() => _error = f.message(Localizations.localeOf(context).languageCode)),
    );
  }

  @override Widget build(BuildContext context) {
    final l = L10n.of(context); final t = Theme.of(context).textTheme;
    return AppScaffold(
      title: l.flPolicyTitle,
      body: AsyncResultView<List<FleetPolicy>>(
        value: ref.watch(fleetPoliciesProvider(widget.orgId)),
        onRetry: () => ref.invalidate(fleetPoliciesProvider(widget.orgId)),
        builder: (list) {
          _fill(list);
          return ListView(padding: const EdgeInsets.all(SinaatySpace.lg), children: [
            Text(l.flPolicyWhy, style: t.bodyMedium?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant)),
            const SizedBox(height: SinaatySpace.lg),
            _Amount(controller: _auto, label: l.flPolicyAuto, hint: l.flPolicyAutoHint, onChanged: _clearError),
            const SizedBox(height: SinaatySpace.md),
            _Amount(controller: _two, label: l.flPolicyTwo, hint: l.flPolicyTwoHint, onChanged: _clearError),
            const SizedBox(height: SinaatySpace.md),
            _Amount(controller: _budget, label: l.flPolicyBudget, hint: l.flPolicyBudgetHint, onChanged: _clearError),
            const SizedBox(height: SinaatySpace.lg),
            SectionTitle(l.flPolicyMeaning),
            _Preview(auto: _v(_auto), two: _v(_two), budget: _v(_budget)),
            if (_error != null) Padding(padding: const EdgeInsets.only(top: SinaatySpace.md), child: Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error))),
          ]);
        },
      ),
      primaryAction: PrimaryButton(label: l.flPolicySave, loading: _busy, onPressed: _save),
    );
  }
}

class _Amount extends StatelessWidget {
  final TextEditingController controller; final String label; final String hint; final VoidCallback onChanged;
  const _Amount({required this.controller, required this.label, required this.hint, required this.onChanged});
  @override Widget build(BuildContext context) => TextField(
        controller: controller, keyboardType: const TextInputType.numberWithOptions(decimal: true),
        textDirection: TextDirection.ltr,
        inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.]'))],
        decoration: InputDecoration(labelText: label, helperText: hint, helperMaxLines: 2, suffixText: '\u00a0ر.س'),
        onChanged: (_) => onChanged(),
      );
}

/// ثلاثة مبالغ حقيقية وما يحدث لكل منها — الرقم يصير قراراً مفهوماً قبل أن يُحفظ.
class _Preview extends StatelessWidget {
  final String? auto; final String? two; final String? budget;
  const _Preview({this.auto, this.two, this.budget});

  @override Widget build(BuildContext context) {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode;
    const samples = ['350.00', '1500.00', '6000.00'];
    return SectionCard(child: Column(children: [
      for (final s in samples)
        Padding(padding: const EdgeInsets.symmetric(vertical: 6), child: Row(children: [
          Expanded(child: Text(Fmt.money(s, locale: locale))),
          StatusBadge(_label(l, previewDecision(total: s, autoApproveBelow: auto, requiresTwoApproversAbove: two, monthlyBudget: budget)),
              tone: _tone(previewDecision(total: s, autoApproveBelow: auto, requiresTwoApproversAbove: two, monthlyBudget: budget))),
        ])),
    ]));
  }

  String _label(L10n l, PolicyOutcome o) => switch (o) {
        PolicyOutcome.auto => l.flOutAuto,
        PolicyOutcome.oneApprover => l.flOutOne,
        PolicyOutcome.twoApprovers => l.flOutTwo,
        PolicyOutcome.overBudget => l.flOutOverBudget,
      };

  BadgeTone _tone(PolicyOutcome o) => switch (o) {
        PolicyOutcome.auto => BadgeTone.seal,
        PolicyOutcome.overBudget => BadgeTone.bad,
        _ => BadgeTone.brass,
      };
}
