import { forwardRef, Module } from '@nestjs/common';
import { FleetModule } from '../fleet/fleet.module';
import { IdentityModule } from '../identity/identity.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { WORK_ORDER_REPOSITORY } from './domain/repositories';
import { PDF_RENDERER_PORT } from './application/ports/pdf-renderer.port';
import { REALTIME_PUBLISHER } from './application/ports/realtime.port';
import { WoTransitionService } from './application/wo-transition.service';
import { AdminAbandonedController } from './interface/http/work-orders.controller';
import { AbandonedUseCases } from './application/abandoned.use-cases';
import { WorkOrdersUseCases } from './application/use-cases/work-orders.use-cases';
import { WorkOrderPrismaRepository } from './infrastructure/prisma/work-order.prisma-repository';
import { HtmlWorkOrderRenderer } from './infrastructure/pdf/html-renderer.adapter';
import { WorkOrdersController } from './interface/http/work-orders.controller';
import { ApprovalPageController } from './interface/http/approval-page.controller';
import { ApprovalLinkService } from './application/approval-link.service';
import { RealtimeGateway } from './interface/ws/realtime.gateway';

@Module({
  imports: [forwardRef(() => FleetModule), IdentityModule, OrganizationsModule, VehiclesModule],
  controllers: [AdminAbandonedController, WorkOrdersController, ApprovalPageController],
  providers: [
    AbandonedUseCases,
    WorkOrdersUseCases, WoTransitionService, RealtimeGateway, ApprovalLinkService,
    { provide: WORK_ORDER_REPOSITORY, useClass: WorkOrderPrismaRepository },
    { provide: PDF_RENDERER_PORT, useClass: HtmlWorkOrderRenderer },
    { provide: REALTIME_PUBLISHER, useExisting: RealtimeGateway },
  ],
  exports: [WorkOrdersUseCases, AbandonedUseCases, WORK_ORDER_REPOSITORY, WoTransitionService, REALTIME_PUBLISHER, ApprovalLinkService],
})
export class WorkOrdersModule {}
