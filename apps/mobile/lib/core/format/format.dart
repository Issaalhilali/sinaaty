import 'package:intl/intl.dart';
/// Presentation-only formatting: money as "1,368.50 ر.س", dates in Asia/Riyadh (device local for MVP), Western digits.
abstract final class Fmt {
  /// Western digits everywhere (charter: calm, consistent numbers), even for the Arabic locale.
  static String _western(String s) => s.replaceAllMapped(RegExp('[\u0660-\u0669]'), (m) => String.fromCharCode(m.group(0)!.codeUnitAt(0) - 0x0660 + 0x30)).replaceAll('\u060C', ',');
  static String money(String amount, {String locale = 'ar'}) { final n = double.tryParse(amount) ?? 0; final s = NumberFormat('#,##0.00', 'en_US').format(n); return locale == 'ar' ? '$s ر.س' : 'SAR $s'; }
  static String date(DateTime d, {String locale = 'ar'}) => _western(DateFormat('d MMM yyyy', locale == 'ar' ? 'ar' : 'en').format(d.toLocal()));
  static String dateTime(DateTime d, {String locale = 'ar'}) => _western(DateFormat('d MMM yyyy · h:mm a', locale == 'ar' ? 'ar' : 'en').format(d.toLocal()));
  static DateTime? parseDate(Object? v) => v is String ? DateTime.tryParse(v) : null;
  /// Bidi-isolate an LTR run (WO number, asset code, VIN) so it doesn't scramble inside an RTL sentence.
  static String ltr(String s) => '\u2066$s\u2069';
}
