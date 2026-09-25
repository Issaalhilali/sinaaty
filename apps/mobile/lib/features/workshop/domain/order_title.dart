/// اسم الأمر حين لا يكتبه أحد.
///
/// «وصف مختصر للعمل» كان حقلاً إلزامياً في التطبيق رغم أنه اختياري في الخادم — والمستشار يكتب فيه
/// ما كتبه في البنود نفسها، عشرات المرات يومياً، والسيارة أمامه ينتظر صاحبها. فصار الحقل تجاوزاً
/// اختيارياً: إن تُرك فارغاً يُسمّى الأمر ببنوده.
///
/// نسخة مطابقة لـ `summariseItems` في الخادم (`work-orders.use-cases.ts`) — لأن الورشة يجب أن **ترى**
/// الاسم قبل الإنشاء لا أن تكتشفه في القائمة بعده. الخادم يبقى المرجع: إن أرسلنا فارغاً، سمّاه هو.
library;

/// «تغيير زيت وفلتر ‎+2» — أول بند ثم عدد ما بعده. يعيد null حين لا بنود بعد.
String? autoTitle(List<String> itemDescriptions) {
  final items = [for (final d in itemDescriptions) d.trim()].where((d) => d.isNotEmpty).toList();
  if (items.isEmpty) return null;
  return items.length > 1 ? '${items.first} +${items.length - 1}' : items.first;
}
