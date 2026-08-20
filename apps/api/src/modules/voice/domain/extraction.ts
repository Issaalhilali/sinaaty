import type { WoItemType } from '@sinaaty/shared-types';

/**
 * One line the service advisor said out loud, turned into something a work order can hold.
 * `confidence` is what the extractor believes, not a promise — every line is reviewed by a human before
 * it touches money (that is the whole point of the review step).
 */
export interface ExtractedItem {
  type: WoItemType;
  descriptionAr: string;
  quantity: string;
  unitPrice: string | null;
  confidence: number;
  /** The words this line came from — the reviewer sees what was heard, not only what was inferred. */
  heardAr: string;
}

/** Arabic-Indic digits and separators normalised so «٢٦٠» and «260» are the same number. */
export function normalizeArabicDigits(text: string): string {
  const map: Record<string, string> = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9', '٫': '.', '،': ',' };
  return text.replace(/[٠-٩٫،]/g, (c) => map[c] ?? c).replace(/ـ/g, '');
}

const ONES: Record<string, number> = {
  'واحد': 1, 'اثنين': 2, 'اثنان': 2, 'ثنتين': 2, 'ثلاثة': 3, 'ثلاث': 3, 'أربعة': 4, 'اربعة': 4, 'أربع': 4, 'اربع': 4,
  'خمسة': 5, 'خمس': 5, 'ستة': 6, 'ست': 6, 'سبعة': 7, 'سبع': 7, 'ثمانية': 8, 'ثمان': 8, 'تسعة': 9, 'تسع': 9, 'عشرة': 10, 'عشر': 10,
};
const TENS: Record<string, number> = { 'عشرين': 20, 'ثلاثين': 30, 'أربعين': 40, 'اربعين': 40, 'خمسين': 50, 'ستين': 60, 'سبعين': 70, 'ثمانين': 80, 'تسعين': 90 };
const HUNDREDS: Record<string, number> = {
  'مئة': 100, 'مية': 100, 'مائة': 100, 'مئتين': 200, 'مئتان': 200, 'ميتين': 200,
  'ثلاثمئة': 300, 'ثلاثمائة': 300, 'أربعمئة': 400, 'اربعمئة': 400, 'خمسمئة': 500, 'خمسمائة': 500,
  'ستمئة': 600, 'سبعمئة': 700, 'ثمانمئة': 800, 'تسعمئة': 900,
};
const THOUSANDS: Record<string, number> = { 'ألف': 1000, 'الف': 1000, 'ألفين': 2000, 'الفين': 2000, 'آلاف': 1000 };

/**
 * Spoken Saudi Arabic numbers: «مئتين وستين» → 260, «ألف وخمسمئة» → 1500, «ثلاثة آلاف» → 3000.
 * Returns null when the words carry no number — a price the advisor never said must stay empty rather
 * than be guessed, because the customer signs this amount.
 */
export function parseSpokenNumber(input: string): number | null {
  const text = normalizeArabicDigits(input);
  const digits = /(\d+(?:\.\d+)?)/.exec(text);
  if (digits) return Number(digits[1]);

  const words = text.replace(/[^ء-ي\s]/g, ' ').split(/\s+/).filter(Boolean);
  let total = 0; let found = false; let pendingMultiplier = 0;
  for (const raw of words) {
    const w = raw.replace(/^و/, '') || raw;
    if (THOUSANDS[w] != null) {
      // «ثلاثة آلاف» — the count came just before the multiplier.
      total += (pendingMultiplier || 1) * (w === 'آلاف' ? 1000 : THOUSANDS[w]);
      if (w !== 'آلاف' && THOUSANDS[w] > 1000) { /* ألفين already carries its count */ }
      pendingMultiplier = 0; found = true; continue;
    }
    if (HUNDREDS[w] != null) { total += HUNDREDS[w]; pendingMultiplier = 0; found = true; continue; }
    if (TENS[w] != null) { total += TENS[w]; pendingMultiplier = 0; found = true; continue; }
    if (ONES[w] != null) { pendingMultiplier = ONES[w]!; total += ONES[w]; found = true; continue; }
  }
  if (!found) return null;
  return total;
}

interface Rule { type: WoItemType; keywords: string[]; labelAr: (heard: string) => string }

/**
 * Keyword rules used by the offline extractor and as a sanity net over the model's output. They encode
 * what a Saudi workshop actually says, not a taxonomy: «سمكرة ودهان» is paint work, «تغيير زيت» is labour
 * plus a part, «دسكات» is a part.
 */
const RULES: Rule[] = [
  { type: 'paint', keywords: ['سمكرة', 'دهان', 'بوية', 'رش'], labelAr: (h) => h },
  { type: 'diagnostic', keywords: ['فحص', 'كشف', 'تشخيص'], labelAr: (h) => h },
  { type: 'towing', keywords: ['سطحة', 'قطر'], labelAr: (h) => h },
  { type: 'part', keywords: ['فلتر', 'دسكات', 'بطارية', 'مساعد', 'كمبروسر', 'ردياتير', 'طرمبة', 'قطعة', 'زيت'], labelAr: (h) => h },
  { type: 'labor', keywords: ['تغيير', 'تركيب', 'فك', 'صيانة', 'ضبط', 'برمجة', 'أجور', 'اجور', 'غسيل'], labelAr: (h) => h },
];

/**
 * A sentence that *starts* with an action is work, even when a part is named inside it: «تغيير زيت وفلتر»
 * is a service the workshop bills as labour, not a bag of oil. The advisor adds the part line separately
 * when they mean the part alone.
 */
const ACTION_FIRST = ['تغيير', 'تركيب', 'فك', 'صيانة', 'ضبط', 'برمجة', 'غسيل', 'إصلاح', 'اصلاح'];

/** Words that introduce a price. «ب» is written attached to the number (بمئتين), so it is handled apart. */
const PRICE_WORDS = ['بسعر', 'بمبلغ', 'السعر', 'قيمته', 'قيمتها', 'المبلغ'];

const NUMBER_START = /^(?:[\d.]|مئ|مي|مائ|ألف|الف|خمس|ست|سبع|ثمان|تسع|عشر|ثلاث|أربع|اربع|واحد|اثن|ثنت)/u;

/**
 * The price the advisor said, or null. Deliberately conservative: the customer signs this amount, so a
 * number we are not sure about is left for the human to fill in.
 */
export function priceFrom(sentence: string): number | null {
  const words = normalizeArabicDigits(sentence).split(/\s+/).filter(Boolean);
  const qtyAt = words.findIndex((w) => w === 'عدد' || w === 'كمية');
  const withoutQty = qtyAt >= 0 ? [...words.slice(0, qtyAt), ...words.slice(qtyAt + 2)] : words;

  const markerAt = withoutQty.findIndex((w) => PRICE_WORDS.includes(w));
  if (markerAt >= 0) return parseSpokenNumber(withoutQty.slice(markerAt + 1).join(' '));

  // «بمئتين وستين» — the ب is glued to the number word, and the rest of the amount follows with «و».
  const attachedAt = withoutQty.findIndex((w) => w.length > 1 && w.startsWith('ب') && NUMBER_START.test(w.slice(1)));
  if (attachedAt >= 0) return parseSpokenNumber(withoutQty.slice(attachedAt).map((w, i) => (i === 0 ? w.slice(1) : w)).join(' '));

  const digits = withoutQty.join(' ').match(/\d+(?:\.\d+)?/g) ?? [];
  if (digits.length === 1) return Number(digits[0]);
  return null;
}

const SPLIT = /\s*(?:،|,|\.|\bو?(?:بعدين|كمان|وأيضا|وأيضاً|ثم)\b)\s*/u;

/**
 * Offline extraction from a transcript. This is the fallback when the AI provider is off *and* the net
 * that keeps a model's output honest: prices come from the words, never from the model's imagination.
 */
export function extractItems(transcript: string): ExtractedItem[] {
  const text = normalizeArabicDigits(transcript ?? '').trim();
  if (!text) return [];
  const out: ExtractedItem[] = [];

  for (const rawPart of text.split(SPLIT)) {
    const part = rawPart.trim();
    if (part.length < 3) continue;
    const startsWithAction = ACTION_FIRST.some((a) => part.startsWith(a));
    const rule = startsWithAction ? RULES.find((r) => r.type === 'labor')! : RULES.find((r) => r.keywords.some((k) => part.includes(k)));
    if (!rule) continue;

    const price = priceFrom(part);
    const qtyMatch = /(?:عدد|كمية)\s*(\d+)/u.exec(part);
    const quantity = qtyMatch ? qtyMatch[1]! : '1';

    out.push({
      type: rule.type,
      // The description drops the price words: «تغيير زيت وفلتر بمئتين وستين» reads «تغيير زيت وفلتر».
      descriptionAr: rule.labelAr(stripPrice(part)) || part,
      quantity,
      unitPrice: price != null && price > 0 ? price.toFixed(2) : null,
      confidence: price != null ? 0.75 : 0.5,
      heardAr: part,
    });
  }
  return out;
}

function stripPrice(sentence: string): string {
  const words = normalizeArabicDigits(sentence).split(/\s+/).filter(Boolean);
  const cut = words.findIndex((w) => PRICE_WORDS.includes(w) || (w.length > 1 && w.startsWith('ب') && NUMBER_START.test(w.slice(1))) || /^\d/.test(w));
  const kept = cut > 0 ? words.slice(0, cut) : words;
  return kept.filter((w) => w !== 'عدد' && w !== 'كمية').join(' ').trim();
}

/** Nothing is applied to a work order unless a person reviewed it and it carries a price. */
export function isApplicable(item: ExtractedItem): boolean {
  return item.descriptionAr.trim().length >= 2 && item.unitPrice != null && Number(item.unitPrice) > 0;
}
