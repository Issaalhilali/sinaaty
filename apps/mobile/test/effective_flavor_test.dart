import 'package:flutter_test/flutter_test.dart';
import 'package:sinaaty/core/config/app_config.dart';
import 'package:sinaaty/features/home/domain/effective_flavor.dart';

void main() {
  group('الدور من الحساب لا من البناء — على الوِب', () {
    test('رابطٌ واحد: بلا منشأة عميل، ومعها شريك', () {
      expect(effectiveFlavor(built: AppFlavor.customer, hasOrg: false, isWeb: true), AppFlavor.customer);
      expect(effectiveFlavor(built: AppFlavor.customer, hasOrg: true, isWeb: true), AppFlavor.partner);
    });
    test('ولا يهمّ بأي نكهة بُني الوِب — الحساب يقرّر', () {
      expect(effectiveFlavor(built: AppFlavor.partner, hasOrg: false, isWeb: true), AppFlavor.customer);
    });
    test('الأساطيل تبقى صريحة: عضويّتها منشأةٌ أيضاً فلا يميّزها الحساب', () {
      expect(effectiveFlavor(built: AppFlavor.fleet, hasOrg: true, isWeb: true), AppFlavor.fleet);
    });
  });

  group('الجوال: النكهة مخبوزة', () {
    // من نزّل «صناعتي للشركاء» يريدها — ولا يُقلب تطبيقه لأنه لم يسجّل ورشته بعد.
    test('لا تتبدّل بحال الحساب', () {
      expect(effectiveFlavor(built: AppFlavor.partner, hasOrg: false, isWeb: false), AppFlavor.partner);
      expect(effectiveFlavor(built: AppFlavor.customer, hasOrg: true, isWeb: false), AppFlavor.customer);
    });
  });

  group('«سجّل ورشتك» لا تُعرض على من ورشته قائمة', () {
    // العطل الحيّ (٢٧ أغسطس): خروجُ عميلٍ ثم دخولُ صاحب ورشة النور — قائمة المنشآت المحفوظة
    // من الحساب السابق كانت فارغة، فاستقبلته شاشة التسجيل ثوانيَ يُقال له فيها أنشئ ما أنشأتَه.
    test('صاحب منشأة لا يُساق إلى التسجيل مهما كانت القائمة المحفوظة', () {
      expect(shouldOnboard(flavor: AppFlavor.partner, signedIn: true, hasOrg: true), isFalse);
    });
    test('من لا منشأة له يُساق إليه — وهذا سبب وجود الشاشة', () {
      expect(shouldOnboard(flavor: AppFlavor.partner, signedIn: true, hasOrg: false), isTrue);
    });
    test('«لم يصل الحساب بعد» ليس «بلا منشأة»', () {
      expect(shouldOnboard(flavor: AppFlavor.partner, signedIn: false, hasOrg: false), isFalse);
    });
    test('العميل والأسطول لا يريان الشاشة أصلاً', () {
      expect(shouldOnboard(flavor: AppFlavor.customer, signedIn: true, hasOrg: false), isFalse);
      expect(shouldOnboard(flavor: AppFlavor.fleet, signedIn: true, hasOrg: false), isFalse);
    });
  });
}
