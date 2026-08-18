import 'package:flutter/material.dart';
import '../../theme/tokens.dart';
/// Standard page: title, optional actions behind a single "more" menu, body, and ONE primary action in a calm fixed bottom bar.
class AppScaffold extends StatelessWidget {
  final String title; final Widget body; final Widget? primaryAction; final List<PopupMenuEntry<String>>? moreItems; final ValueChanged<String>? onMore; final Widget? bottom; final Widget? leading; final String? subtitle; final Widget? trailing;
  const AppScaffold({super.key, required this.title, required this.body, this.primaryAction, this.moreItems, this.onMore, this.bottom, this.leading, this.subtitle, this.trailing});
  @override
  Widget build(BuildContext context) {
    final s = Theme.of(context).colorScheme; final dark = Theme.of(context).brightness == Brightness.dark;
    final bar = primaryAction == null ? null : DecoratedBox(decoration: BoxDecoration(color: s.surface, border: Border(top: BorderSide(color: s.outlineVariant.withValues(alpha: .6))), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: dark ? .4 : .06), blurRadius: 24, offset: const Offset(0, -8))]), child: SafeArea(top: false, child: Padding(padding: const EdgeInsets.fromLTRB(SinaatySpace.lg, 12, SinaatySpace.lg, 12), child: SizedBox(width: double.infinity, child: primaryAction))));
    return Scaffold(
      appBar: AppBar(leading: leading, title: subtitle == null ? Text(title) : Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [Text(title), Text(subtitle!, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: s.onSurfaceVariant))]),
        actions: [?trailing, if (moreItems != null && moreItems!.isNotEmpty) Padding(padding: const EdgeInsetsDirectional.only(end: 8), child: PopupMenuButton<String>(icon: const Icon(Icons.more_horiz), onSelected: onMore, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(SinaatySpace.radius)), itemBuilder: (_) => moreItems!))]),
      extendBody: bottom != null,
      body: SafeArea(bottom: bottom == null && bar == null, child: body),
      bottomNavigationBar: bottom != null ? Column(mainAxisSize: MainAxisSize.min, children: [?bar, bottom!]) : bar,
    );
  }
}
