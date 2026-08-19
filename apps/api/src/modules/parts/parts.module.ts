import { Module, forwardRef } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { InvoicingModule } from '../invoicing/invoicing.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { PaymentsModule } from '../payments/payments.module';
import { PromissoryNotesModule } from '../promissory-notes/promissory-notes.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { WorkOrdersModule } from '../work-orders/work-orders.module';
import { CatalogUseCases } from './application/catalog.use-cases';
import { PartsHandlers } from './application/handlers/parts.handlers';
import { PartsJobs } from './application/jobs.service';
import { MarketplaceUseCases } from './application/marketplace.use-cases';
import { OrdersUseCases } from './application/orders.use-cases';
import { SerialsUseCases } from './application/serials.use-cases';
import { TradeAccountsUseCases } from './application/trade-accounts.use-cases';
import { WarrantiesUseCases } from './application/warranties.use-cases';
import { PARTS_REPOSITORY } from './domain/repositories';
import { PartsPrismaRepository } from './infrastructure/prisma/parts.prisma-repository';
import { PartsController } from './interface/http/parts.controller';

/** Parts marketplace + distributors hub (Steps 18/18b): catalog & fitments, live inventory, VIN fit search, reverse auction, Buy Now, trade accounts (Nafez-secured), QR serials, warranties, group buys. */
@Module({
  imports: [IdentityModule, OrganizationsModule, VehiclesModule, IntegrationsModule, forwardRef(() => InvoicingModule), forwardRef(() => PaymentsModule), forwardRef(() => PromissoryNotesModule), forwardRef(() => WorkOrdersModule)],
  controllers: [PartsController],
  providers: [{ provide: PARTS_REPOSITORY, useClass: PartsPrismaRepository }, CatalogUseCases, MarketplaceUseCases, OrdersUseCases, SerialsUseCases, TradeAccountsUseCases, WarrantiesUseCases, PartsHandlers, PartsJobs],
  exports: [PARTS_REPOSITORY, OrdersUseCases],
})
export class PartsModule {}
