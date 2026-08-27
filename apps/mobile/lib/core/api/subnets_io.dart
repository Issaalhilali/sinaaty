import 'dart:io';

/// «10.108.181.» من عنوان الجهاز نفسه — الخادم على نفس الشبكة الفرعية.
Future<List<String>> localSubnets() async {
  final out = <String>[];
  try {
    for (final ni in await NetworkInterface.list(type: InternetAddressType.IPv4, includeLoopback: false)) {
      for (final a in ni.addresses) {
        final parts = a.address.split('.');
        if (parts.length == 4) out.add('${parts[0]}.${parts[1]}.${parts[2]}.');
      }
    }
  } catch (_) { /* منصة بلا صلاحية جرد الشبكات */ }
  return out.toSet().toList();
}
