import 'package:flutter/foundation.dart' show kIsWeb;
import '../../../core/config/app_config.dart';

/// أيّ تجربةٍ يرى هذا المستخدم.
///
/// على الجوال النكهة مخبوزة: المتاجر تطلب تطبيقات منفصلة، ومن نزّل «صناعتي للشركاء» يريدها.
///
/// وعلى **الوِب** لا معنى لثلاثة روابط — ومن يفتح رابطاً لا يختار «نسخة». عضويّته في منشأة هي
/// التي تقول من هو: بلا منشأة عميل، ومعها شريك. رابطٌ واحد يخدم الثلاثة، وهذا ما يجعله منتجاً
/// واحداً لا ثلاثة تتشابه.
///
/// والأساطيل تبقى مخبوزة: عضويّتها منشأةٌ أيضاً، فلا يميّزها الحساب وحده — نكهةٌ صريحة لا تخمين.
AppFlavor effectiveFlavor({required AppFlavor built, required bool hasOrg, bool isWeb = kIsWeb}) {
  if (!isWeb || built == AppFlavor.fleet) return built;
  return hasOrg ? AppFlavor.partner : AppFlavor.customer;
}
