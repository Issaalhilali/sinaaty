import { Module, forwardRef } from '@nestjs/common';
import { AppConfig } from '../../config';
import { IdentityModule } from '../identity/identity.module';
import { InvoicingModule } from '../invoicing/invoicing.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { WorkOrdersModule } from '../work-orders/work-orders.module';
import { AccidentsUseCases } from './application/accidents.use-cases';
import { ACCIDENT_REPORTS_PORT } from './application/ports/accident-reports.port';
import { ACCIDENT_REPORT_REPOSITORY } from './domain/repositories';
import { MonjezMockAdapter } from './infrastructure/monjez/monjez.mock.adapter';
import { AccidentsPrismaRepository } from './infrastructure/prisma/accidents.prisma-repository';
import { AccidentsController, WorkOrderAccidentController } from './interface/http/accidents.controller';

/**
 * Step 21 — accident reports (منجز/تقدير) linked to work orders.
 * The live adapter is deliberately absent: the provider contract is unconfirmed (PRD risk R3), so the
 * module refuses to start in live mode rather than pretending to call an API we have not seen.
 */
@Module({
  imports: [IdentityModule, VehiclesModule, OrganizationsModule, InvoicingModule, forwardRef(() => WorkOrdersModule)],
  controllers: [AccidentsController, WorkOrderAccidentController],
  providers: [
    { provide: ACCIDENT_REPORT_REPOSITORY, useClass: AccidentsPrismaRepository },
    MonjezMockAdapter,
    {
      provide: ACCIDENT_REPORTS_PORT,
      inject: [AppConfig, MonjezMockAdapter],
      useFactory: (c: AppConfig, mock: MonjezMockAdapter) => {
        if (c.get('INTEGRATION_ACCIDENTS') !== 'mock') throw new Error('Accident-reports live adapter not implemented — set INTEGRATION_ACCIDENTS=mock (docs/integrations/monjez.md)');
        return mock;
      },
    },
    AccidentsUseCases,
  ],
  exports: [ACCIDENT_REPORT_REPOSITORY],
})
export class AccidentsModule {}
