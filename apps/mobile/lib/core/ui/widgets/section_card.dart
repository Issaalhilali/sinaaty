import 'package:flutter/material.dart';
import '../../theme/tokens.dart';
class SectionCard extends StatelessWidget {
  final Widget child; final EdgeInsetsGeometry padding; final VoidCallback? onTap;
  const SectionCard({super.key, required this.child, this.padding = const EdgeInsets.all(SinaatySpace.lg), this.onTap});
  @override
  Widget build(BuildContext context) => Card(clipBehavior: Clip.antiAlias, child: InkWell(onTap: onTap, child: Padding(padding: padding, child: child)));
}
