/// عنوان رفعٍ يصل إليه الجهاز فعلاً.
///
/// على المحاكي (٢٣ سبتمبر ٢٠٢٦): صورة تسليم السطحة مرّت من `presign` ثم سقطت بـ«تعذّر الوصول إلى
/// الخادم» — التخزين الوهمي يبني عنوان الرفع من `API_BASE_URL` الخاص بالخادم (`localhost:3000`)،
/// وlocalhost على الجوال هو الجوال نفسه لا الخادم. عنوانٌ حلقيّ لا يصلح من جهازٍ آخر أبداً، فيُبدَّل
/// مضيفُه بمضيف الخادم الذي يكلّمه التطبيق أصلاً. أي عنوانٍ آخر (S3 حقيقي) يمرّ كما هو.
String reachableUploadUrl(String url, String apiBaseUrl) {
  final u = Uri.tryParse(url); final base = Uri.tryParse(apiBaseUrl);
  if (u == null || base == null || !u.hasAuthority || base.host.isEmpty) return url;
  const loopback = {'localhost', '127.0.0.1', '::1', '[::1]'};
  if (!loopback.contains(u.host)) return url;
  return u.replace(scheme: base.scheme, host: base.host, port: base.hasPort ? base.port : (base.scheme == 'https' ? 443 : 80)).toString();
}
