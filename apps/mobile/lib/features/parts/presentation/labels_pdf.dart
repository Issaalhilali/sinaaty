import 'dart:typed_data';
import 'package:flutter/services.dart' show rootBundle;
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import '../domain/parts.dart';

/// ملصقات الدفعة ورقةً تُطبع أو تُشارك: شبكة ٣×٤ على A4، كل خانة رمز QR (الـtoken وحده — ما يقرؤه ماسح
/// التركيب) واسم القطعة والرقم التسلسلي وسطر «امسح للتحقق · صناعية». الخط Almarai نفسه كي تبقى الهوية على الورق.
Future<Uint8List> buildLabelsPdf({required List<PartLabel> labels, String? partName, required String batch, required String scanLine, required String brand}) async {
  final regular = pw.Font.ttf(await rootBundle.load('assets/fonts/Almarai-Regular.ttf'));
  final bold = pw.Font.ttf(await rootBundle.load('assets/fonts/Almarai-Bold.ttf'));
  final doc = pw.Document(title: '$brand · $batch', theme: pw.ThemeData.withFont(base: regular, bold: bold));
  const perPage = 12;
  for (var p = 0; p < labels.length; p += perPage) {
    final page = labels.sublist(p, (p + perPage).clamp(0, labels.length));
    doc.addPage(pw.Page(pageFormat: PdfPageFormat.a4, margin: const pw.EdgeInsets.all(28), textDirection: pw.TextDirection.rtl, build: (ctx) => pw.Column(children: [
      pw.Row(mainAxisAlignment: pw.MainAxisAlignment.spaceBetween, children: [
        pw.Text(brand, style: pw.TextStyle(font: bold, fontSize: 12, color: const PdfColor.fromInt(0xFF0E6B54))),
        pw.Text(batch, style: pw.TextStyle(font: regular, fontSize: 10, color: const PdfColor.fromInt(0xFF66756F)), textDirection: pw.TextDirection.ltr),
      ]),
      pw.SizedBox(height: 12),
      pw.GridView(crossAxisCount: 3, childAspectRatio: .78, crossAxisSpacing: 10, mainAxisSpacing: 10, children: [
        for (final l in page) pw.Container(
          decoration: pw.BoxDecoration(border: pw.Border.all(color: const PdfColor.fromInt(0xFFC9D4CE), width: .8), borderRadius: pw.BorderRadius.circular(8)),
          padding: const pw.EdgeInsets.all(8),
          child: pw.Column(mainAxisAlignment: pw.MainAxisAlignment.center, children: [
            pw.BarcodeWidget(barcode: pw.Barcode.qrCode(), data: l.qrToken, width: 96, height: 96, drawText: false),
            pw.SizedBox(height: 6),
            if (partName != null && partName.isNotEmpty) pw.Text(partName, style: pw.TextStyle(font: bold, fontSize: 10), maxLines: 1, textAlign: pw.TextAlign.center),
            pw.Text(l.serialNumber, style: pw.TextStyle(font: regular, fontSize: 7, color: const PdfColor.fromInt(0xFF3B4A45)), maxLines: 2, textAlign: pw.TextAlign.center, textDirection: pw.TextDirection.ltr),
            pw.SizedBox(height: 3),
            pw.Text(scanLine, style: pw.TextStyle(font: regular, fontSize: 7, color: const PdfColor.fromInt(0xFF66756F)), textAlign: pw.TextAlign.center),
          ]),
        ),
      ]),
    ])));
  }
  return doc.save();
}
