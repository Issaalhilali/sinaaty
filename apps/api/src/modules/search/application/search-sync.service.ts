import { Inject, Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { OutboxHandlerRegistry } from '../../integrations/outbox/outbox-handler.registry';
import { ORGANIZATION_REPOSITORY, type OrganizationRepository } from '../../organizations/domain/repositories';
import { SEARCH_PORT, type OrgSearchDoc, type SearchPort } from './ports/search.port';

/**
 * Keeps the discovery index honest: every active organization is (re)indexed at boot — the index is a
 * cache, the database is the truth, and a rebuild must always be one restart away — and org status
 * changes flow through the outbox so a suspended workshop disappears from search in the same breath it
 * is suspended.
 */
@Injectable()
export class SearchSyncService implements OnModuleInit {
  private readonly log = new Logger(SearchSyncService.name);
  constructor(
    @Inject(SEARCH_PORT) private readonly search: SearchPort,
    @Inject(ORGANIZATION_REPOSITORY) private readonly orgs: OrganizationRepository,
    @Optional() private readonly registry?: OutboxHandlerRegistry,
  ) {}

  async onModuleInit() {
    await this.reindexAll().catch((e: unknown) => this.log.warn(`boot reindex skipped: ${String(e)}`));
    this.registry?.on('OrganizationStatusChanged', 'search.org-status', async (ev) => {
      const to = typeof ev.payload['to'] === 'string' ? ev.payload['to'] : '';
      if (to === 'active') await this.indexOne(ev.aggregateId);
      else await this.search.removeOrg(ev.aggregateId);
    });
  }

  async reindexAll(): Promise<number> {
    const rows = await this.orgs.listForAdmin({ status: 'active', limit: 5000 });
    const docs = await Promise.all(rows.map((o) => this.toDoc(o.id)));
    const ready = docs.filter((d): d is OrgSearchDoc => d !== null);
    await this.search.indexOrgs(ready);
    this.log.log(`search index: ${ready.length} organizations (${this.search.provider})`);
    return ready.length;
  }

  async indexOne(orgId: string) {
    const doc = await this.toDoc(orgId);
    if (doc) await this.search.indexOrgs([doc]);
  }

  private async toDoc(orgId: string): Promise<OrgSearchDoc | null> {
    const o = await this.orgs.findById(orgId);
    if (!o || o.status !== 'active') return null;
    const loc = (await this.orgs.listLocations(orgId)).find((l) => l.isPrimary) ?? (await this.orgs.listLocations(orgId))[0];
    return {
      id: o.id, type: o.type, nameAr: o.tradeNameAr ?? o.legalNameAr, legalNameAr: o.legalNameAr,
      city: loc?.city ?? null, zone: loc?.industrialZone ?? null,
      ratingAvg: Number(o.ratingAvg), ratingCount: o.ratingCount,
    };
  }
}
