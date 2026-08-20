/**
 * Arabic normalisation for matching: the ways people actually type — ة/ه at word end, أ/إ/آ/ا, ى/ي,
 * tashkeel and tatweel dropped. Used by the mock index, and worth keeping even with Meilisearch live as
 * the shared definition of "same word".
 */
export function normalizeArabic(input: string): string {
  return input
    .replace(/[ً-ْٰـ]/g, '')   // tashkeel + tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة(?=\s|$)/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
