import 'package:intl/intl.dart';
/// Presentation-only formatting: money as "1,368.50 ر.س", dates in Asia/Riyadh (device local for MVP), Western digits.
abstract final class Fmt {
  /// Western digits everywhere (charter: calm, consistent numbers), even for the Arabic locale.
  static String _western(String s) => s.replaceAllMapped(RegExp('[\u0660-\u0669]'), (m) => String.fromCharCode(m.group(0)!.codeUnitAt(0) - 0x0660 + 0x30)).replaceAll('\u060C', ',');
  static String money(String amount, {String locale = 'ar'}) { final n = double.tryParse(amount) ?? 0; final s = NumberFormat('#,##0.00', 'en_US').format(n); return locale == 'ar' ? '$s ر.س' : 'SAR $s'; }
  // The date is one unbreakable unit: it wraps as a whole, never leaving «2026» alone on the next line.
  static String date(DateTime d, {String locale = 'ar'}) => _western(DateFormat('d MMM yyyy', locale == 'ar' ? 'ar' : 'en').format(d.toLocal())).replaceAll(' ', '\u00a0');
  static String dateTime(DateTime d, {String locale = 'ar'}) => _western(DateFormat('d MMM yyyy\u00a0\u00b7 h:mm a', locale == 'ar' ? 'ar' : 'en').format(d.toLocal()));
  static DateTime? parseDate(Object? v) => v is String ? DateTime.tryParse(v) : null;
  /// Bidi-isolate an LTR run (WO number, asset code, VIN) so it doesn't scramble inside an RTL sentence.
  static String ltr(String s) => '\u2066$s\u2069';
  /// Compose a meta line ("WO-... - TRK-001 - 20 Aug 2026"): drops empty parts and bidi-isolates
  /// Latin/code runs so the line reads in order and never breaks around a dangling separator.
  static String meta(Iterable<String?> parts) => parts
      .whereType<String>()
      .where((p) => p.trim().isNotEmpty)
      .map((p) => RegExp(r'^[\x00-\xFF\u00d7]+$').hasMatch(p) && RegExp('[A-Za-z0-9]').hasMatch(p) ? ltr(p) : p)
      .join('\u00a0\u00b7 '); // NBSP before the dot: a line may end with a separator but never start with one
}
