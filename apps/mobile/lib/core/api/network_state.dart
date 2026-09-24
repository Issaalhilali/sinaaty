import 'package:flutter/foundation.dart';

/// هل وصل آخر طلبٍ إلى الخادم؟ يُشتقّ من الطلبات نفسها لا من حزمة اتصال: كل ردٍّ (ولو خطأ 4xx)
/// يعني أن الخادم يُرى، وكل انقطاعٍ (connection error/timeout) بعد فشل إعادة الفحص يعني أنه لا يُرى.
/// `AppScaffold` يعرض شريط «غير متصل» ما دام كذلك — مؤشّرٌ واحد لكل النكهات (design-audit/UX_PROBLEMS.md §14).
abstract final class NetworkState {
  static final ValueNotifier<bool> online = ValueNotifier<bool>(true);
}
