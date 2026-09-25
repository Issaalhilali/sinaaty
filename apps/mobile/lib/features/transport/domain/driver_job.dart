/// ما يفعله السائق الآن — فعلٌ واحد لكل حالة، مشتقّ لا مكتوب في الشاشة.
///
/// **لماذا ملف مستقل:** جانب السائق كان موجوداً في الخادم كاملاً (ملف، اتصال، عروض، قبول، انتقالات،
/// تتبّع، إثبات تسليم) وغير موجود في التطبيق إطلاقاً — سوقٌ كامل لا يستطيع إنسان أن يعمل فيه.
/// وحين يُبنى، القاعدة نفسها التي تحكم الورشة تحكمه: **فعل واحد ظاهر لكل حالة**، والباقي يختفي.
///
/// الترتيب هنا ليس تجميلاً: سائقٌ يقود شاحنة لا يقرأ قائمة خيارات — يرى زرّاً واحداً كبيراً ويضغطه.
library;

/// خطوات المهمة كما يمرّ بها السائق فعلاً (تطابق آلة الحالات في الخادم).
const driverFlow = ['assigned', 'en_route_pickup', 'picked_up', 'en_route_dropoff', 'delivered'];

/// الفعل التالي: الحالة التي ينتقل إليها، أو null حين لا فعل للسائق (انتهت أو أُلغيت).
///
/// `delivered` **ليست** انتقالاً عادياً: تحتاج صورة ورمز المستلم، فتُعاد هنا كي تعرف الشاشة أن
/// الزرّ يفتح شاشة إثبات لا أن يرسل انتقالاً.
String? nextDriverStep(String status) => switch (status) {
      'assigned' => 'en_route_pickup',
      'en_route_pickup' => 'picked_up',
      'picked_up' => 'en_route_dropoff',
      'en_route_dropoff' => 'delivered',
      _ => null,
    };

/// هل يحتاج الفعل التالي إثباتاً (صورة + رمز المستلم) بدل انتقال مباشر؟
bool stepNeedsProof(String status) => nextDriverStep(status) == 'delivered';

/// هل المهمة ما زالت في يد السائق؟ (تُستعمل لتقرير التتبّع وشاشة «مهمتي الحالية»)
bool isDriverActive(String status) => driverFlow.contains(status) && status != 'delivered';

/// التتبّع يُرسل فقط بعد أن يبدأ السائق التحرّك فعلاً — قبل ذلك موقعه ليس من شأن أحد.
bool shouldTrack(String status) => const {'en_route_pickup', 'picked_up', 'en_route_dropoff'}.contains(status);
