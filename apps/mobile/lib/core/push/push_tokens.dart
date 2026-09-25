import 'dart:async';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

/// رمز الجهاز عند FCM — وهو ما يجعل الإشعار يصل والتطبيق مغلق.
///
/// منفذٌ لا نداءً مباشراً: الاختبارات تعمل بلا Firebase (لا ملفات إعداد في بيئة الاختبار)،
/// والشاشات لا تعرف المزوّد.
abstract class PushTokens {
  /// الرمز الحالي، أو `null` إن رفض المستخدم الإذن أو تعذّر الحصول عليه.
  /// **لا يُستدعى عند الإقلاع**: على iOS يطلب هذا الإذنَ، والإذن يُطلب حين يفيد صاحبه لا قبله.
  Future<String?> token();

  /// تبدّل الرمز (يحدث بعد إعادة التنصيب أو تنظيف بيانات التطبيق) — نرسله من جديد.
  Stream<String> get refreshed;
}

class FcmPushTokens implements PushTokens {
  @override Future<String?> token() async {
    try {
      if (Firebase.apps.isEmpty) return null;                     // لم تُهيَّأ: بناءٌ بلا ملفات إعداد
      final m = FirebaseMessaging.instance;
      final s = await m.requestPermission();
      if (s.authorizationStatus == AuthorizationStatus.denied) return null;
      return await m.getToken();
    } catch (_) {
      return null;                                                // غياب الإشعار لا يمنع الدخول أبداً
    }
  }
  @override Stream<String> get refreshed => Firebase.apps.isEmpty ? const Stream.empty() : FirebaseMessaging.instance.onTokenRefresh;
}

/// بيئة الاختبار وأي بناء بلا Firebase.
class NoPushTokens implements PushTokens {
  @override Future<String?> token() async => null;
  @override Stream<String> get refreshed => const Stream.empty();
}
