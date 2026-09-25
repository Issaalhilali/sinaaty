/**
 * «قل وش فيها» — يقرأ كلام صاحب السيارة كما يقوله، ويقرر إلى أين يذهب طلبه.
 *
 * سبب وجود هذا الملف: **أكثر من يستخدم صناعية ليس متمكناً من التقنية** (قرار المالك). فبدل أن
 * نطلب منه أن يعرف الفرق بين «طلب إصلاح» و«طلب قطعة» و«سطحة»، يكتب أو يقول جملته الطبيعية
 * — «سيارتي ما تشتغل» أو «أبغى دينمو كامري ٢٠١٩» أو «بنشر على طريق الخرج» — ونحن نفهم.
 *
 * ومنطقُ الفهم **نقيٌّ هنا** لا في نموذجٍ بعيد: يعمل بلا إنترنت وبلا كلفة وبزمنٍ صفري، ونتيجته
 * قابلة للاختبار حرفاً بحرف. ونموذج اللغة (حين يتوفر) يشحذ هذه النتيجة ولا يستبدلها — فإن سقط
 * أو تأخّر بقي المساعد يعمل. هذا هو الفرق بين ميزةٍ تُعرض وميزةٍ يُعتمد عليها.
 */

/** إلى أين يذهب الطلب. */
export type TriageKind = 'repair' | 'part' | 'tow';

export interface TriageResult {
  kind: TriageKind;
  /** عنوانٌ قصير يُعرض للورشة/المحل — مأخوذٌ من كلامه لا مخترعٌ عليه. */
  titleAr: string;
  /** رموز الأعراض المعروفة التي ذُكرت (تُستعمل كما هي في سوق الإصلاح). */
  symptoms: string[];
  /** اسم القطعة حين يكون الطلب طلبَ قطعة. */
  partNameAr: string | null;
  /** عاجلٌ يعني: السيارة واقفة الآن أو خطرٌ على السلامة. */
  urgent: boolean;
  /** ثقةُ القرار (0–1): ما دونها نسأل بدل أن نفترض. */
  confidence: number;
  /** جملةٌ نعرضها له بلغته: «فهمت إن سيارتك ما تشتغل — نرسلها لورشك القريبة؟» */
  sayAr: string;
}

const norm = (s: string) =>
  s
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660))
    .replace(/[إأآا]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/[ً-ْـ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const has = (t: string, words: string[]) => words.some((w) => t.includes(norm(w)));

/** الأعراض المعروفة — نفس رموز سوق الإصلاح، فما يُفهم هنا يُرسل هناك بلا ترجمة. */
const SYMPTOMS: Array<{ code: string; words: string[] }> = [
  { code: 'no_start', words: ['ما تشتغل', 'ماتشتغل', 'لا تشتغل', 'ما تدور', 'ماتدور', 'ما بتشتغل', 'واقفه', 'وقفت', 'فصلت'] },
  { code: 'brakes', words: ['فرامل', 'بريك', 'بريك', 'مكابح', 'دسك', 'فحمات'] },
  { code: 'noise', words: ['صوت', 'طقطقه', 'صرير', 'خبط', 'ازيز'] },
  { code: 'heat', words: ['حراره', 'تسخن', 'سخنت', 'راديتر', 'حرارتها'] },
  { code: 'ac', words: ['مكيف', 'ما يبرد', 'مايبرد', 'تكييف'] },
  { code: 'electrical', words: ['كهرباء', 'بطاريه', 'دينمو', 'اضاءه', 'لمبه', 'شاحن'] },
  { code: 'leak', words: ['تسريب', 'يسرب', 'زيت ينزل', 'ماء ينزل', 'نقط'] },
  { code: 'shake', words: ['رجه', 'اهتزاز', 'ترجف', 'تهتز'] },
  { code: 'pulls', words: ['تسحب', 'تميل', 'ترمي'] },
  { code: 'warning', words: ['لمبه مضيه', 'علامه', 'تحذير', 'انجن شيك', 'اشاره'] },
  { code: 'body', words: ['صدمه', 'سمكره', 'دعم', 'خدش', 'حادث', 'دهان'] },
  { code: 'service', words: ['صيانه', 'تغيير زيت', 'زيت وفلتر', 'دوريه'] },
];

/** كلماتٌ تقول «أريد قطعة» لا «أريد إصلاحاً». */
const PART_INTENT = ['ابغي قطعه', 'ابي قطعه', 'ابغى قطعه', 'اريد قطعه', 'ابحث عن قطعه', 'قطعه غيار', 'ابغي', 'ابي', 'اريد', 'ابحث عن', 'وين الاقي', 'كم سعر'];
/** أسماء قطعٍ شائعة — وجودها مع نية الشراء يحسم الوجهة. */
const PART_NAMES = ['دينمو', 'بطاريه', 'رديتر', 'راديتر', 'كمبروسر', 'طرمبه', 'مساعد', 'مساعدات', 'دسكات', 'فحمات', 'كفر', 'رفرف', 'كبوت', 'صدام', 'شمعه', 'شمعات', 'بواجي', 'فلتر', 'مرايه', 'زجاج', 'قير', 'مكينه', 'دبل', 'عاكس', 'طرمبة', 'كليبسات', 'جلده', 'سير', 'طقم'];
/** السطحة: نقلٌ لا إصلاح. */
const TOW_WORDS = ['سطحه', 'ونش', 'سحب', 'قاطره', 'نقل السياره', 'ما تتحرك', 'ماتتحرك', 'بنشر', 'خربانه على الطريق', 'واقف على الطريق'];
const URGENT_WORDS = ['الحين', 'الان', 'مستعجل', 'ضروري', 'عالطريق', 'على الطريق', 'واقف', 'خطر', 'دخان'];

/** الطراز والسنة إن ذُكرا («كامري 2019») — يُرفقان بطلب القطعة فيصل المحلات دقيقاً. */
function readVehicle(t: string): string | null {
  const year = t.match(/\b(19[89]\d|20[0-4]\d)\b/)?.[0] ?? null;
  const makes = ['كامري', 'كورولا', 'يارس', 'هايلكس', 'لاندكروزر', 'برادو', 'اكورد', 'سيفيك', 'التيما', 'سنترا', 'سوناتا', 'النترا', 'اكسنت', 'كيا', 'اوبتيما', 'سيراتو', 'تاهو', 'سوبربان', 'شاهين', 'مازda'];
  const make = makes.find((m) => t.includes(norm(m))) ?? null;
  if (!make && !year) return null;
  return [make, year].filter(Boolean).join(' ');
}

/** أول جملةٍ مفيدة من كلامه، مقصوصةً بطول عنوان. */
function shortTitle(raw: string, max = 60): string {
  const one = raw.replace(/\s+/g, ' ').trim();
  if (one.length <= max) return one;
  const cut = one.slice(0, max);
  const sp = cut.lastIndexOf(' ');
  return `${(sp > 20 ? cut.slice(0, sp) : cut).trim()}…`;
}

/**
 * القرار. لا يرمي أبداً: كلامٌ لا نفهمه يعود `repair` بثقةٍ منخفضة — لأن الورشة تفهم ما لا نفهمه،
 * والأسوأ من فرزٍ خاطئ أن نقف في وجه إنسانٍ سيارته واقفة ونقول «لم أفهم».
 */
export function triage(input: string): TriageResult {
  const raw = (input ?? '').trim();
  const t = norm(raw);

  const symptoms = SYMPTOMS.filter((s) => has(t, s.words)).map((s) => s.code);
  const urgent = has(t, URGENT_WORDS) || symptoms.includes('no_start');

  // السطحة أولاً: «ما تتحرك» تعني النقل حتى لو ذُكر معها عطل.
  if (has(t, TOW_WORDS)) {
    return { kind: 'tow', titleAr: shortTitle(raw), symptoms, partNameAr: null, urgent: true, confidence: .92,
      sayAr: 'فهمت إن سيارتك ما تتحرك — نطلب لك سطحة الحين؟' };
  }

  // القطعة: اسمُ قطعةٍ صريح، أو نيّة شراءٍ واضحة.
  const partName = PART_NAMES.find((p) => t.includes(norm(p))) ?? null;
  if (partName && (has(t, PART_INTENT) || symptoms.length === 0)) {
    const veh = readVehicle(t);
    return { kind: 'part', titleAr: shortTitle(raw), symptoms: [], partNameAr: [partName, veh].filter(Boolean).join(' '), urgent, confidence: veh ? .9 : .75,
      sayAr: veh ? `فهمت إنك تبي «${partName}» لـ${veh} — نرسلها لمحلات القطع القريبة؟` : `فهمت إنك تبي «${partName}» — نرسلها لمحلات القطع القريبة؟` };
  }

  // وإلا فهو إصلاح: الأعراض المفهومة ترفع الثقة، وغيابها لا يمنع الإرسال.
  const confidence = symptoms.length >= 2 ? .9 : symptoms.length === 1 ? .8 : .5;
  const say = symptoms.length === 0
    ? 'وصفك وصل — نرسله لورشك القريبة وهم أدرى، وتوصلك عروضهم؟'
    : `فهمت المشكلة — نرسلها لورشك القريبة وتوصلك عروضهم؟`;
  return { kind: 'repair', titleAr: shortTitle(raw), symptoms, partNameAr: null, urgent, confidence, sayAr: say };
}
