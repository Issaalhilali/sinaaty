import { Module, forwardRef } from '@nestjs/common';
import { AppConfig } from '../../config';
import { IntegrationsModule } from '../integrations/integrations.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { SearchSyncService } from './application/search-sync.service';
import { SEARCH_PORT } from './application/ports/search.port';
import { MeilisearchAdapter } from './infrastructure/meilisearch.adapter';
import { SearchMockAdapter } from './infrastructure/search.mock.adapter';

/** Step 30 — discovery search: Meilisearch live, an Arabic-normalising in-memory index in dev/test. */
@Module({
  imports: [IntegrationsModule, forwardRef(() => OrganizationsModule)],
  providers: [
    SearchMockAdapter, MeilisearchAdapter,
    { provide: SEARCH_PORT, inject: [AppConfig, SearchMockAdapter, MeilisearchAdapter], useFactory: (c: AppConfig, mock: SearchMockAdapter, live: MeilisearchAdapter) => (c.get('INTEGRATION_SEARCH') === 'live' ? live : mock) },
    SearchSyncService,
  ],
  exports: [SEARCH_PORT, SearchSyncService],
})
export class SearchModule {}
