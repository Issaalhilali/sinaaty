import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/ui.dart';

/// «عن صناعية» و«الدعم» — كانت «حسابي» نصفَها الأسفل فراغٌ أسود، ومتاجر التطبيقات تسأل
/// عن كليهما قبل النشر أصلاً. شاشة تعريفٍ بالوعد ونسخة البناء، وشاشة تواصلٍ بفعلين.
class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final l = L10n.of(context); final t = Theme.of(context).textTheme;
    return AppScaffold(title: l.aboutTitle, body: ListView(padding: const EdgeInsets.all(SinaatySpace.lg), children: [
      SealCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [const BrandMark(size: 40), const SizedBox(width: 12), Text(l.appName.trim(), style: t.titleLarge?.copyWith(color: Colors.white, fontWeight: FontWeight.w800))]),
        const SizedBox(height: SinaatySpace.md),
        Text(l.aboutPromise, style: t.bodyLarge?.copyWith(color: Colors.white.withValues(alpha: .88), height: 1.8)),
      ])),
      const SizedBox(height: SinaatySpace.lg),
      Center(child: Text(l.aboutVersion('1.0.0'), style: t.bodySmall?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant))),
      const SizedBox(height: SinaatySpace.sm),
      Center(child: Padding(padding: const EdgeInsets.symmetric(horizontal: SinaatySpace.lg),
          child: Text(l.termsNote, textAlign: TextAlign.center, style: t.bodySmall?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant, height: 1.6)))),
    ]));
  }
}

class SupportScreen extends StatelessWidget {
  const SupportScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final l = L10n.of(context); final t = Theme.of(context).textTheme;
    return AppScaffold(title: l.supportTitle, body: ListView(padding: const EdgeInsets.all(SinaatySpace.lg), children: [
      Text(l.supportBody, style: t.bodyLarge?.copyWith(height: 1.8)),
      const SizedBox(height: SinaatySpace.xl),
      PrimaryButton(label: l.supportWhatsApp, icon: Icons.chat_outlined,
          onPressed: () => launchUrl(Uri.parse('https://wa.me/966500000000'), mode: LaunchMode.externalApplication)),
      const SizedBox(height: SinaatySpace.md),
      PrimaryButton(label: l.supportCall, icon: Icons.call_outlined, secondary: true,
          onPressed: () => launchUrl(Uri.parse('tel:+966500000000'))),
    ]));
  }
}
