import 'package:flutter/material.dart';
/// Standard page: title, optional actions behind a single "more" menu, body, and ONE primary action.
class AppScaffold extends StatelessWidget {
  final String title; final Widget body; final Widget? primaryAction; final List<PopupMenuEntry<String>>? moreItems; final ValueChanged<String>? onMore; final Widget? bottom;
  const AppScaffold({super.key, required this.title, required this.body, this.primaryAction, this.moreItems, this.onMore, this.bottom});
  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: Text(title), actions: [if (moreItems != null && moreItems!.isNotEmpty) PopupMenuButton<String>(icon: const Icon(Icons.more_horiz), onSelected: onMore, itemBuilder: (_) => moreItems!)]),
        body: SafeArea(child: body),
        bottomNavigationBar: bottom,
        floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
        floatingActionButton: primaryAction == null ? null : Padding(padding: const EdgeInsets.symmetric(horizontal: 16), child: SizedBox(width: double.infinity, child: primaryAction)),
      );
}
