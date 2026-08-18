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
/** Saudi plate: 3 Arabic letters + 1–4 digits (also accepts Latin form). Normalizes spacing/digits. */
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
export function normalizePlate(input: string): { ar: string; en: string } | null {
  let s = input.trim().replace(/ـ/g, '').replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d))).replace(/[-–]/g, ' ').replace(/\s+/g, ' ');
  const ar = /^([ء-ي])\s?([ء-ي])\s?([ء-ي])\s?(\d{1,4})$/.exec(s);
  if (ar) return { ar: `${ar[1]} ${ar[2]} ${ar[3]} ${ar[4]}`, en: `${map(ar[1]!)}${map(ar[2]!)}${map(ar[3]!)} ${ar[4]}` };
  const en = /^([A-Za-z])\s?([A-Za-z])\s?([A-Za-z])\s?(\d{1,4})$/.exec(s);
  if (en) { s = s.toUpperCase(); return { ar: `${rmap(en[1]!)} ${rmap(en[2]!)} ${rmap(en[3]!)} ${en[4]}`, en: `${en[1]!.toUpperCase()}${en[2]!.toUpperCase()}${en[3]!.toUpperCase()} ${en[4]}` }; }
  return null;
}
// Official Saudi plate letter mapping (Arabic ↔ Latin)
const PLATE_MAP: Record<string, string> = { 'ا': 'A', 'أ': 'A', 'ب': 'B', 'ح': 'J', 'ج': 'J' /* lenient */, 'د': 'D', 'ر': 'R', 'س': 'S', 'ص': 'X', 'ط': 'T', 'ع': 'E', 'ق': 'G', 'ك': 'K', 'ل': 'L', 'م': 'Z', 'ن': 'N', 'هـ': 'H', 'ه': 'H', 'و': 'U', 'ى': 'V', 'ي': 'V' };
const map = (c: string) => PLATE_MAP[c] ?? '?';
const rmap = (c: string) => Object.entries(PLATE_MAP).find(([, v]) => v === c.toUpperCase())?.[0] ?? '?';
