import 'package:flutter/material.dart';
/// The one big obvious button per screen. Shows a spinner while loading; never blocks the whole screen.
class PrimaryButton extends StatelessWidget {
  final String label; final VoidCallback? onPressed; final bool loading; final IconData? icon; final bool secondary;
  const PrimaryButton({super.key, required this.label, required this.onPressed, this.loading = false, this.icon, this.secondary = false});
  @override
  Widget build(BuildContext context) {
    final child = loading ? const SizedBox(height: 22, width: 22, child: CircularProgressIndicator(strokeWidth: 2.5)) : Row(mainAxisSize: MainAxisSize.min, children: [if (icon != null) ...[Icon(icon, size: 20), const SizedBox(width: 8)], Text(label)]);
    return secondary ? OutlinedButton(onPressed: loading ? null : onPressed, child: child) : FilledButton(onPressed: loading ? null : onPressed, child: child);
  }
}
