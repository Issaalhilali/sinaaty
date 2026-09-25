/** A workshop/supplier as the search index sees it — no PII, only what a customer may discover. */
export interface OrgSearchDoc {
  id: string;
  type: string;
  nameAr: string;
  legalNameAr: string;
  city: string | null;
  zone: string | null;
  ratingAvg: number;
  ratingCount: number;
}

export interface OrgSearchHit { id: string; score: number }

/**
 * Discovery search. PostGIS answers "near me"; this port answers "typed Arabic, possibly misspelled" —
 * «ورشه النور» must find «ورشة النور». The adapter is Meilisearch in live mode and a normalising
 * in-memory index in dev/test, and the discovery endpoint degrades to SQL if search is down: finding a
 * workshop a bit worse beats finding nothing.
 */
export interface SearchPort {
  readonly provider: string;
  indexOrgs(docs: OrgSearchDoc[]): Promise<void>;
  removeOrg(id: string): Promise<void>;
  searchOrgs(q: { text: string; type?: string; city?: string; limit: number }): Promise<OrgSearchHit[]>;
}
export const SEARCH_PORT = Symbol('SEARCH_PORT');
