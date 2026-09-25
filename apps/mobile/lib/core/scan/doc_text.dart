import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';

/// قراءة نصّ وثيقة من صورة — **على الجهاز، بلا شبكة**.
///
/// الاستمارة تحمل اسم المالك ورقم هويته؛ إرسالها إلى خدمة خارجية قرارُ إقامة بيانات لا ميزة
/// (§5.4). القراءة داخل الجوال تُلغي السؤال، ولا تحتاج اتصالاً أصلاً.
///
/// منفذٌ لا صنف: الاختبارات تُبدّله بنصّ جاهز، ولا تشغّل كاميرا ولا نموذجاً.
abstract interface class DocTextReader {
  /// يعيد كامل ما قُرئ، أو null حين تتعذّر القراءة.
  Future<String?> read(String imagePath);
}

class MlKitDocTextReader implements DocTextReader {
  @override Future<String?> read(String imagePath) async {
    // اللاتينية تكفي: رقم الهيكل والسنة واللوحة والماركة تُطبع لاتينيةً على الاستمارة السعودية.
    final recognizer = TextRecognizer(script: TextRecognitionScript.latin);
    try {
      final result = await recognizer.processImage(InputImage.fromFile(File(imagePath)));
      return result.text.trim().isEmpty ? null : result.text;
    } catch (_) {
      return null;   // كاميرا مغلقة أو صورة تالفة: الشاشة تقول ذلك، ولا ينهار شيء.
    } finally {
      await recognizer.close();
    }
  }
}

final docTextReaderProvider = Provider<DocTextReader>((ref) => MlKitDocTextReader());
