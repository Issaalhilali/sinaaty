import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../../config';
import type { OrgSearchDoc, OrgSearchHit, SearchPort } from '../application/ports/search.port';

const INDEX = 'organizations';

/**
 * Meilisearch over plain HTTP — the API is four endpoints and a JSON body; an SDK earns nothing here.
 * Index settings are pushed on first use (idempotent): Arabic-friendly typo tolerance is Meili's default,
 * we add the filterables and rank by text relevance then rating.
 */
@Injectable()
export class MeilisearchAdapter implements SearchPort {
  readonly provider = 'meilisearch';
  private readonly log = new Logger(MeilisearchAdapter.name);
  private configured = false;
  constructor(private readonly config: AppConfig) {}

  private get host() { return this.config.get('MEILI_HOST'); }
  private headers() {
    const key = this.config.get('MEILI_KEY');
    return { 'content-type': 'application/json', ...(key ? { authorization: `Bearer ${key}` } : {}) };
  }
  private async call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.host}${path}`, { method, headers: this.headers(), body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`meilisearch ${method} ${path} → ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return (await res.json()) as T;
  }

  private async ensureSettings() {
    if (this.configured) return;
    await this.call('PATCH', `/indexes/${INDEX}/settings`, {
      searchableAttributes: ['nameAr', 'legalNameAr', 'city'],
      filterableAttributes: ['type', 'city', 'zone'],
      rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness', 'ratingAvg:desc'],
    }).catch(async (e: unknown) => {
      // A fresh instance has no index yet: create it, then settings apply on retry.
      if (String(e).includes('404')) { await this.call('POST', '/indexes', { uid: INDEX, primaryKey: 'id' }); await this.ensureSettingsRetry(); return; }
      throw e;
    });
    this.configured = true;
  }
  private async ensureSettingsRetry() {
    await this.call('PATCH', `/indexes/${INDEX}/settings`, { searchableAttributes: ['nameAr', 'legalNameAr', 'city'], filterableAttributes: ['type', 'city', 'zone'], rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness', 'ratingAvg:desc'] });
  }

  async indexOrgs(docs: OrgSearchDoc[]): Promise<void> {
    if (!docs.length) return;
    await this.ensureSettings();
    await this.call('PUT', `/indexes/${INDEX}/documents`, docs);
  }
  async removeOrg(id: string): Promise<void> {
    await this.call('DELETE', `/indexes/${INDEX}/documents/${id}`).catch((e: unknown) => this.log.warn(String(e)));
  }
  async searchOrgs(q: { text: string; type?: string; city?: string; limit: number }): Promise<OrgSearchHit[]> {
    const filter = [q.type ? `type = "${q.type}"` : null, q.city ? `city = "${q.city}"` : null].filter(Boolean);
    const r = await this.call<{ hits: Array<{ id: string; _rankingScore?: number }> }>('POST', `/indexes/${INDEX}/search`, {
      q: q.text, limit: q.limit, showRankingScore: true, ...(filter.length ? { filter } : {}),
    });
    return r.hits.map((h) => ({ id: h.id, score: h._rankingScore ?? 0 }));
  }
}
