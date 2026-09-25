/// Saudi mobile → E.164 (+9665xxxxxxxx). Mirrors the API rule so we fail fast offline.
String? normalizeSaudiPhone(String input) {
  final western = input.replaceAllMapped(RegExp('[٠-٩]'), (m) => String.fromCharCode(m.group(0)!.codeUnitAt(0) - 0x0660 + 48));
  final d = western.replaceAll(RegExp(r'[^\d+]'), '');
  final m = RegExp(r'^(?:\+?966|00966|0)?(5\d{8})$').firstMatch(d);
  return m == null ? null : '+966${m.group(1)}';
}
