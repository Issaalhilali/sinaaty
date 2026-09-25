/// ما يلاحظه صاحب السيارة، لا ما يعرفه الميكانيكي.
///
/// كانت الشاشة تفتح على صفحة بيضاء تقول «صف المشكلة» — وأكثر الناس لا يصف عطلاً بالكتابة، فيكتب
/// «السيارة خربانة» أو يترك الطلب. وهذه الكلمات مأخوذة من لسان العميل: «تسحب على جنب»، «صوت عند
/// المكابح» — لا «اختلال زاوية الميلان» ولا «اهتراء الأقمشة».
///
/// نصٌّ عربيٌّ واحد لكل عرَض، هو نفسه ما تقرؤه الورشة في الطلب — فلا ترجمة بين ما نقره وما وصلها.
class Symptom {
  final String code;      // ثابت لا يُترجم: يُخزَّن ويُحلَّل، والعرض شيء آخر
  final String labelAr;
  final String icon;      // اسم أيقونة Material — التعيين في الطبقة العارضة
  const Symptom(this.code, this.labelAr, this.icon);
}

const kSymptoms = <Symptom>[
  Symptom('no_start', 'ما تشتغل', 'power_settings_new'),
  Symptom('noise', 'صوت غريب', 'graphic_eq'),
  Symptom('brakes', 'صوت أو ضعف في المكابح', 'do_not_step'),
  Symptom('overheat', 'حرارة مرتفعة', 'thermostat'),
  Symptom('vibration', 'اهتزاز أو رجّة', 'vibration'),
  Symptom('pulls', 'تسحب على جنب', 'call_split'),
  Symptom('leak', 'تسريب زيت أو ماء', 'water_drop'),
  Symptom('warning_light', 'لمبة تحذير مضاءة', 'warning_amber'),
  Symptom('ac', 'المكيّف لا يبرّد', 'ac_unit'),
  Symptom('electrical', 'كهرباء أو إضاءة', 'bolt'),
  Symptom('body', 'صدمة أو سمكرة', 'car_crash'),
  Symptom('service', 'صيانة دورية', 'build'),
];

/// عنوان الطلب كما تقرؤه الورشة: الأعراض المختارة أولاً، ثم ما كتبه بلسانه.
///
/// الترتيب مقصود — الورشة تقرأ سطراً واحداً في بطاقة الإشعار، فليكن أدلّ ما عنده.
String requestTitle({required List<Symptom> picked, required String note}) {
  final n = note.trim();
  if (picked.isEmpty) return n;
  final head = picked.map((s) => s.labelAr).join(' · ');
  return n.isEmpty ? head : '$head — ${n.split('\n').first}';
}

/// هل يكفي ما أدخله لإرسال الطلب؟ عرَضٌ واحد يكفي، أو وصفٌ ذو معنى.
bool canSend({required List<Symptom> picked, required String note}) =>
    picked.isNotEmpty || note.trim().length >= 5;

/// ما ينقصه بالضبط — تُعرض بدل زرٍّ ميت لا يقول شيئاً.
String? missing({required List<Symptom> picked, required String note, required bool hasVehicle, required bool hasPlace}) {
  if (!hasVehicle) return 'اختر السيارة أولاً';
  if (!canSend(picked: picked, note: note)) return 'اختر ما تلاحظه، أو صف المشكلة بسطر';
  if (!hasPlace) return 'نحتاج موقعك لنعرض طلبك على الورش القريبة';
  return null;
}
