import { Module, forwardRef } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { WorkOrdersModule } from '../work-orders/work-orders.module';
import { FleetUseCases } from './application/fleet.use-cases';
import { FLEET_REPOSITORY } from './domain/repositories';
import { FleetPrismaRepository } from './infrastructure/prisma/fleet.prisma-repository';
import { FleetController } from './interface/http/fleet.controller';

/** Step 26 — Fleet Hub: spending policy, approvals, bulk vehicle import, monthly statements, reports. */
@Module({
  imports: [IdentityModule, OrganizationsModule, VehiclesModule, forwardRef(() => WorkOrdersModule)],
  controllers: [FleetController],
  providers: [{ provide: FLEET_REPOSITORY, useClass: FleetPrismaRepository }, FleetUseCases],
  exports: [FleetUseCases],
})
export class FleetModule {}
