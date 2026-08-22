import { Module, forwardRef } from '@nestjs/common';
import { AppConfig } from '../../config';
import { IdentityModule } from '../identity/identity.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { InvoicingModule } from '../invoicing/invoicing.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { WorkOrdersModule } from '../work-orders/work-orders.module';
import { TransportBillingHandlers } from './application/handlers/transport-billing.handlers';
import { TransportUseCases } from './application/transport.use-cases';
import { MAPS_PORT } from './application/ports/maps.port';
import { TRANSPORT_REPOSITORY } from './domain/repositories';
import { MapsMockAdapter } from './infrastructure/maps/maps.mock.adapter';
import { TransportPrismaRepository } from './infrastructure/prisma/transport.prisma-repository';
import { AdminTransportController, TransportController } from './interface/http/transport.controller';
/** Step 19: tow/delivery jobs — quote, dispatch, tracking, proof of delivery. */
@Module({
  imports: [IdentityModule, VehiclesModule, IntegrationsModule, forwardRef(() => InvoicingModule), forwardRef(() => WorkOrdersModule)],
  controllers: [TransportController, AdminTransportController],
  providers: [
    { provide: TRANSPORT_REPOSITORY, useClass: TransportPrismaRepository },
    MapsMockAdapter,
    { provide: MAPS_PORT, inject: [AppConfig, MapsMockAdapter], useFactory: (c: AppConfig, mock: MapsMockAdapter) => { if (c.get('INTEGRATION_MAPS') !== 'mock') throw new Error('Maps live adapter not implemented — set INTEGRATION_MAPS=mock'); return mock; } },
    TransportUseCases, TransportBillingHandlers,
  ],
  exports: [TRANSPORT_REPOSITORY, TransportUseCases],
})
export class LogisticsModule {}
