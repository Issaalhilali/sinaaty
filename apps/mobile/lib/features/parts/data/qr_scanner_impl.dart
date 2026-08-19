import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../domain/parts_repository.dart';
/// Full-screen camera scanner; resolves with the first QR payload (token or sinaaty URL → token).
class MobileQrScanner implements QrScanner {
  final BuildContext Function() context; MobileQrScanner(this.context);
  @override Future<String?> scan() async {
    final raw = await Navigator.of(context()).push<String>(MaterialPageRoute(fullscreenDialog: true, builder: (_) => const _ScanPage()));
    if (raw == null) return null; final m = RegExp(r'/verify/([A-Za-z0-9_-]+)').firstMatch(raw); return m?.group(1) ?? raw.trim();
  }
}
class _ScanPage extends StatefulWidget { const _ScanPage(); @override State<_ScanPage> createState() => _ScanPageState(); }
class _ScanPageState extends State<_ScanPage> {
  bool _done = false;
  @override Widget build(BuildContext context) => Scaffold(backgroundColor: Colors.black, appBar: AppBar(backgroundColor: Colors.black, foregroundColor: Colors.white), body: Stack(children: [
    MobileScanner(onDetect: (c) { if (_done) return; final v = c.barcodes.firstOrNull?.rawValue; if (v == null) return; _done = true; Navigator.of(context).pop(v); }),
    Center(child: Container(width: 240, height: 240, decoration: BoxDecoration(border: Border.all(color: const Color(0xFF3FBF95), width: 2), borderRadius: BorderRadius.circular(16), boxShadow: const [BoxShadow(color: Color(0x663FBF95), blurRadius: 30)]))),
  ]));
}
