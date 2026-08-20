import { Injectable } from '@nestjs/common';
import type { OrgSearchDoc, OrgSearchHit, SearchPort } from '../application/ports/search.port';
import { normalizeArabic } from './arabic';

/**
 * In-memory search for dev/test: normalised substring and token-prefix matching. Deliberately implements
 * the same *behavioural contract* the e2e suite pins (typo classes above), so swapping to Meilisearch
 * changes ranking quality, never whether a misspelt workshop is findable.
 */
@Injectable()
export class SearchMockAdapter implements SearchPort {
  readonly provider = 'mock';
  private readonly docs = new Map<string, OrgSearchDoc>();

  indexOrgs(docs: OrgSearchDoc[]): Promise<void> { for (const d of docs) this.docs.set(d.id, d); return Promise.resolve(); }
  removeOrg(id: string): Promise<void> { this.docs.delete(id); return Promise.resolve(); }

  searchOrgs(q: { text: string; type?: string; city?: string; limit: number }): Promise<OrgSearchHit[]> {
    const needle = normalizeArabic(q.text);
    const tokens = needle.split(' ').filter(Boolean);
    const hits: OrgSearchHit[] = [];
    for (const d of this.docs.values()) {
      if (q.type && d.type !== q.type) continue;
      if (q.city && d.city !== q.city) continue;
      const hay = normalizeArabic(`${d.nameAr} ${d.legalNameAr}`);
      const hayTokens = hay.split(' ');
      // Every query token must match some name token (exact, prefix, or 1-char-off for short typos).
      const ok = tokens.every((t) => hayTokens.some((h) => h === t || h.startsWith(t) || (t.length >= 3 && oneEditApart(t, h))));
      if (!ok) continue;
      hits.push({ id: d.id, score: hay.includes(needle) ? 2 + d.ratingAvg : 1 + d.ratingAvg });
    }
    return Promise.resolve(hits.sort((a, b) => b.score - a.score).slice(0, q.limit));
  }
}

/** True when a and b differ by a single substitution, insertion or deletion. */
function oneEditApart(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0; let j = 0; let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length === b.length) { i++; j++; } else if (a.length < b.length) j++; else i++;
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}
