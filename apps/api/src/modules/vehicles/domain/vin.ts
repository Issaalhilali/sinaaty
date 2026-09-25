/** VIN rules (ISO 3779): 17 chars, no I/O/Q. Check digit is North-America specific → not enforced. */
export const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;
export function normalizeVin(input: string): string | null {
  const v = input.trim().toUpperCase().replace(/\s+/g, '');
  return VIN_RE.test(v) ? v : null;
}
const YEAR_CODES = '123456789ABCDEFGHJKLMNPRSTVWXY'; // position 10 → model year (30-year cycle)
export function modelYearFromVin(vin: string, now = new Date()): number | null {
  const c = vin.charAt(9); const idx = YEAR_CODES.indexOf(c); if (idx < 0) return null;
  // cycle starting 2001 ('1'); pick the most recent year not in the future (+1 for next model year)
  let year = 2001 + idx; const max = now.getFullYear() + 1;
  while (year + 30 <= max) year += 30;
  return year;
}
/**
 * لوحة سعودية: ثلاثة أحرف + ١–٤ أرقام. تُقبل بالترتيبين — «أ ب ج ١٢٣٤» و«١٢٣٤ أ ب ج» — لأن اللوحة
 * نفسها تحمل الأرقام والحروف معاً، وكلٌّ يقرؤها كما اعتاد؛ رفضُ أحد الترتيبين رفضٌ للوحة صحيحة
 * (شكوى المالك ٢٣ أغسطس ٢٠٢٦). وتُرفض الحروف خارج الحروف السبعة عشر المعتمدة بدل قبولها
 * وتحويلها إلى «?» في النسخة اللاتينية — لوحة مشوّهة تُطبع على فاتورة ضريبية وسند تنفيذ.
 */
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
export function normalizePlate(input: string): { ar: string; en: string } | null {
  const s = input.trim().replace(/ـ/g, '').replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d))).replace(/[-–]/g, ' ').replace(/\s+/g, ' ');
  const L = '[\\u0621-\\u064A]';
  const built = (letters: string[], digits: string) => {
    const en = letters.map(map);
    if (en.includes(null)) return null;                 // حرف ليس من حروف اللوحات — لا نخمّن
    return { ar: letters.map(canonical).join(' ') + ` ${digits}`, en: `${en.join('')} ${digits}` };
  };
  const arFirst = new RegExp(`^(${L})\\s?(${L})\\s?(${L})\\s?(\\d{1,4})$`).exec(s);
  if (arFirst) return built([arFirst[1]!, arFirst[2]!, arFirst[3]!], arFirst[4]!);
  const arLast = new RegExp(`^(\\d{1,4})\\s?(${L})\\s?(${L})\\s?(${L})$`).exec(s);
  if (arLast) return built([arLast[2]!, arLast[3]!, arLast[4]!], arLast[1]!);

  const enBuilt = (letters: string[], digits: string) => {
    const up = letters.map((c) => c.toUpperCase());
    const ar = up.map(rmap);
    if (ar.includes(null)) return null;
    return { ar: `${ar.join(' ')} ${digits}`, en: `${up.join('')} ${digits}` };
  };
  const enFirst = /^([A-Za-z])\s?([A-Za-z])\s?([A-Za-z])\s?(\d{1,4})$/.exec(s);
  if (enFirst) return enBuilt([enFirst[1]!, enFirst[2]!, enFirst[3]!], enFirst[4]!);
  const enLast = /^(\d{1,4})\s?([A-Za-z])\s?([A-Za-z])\s?([A-Za-z])$/.exec(s);
  if (enLast) return enBuilt([enLast[2]!, enLast[3]!, enLast[4]!], enLast[1]!);
  return null;
}
// خريطة حروف اللوحات السعودية المعتمدة (عربي ↔ لاتيني). ما ليس فيها ليس حرف لوحة.
const PLATE_MAP: Record<string, string> = { 'ا': 'A', 'أ': 'A', 'ب': 'B', 'ح': 'J', 'ج': 'J' /* lenient */, 'د': 'D', 'ر': 'R', 'س': 'S', 'ص': 'X', 'ط': 'T', 'ع': 'E', 'ق': 'G', 'ك': 'K', 'ل': 'L', 'م': 'Z', 'ن': 'N', 'هـ': 'H', 'ه': 'H', 'و': 'U', 'ى': 'V', 'ي': 'V' };
/** الشكل المعتمد للحرف العربي (أ لا ا، ه لا هـ، ي لا ى) حتى تتطابق اللوحة نفسها مع نفسها. */
const CANONICAL: Record<string, string> = { 'A': 'أ', 'B': 'ب', 'J': 'ح', 'D': 'د', 'R': 'ر', 'S': 'س', 'X': 'ص', 'T': 'ط', 'E': 'ع', 'G': 'ق', 'K': 'ك', 'L': 'ل', 'Z': 'م', 'N': 'ن', 'H': 'ه', 'U': 'و', 'V': 'ي' };
const map = (c: string): string | null => PLATE_MAP[c] ?? null;
const canonical = (c: string): string => { const e = PLATE_MAP[c]; return e ? CANONICAL[e]! : c; };
const rmap = (c: string): string | null => CANONICAL[c.toUpperCase()] ?? null;
/** الحروف المسموحة، للرسالة التي يقرأها صاحب السيارة. */
export const PLATE_LETTERS_AR = Object.values(CANONICAL).join(' ');
