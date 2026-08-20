import { Module, forwardRef } from '@nestjs/common';
import { AppConfig } from '../../config';
import { IdentityModule } from '../identity/identity.module';
import { PilotModule } from '../pilot/pilot.module';
import { WorkOrdersModule } from '../work-orders/work-orders.module';
import { VisionUseCases } from './application/vision.use-cases';
import { VISION_PORT } from './application/ports/vision.port';
import { INSPECTION_REPOSITORY } from './domain/repositories';
import { InspectionPrismaRepository } from './infrastructure/prisma/inspection.prisma-repository';
import { VisionMockAdapter } from './infrastructure/vision/vision.mock.adapter';
import { VisionController } from './interface/http/vision.controller';

/**
 * Step 28 — AI inspection. The vision provider is mocked (no live adapter: reading a customer's car photos
 * with a third party needs a data-residency decision first — docs/integrations/vision.md).
 */
@Module({
  imports: [IdentityModule, PilotModule, forwardRef(() => WorkOrdersModule)],
  controllers: [VisionController],
  providers: [
    { provide: INSPECTION_REPOSITORY, useClass: InspectionPrismaRepository },
    VisionMockAdapter,
    {
      provide: VISION_PORT,
      inject: [AppConfig, VisionMockAdapter],
      useFactory: (c: AppConfig, mock: VisionMockAdapter) => {
        if (c.get('INTEGRATION_AI') === 'live') throw new Error('Vision live adapter not implemented — customer car photos need a residency decision first (docs/integrations/vision.md)');
        return mock;
      },
    },
    VisionUseCases,
  ],
})
export class VisionModule {}
