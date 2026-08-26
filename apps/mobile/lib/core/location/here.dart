import 'package:geolocator/geolocator.dart';

/// أين العميل الآن.
///
/// كان يُطلب منه أن **يلصق رابط خرائط** — ومن انكسرت سيارته على الطريق لا يفتح تطبيق خرائط
/// لينسخ رابطاً ثم يعود. الموقع يُقرأ من الجهاز، والرابط يبقى مخرجاً لمن رفض الإذن أو أراد
/// موقعاً غير موقعه (سيارة في بيت أهله، أو طلبٌ نيابةً عن غيره).
class Here {
  const Here();

  /// الإحداثيات، أو `null` إن رُفض الإذن أو تعذّرت القراءة — فيُعرض المخرج اليدوي حينها.
  Future<({double lat, double lng})?> now() async {
    try {
      if (!await Geolocator.isLocationServiceEnabled()) return null;
      var p = await Geolocator.checkPermission();
      if (p == LocationPermission.denied) p = await Geolocator.requestPermission();
      if (p == LocationPermission.denied || p == LocationPermission.deniedForever) return null;
      // دقّة متوسطة تكفي: نبحث عن ورش في نطاق كيلومترات، لا نرسم مساراً. وهي أسرع وأقلّ استهلاكاً.
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.medium, timeLimit: Duration(seconds: 12)),
      );
      return (lat: pos.latitude, lng: pos.longitude);
    } catch (_) {
      return null;                       // انتهت المهلة أو منصة بلا موقع — لا نُعطّل الطلب
    }
  }
}
