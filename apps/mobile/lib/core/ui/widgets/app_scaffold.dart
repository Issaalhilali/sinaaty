import 'package:flutter/material.dart';
/// Standard page: title, optional actions behind a single "more" menu, body, and ONE primary action.
class AppScaffold extends StatelessWidget {
  final String title; final Widget body; final Widget? primaryAction; final List<PopupMenuEntry<String>>? moreItems; final ValueChanged<String>? onMore; final Widget? bottom;
  const AppScaffold({super.key, required this.title, required this.body, this.primaryAction, this.moreItems, this.onMore, this.bottom});
  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: Text(title), actions: [if (moreItems != null && moreItems!.isNotEmpty) PopupMenuButton<String>(icon: const Icon(Icons.more_horiz), onSelected: onMore, itemBuilder: (_) => moreItems!)]),
        body: SafeArea(child: body),
        // Primary action lives in a calm fixed bar at the bottom (never floats over content); tab bar screens use FAB-less bodies.
        bottomNavigationBar: bottom ?? (primaryAction == null ? null : Material(color: Theme.of(context).colorScheme.surface, elevation: 0, child: SafeArea(top: false, child: Padding(padding: const EdgeInsets.fromLTRB(16, 10, 16, 12), child: SizedBox(width: double.infinity, child: primaryAction))))),
        floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
        floatingActionButton: bottom != null && primaryAction != null ? Padding(padding: const EdgeInsets.symmetric(horizontal: 16), child: SizedBox(width: double.infinity, child: primaryAction)) : null,
      );
}
