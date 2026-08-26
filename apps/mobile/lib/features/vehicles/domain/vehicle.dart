class Vehicle {
  final String id; final String? vin; final String? plate; final String? makeAr; final String? modelAr; final int? year; final String? colorAr; final int? odometerKm;
  /// معرّف الصنع — به نُقدّم الورش المتخصّصة بسيارته على غيرها.
  final int? makeId;
  const Vehicle({required this.id, this.vin, this.plate, this.makeAr, this.modelAr, this.year, this.colorAr, this.odometerKm, this.makeId});
  /// «تويوتا كامري 2019» إن عرفنا نوعها، وإلا اللوحة.
  String get name => [makeAr, modelAr, year?.toString()].whereType<String>().join(' ').trim();
  bool get isNamed => name.isNotEmpty;
  String get title => isNamed ? name : (plate ?? vin ?? '');
  /// السطر الثاني لا يكرّر الأول: سيارةٌ أُضيفت بلوحتها وحدها كانت تظهر «أ ب ح 1234» مرّتين —
  /// صفٌّ يقول شيئاً واحداً مرتين ولا يقول ما ينقص. الآن يدعو لإكمال ما يعرّفها.
  String get subtitle {
    if (!isNamed) return vin == null ? 'أضف رقم الهيكل لنعرف نوعها' : 'VIN ${vin!.substring(vin!.length - 6)}';
    return [plate, if (vin != null) 'VIN ${vin!.substring(vin!.length - 6)}'].whereType<String>().join(' · ');
  }
}
class VehicleEvent { final String id; final String type; final DateTime occurredAt; final String summaryAr; final String? summaryEn; final String? orgNameAr; final int? odometerKm; const VehicleEvent({required this.id, required this.type, required this.occurredAt, required this.summaryAr, this.summaryEn, this.orgNameAr, this.odometerKm}); }
class VehiclePassport { final Vehicle vehicle; final List<VehicleEvent> events; const VehiclePassport(this.vehicle, this.events); }
