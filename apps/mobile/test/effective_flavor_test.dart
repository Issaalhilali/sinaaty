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
}
