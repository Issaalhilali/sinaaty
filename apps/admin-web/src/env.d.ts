/** يُحقن عند البناء من angular.json → build.options.define (أو --define في Docker). غائبٌ في المختبِر، فالقراءة محروسة بـ typeof. */
declare const API_BASE_URL: string | undefined;
/**
 * مفتاح ترخيص PrimeUI. PrimeNG منذ الإصدار ٢٠ ليست MIT بل «PrimeUI License»: مجانية لمنشأةٍ دون مليون دولار
 * إيراداً وأقل من ٥ مطوّرين (مفتاح Community يُجدَّد سنوياً)، ومدفوعة لما فوق ذلك. التحقق بلا اتصال ولا قياس عن بُعد؛
 * وبلا مفتاحٍ صالح تُطبع لافتة «Invalid PrimeUI License» في الزاوية. المفتاح سرٌّ تشغيلي: يُحقن عند البناء ولا يُودع.
 */
declare const PRIMEUI_LICENSE: string | undefined;
