import '../../../core/result/result.dart';

/// ما فهمه المساعد من كلام صاحب السيارة.
class Triage {
  /// repair | part | tow
  final String kind;
  final String titleAr;
  final List<String> symptoms;
  final String? partNameAr;
  final bool urgent;
  final double confidence;
  /// الجملة التي نقولها له بلغته — لا نعرض عليه رموزاً ولا نسباً.
  final String sayAr;
  const Triage({required this.kind, required this.titleAr, required this.symptoms,
      this.partNameAr, required this.urgent, required this.confidence, required this.sayAr});
}

abstract interface class AssistRepository {
  Future<Result<Triage>> analyze(String text);
}
