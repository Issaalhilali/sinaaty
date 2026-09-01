import 'package:flutter_test/flutter_test.dart';
import 'package:sinaaty/features/service_market/data/service_market_repository_impl.dart';

/// **عقد السلك**: ما يرسله الخادم فعلاً، لا ما نظنّه.
///
/// الخادم يرسل camelCase (`titleAr`) وكان المُحلِّل يقرأ snake_case (`title_ar`)، فظهرت كل
/// طلبات الإصلاح **بلا عنوان** على الجهاز — حقلٌ موجودٌ تماماً ويضيع في الترجمة. لم يمسكه أي
/// اختبار لأن كل اختباراتنا تزيّف المستودع فتقفز فوق هذه الطبقة بالضبط.
///
/// هذه العيّنة منسوخةٌ من ردٍّ حقيقي (GET /v1/service-requests) — فإن غيّر الخادم لغته يوماً
/// سقط هذا الاختبار قبل أن يسقط العميل أمام شاشةٍ بيضاء.
void main() {
  test('ردّ الخادم بـcamelCase يُقرأ كاملاً — العنوان والنطاق والمهلة', () {
    final wire = <String, dynamic>{
      'id': '4a80f09d-485f-48dd-858b-a811ec8e5cb8',
      'number': 'SR-2026-000150',
      'customerUserId': '56dedc63',
      'vehicleId': '060fb072',
      'titleAr': 'صوت طقطقة عند المطبات',
      'descriptionAr': null,
      'lat': 24.7136, 'lng': 46.6753,
      'radiusKm': 20,
      'preferredTime': 'today',
      'status': 'open',
      'expiresAt': '2026-09-01T23:32:06.589Z',
      'createdAt': '2026-09-01T19:32:06.589Z',
    };
    final r = requestFromJson(wire);
    expect(r.titleAr, 'صوت طقطقة عند المطبات');   // كان يعود فارغاً
    expect(r.radiusKm, 20);                        // وكان يعود 15 افتراضياً
    expect(r.preferredTime, 'today');
    expect(r.vehicleId, '060fb072');
    expect(r.expiresAt, isNotNull);                // المهلة تصل فينبض المؤقّت
    expect(r.remaining, isNotNull);
  });

  test('وردّ بـsnake_case يبقى مقروءاً — لا نكسر ما كان يعمل', () {
    final r = requestFromJson(<String, dynamic>{
      'id': 'x', 'number': 'SR-1', 'title_ar': 'صيانة', 'radius_km': 30,
      'preferred_time': 'now', 'status': 'open', 'created_at': '2026-09-01T19:32:06.589Z',
    });
    expect(r.titleAr, 'صيانة');
    expect(r.radiusKm, 30);
    expect(r.preferredTime, 'now');
  });
}
