/// ما يصل المنشأة **الآن** — طلب إصلاح لورشة، أو طلب قطعة لتشليح أو وكيل.
///
/// **لماذا:** الحلقة كانت مقطوعة عند الباب. الطلب يصل الرصيف في ٦ ملّي ثانية — لمن يسحب القائمة.
/// وصاحب الورشة تحت سيارة لا يسحب قوائم. فصار الخادم يبثّ على `org:{id}`، وهذا الملف يحوّل ما
/// يصل إلى شيءٍ يُعرض ويُقبل بنقرة، مثل طلب توصيل تماماً.
///
/// القواعد هنا قرارات عمل لا تفاصيل واجهة، ولذلك هي نقيّة ومختبَرة.
library;

enum IncomingKind { service, part }

class Incoming {
  final IncomingKind kind;
  final String id;
  final String number;

  /// «سمكرة رفرف» للإصلاح، «طقم فحمات أمامي» للقطعة — أول ما تقرؤه العين.
  final String titleAr;

  /// قد تكون null (منشأة بلا موقع مضبوط): البطاقة تحذف السطر ولا تطبع «null كم».
  final String? distanceKm;

  /// سطر ثانٍ يختلف بنوع الطلب: الوقت المفضّل للإصلاح، أو الكمية ورقم الهيكل للقطعة.
  final String? metaAr;

  final DateTime at;
  const Incoming({required this.kind, required this.id, required this.number, required this.titleAr,
    this.distanceKm, this.metaAr, required this.at});

  /// المسار الذي يفتحه «التفاصيل» — نفس مسار الرابط العميق في الإشعار.
  String get route => kind == IncomingKind.service ? '/ws/service-requests/$id' : '/parts/requests/$id';
}

/// يقرأ حمولة القناة كما يرسلها الخادم (snake_case) ويعيد null لما لا يصلح بطاقةً.
///
/// حمولةٌ بلا معرّف ليست طلباً — تُهمَل بصمت بدل أن تُرسم بطاقة تفتح على لا شيء.
Incoming? incomingFromEvent(String event, Map<String, dynamic> j) {
  final id = j['request_id'] as String?;
  final number = j['number'] as String?;
  if (id == null || number == null) return null;
  final dist = j['distance_km']?.toString();
  final at = DateTime.tryParse((j['created_at'] ?? '') as String? ?? '') ?? DateTime.now();
  if (event == 'service-request') {
    return Incoming(kind: IncomingKind.service, id: id, number: number,
      titleAr: (j['title_ar'] as String?) ?? '', distanceKm: dist, metaAr: j['preferred_time'] as String?, at: at);
  }
  if (event == 'part-request') {
    final qty = (j['quantity'] as num?)?.toInt() ?? 1;
    final vin = j['vin'] as String?;
    return Incoming(kind: IncomingKind.part, id: id, number: number,
      titleAr: (j['part_name_ar'] as String?) ?? '',
      distanceKm: dist,
      metaAr: [if (qty > 1) '× $qty', if (vin != null && vin.length >= 6) 'VIN ${vin.substring(vin.length - 6)}'].join(' · '),
      at: at);
  }
  return null;
}

/// الطابور: الأحدث أولاً، بلا تكرار، وبسقف.
///
/// **السقف قرار عمل**: ورشة تعود بعد ساعة إلى عشرين بطاقة لن تقرأ أياً منها — فتُبقى الثلاث
/// الأحدث، والباقي يبقى في القائمة العادية حيث لا يُلحّ. الإلحاح على كل شيء إلغاءٌ للإلحاح.
List<Incoming> pushIncoming(List<Incoming> queue, Incoming item, {int max = 3, Set<String> dismissed = const {}}) {
  if (dismissed.contains(item.id)) return queue;
  final next = [item, ...queue.where((x) => x.id != item.id)];
  return next.length <= max ? next : next.sublist(0, max);
}
